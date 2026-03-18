"""Session management and logging for PMP Practice App."""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional
import uuid

import frontmatter

from config import AppConfig
from models import (
    SessionConfig,
    SessionState,
    SessionSummary,
    AnswerSubmission,
    QuestionResult,
    Question,
)
from questions import QuestionBank


class SessionManager:
    """Manages practice sessions."""

    def __init__(self, config: AppConfig, question_bank: QuestionBank):
        self.config = config
        self.question_bank = question_bank
        self.active_sessions: dict[str, SessionState] = {}
        self._load_paused_sessions()

    def create_session(self, session_config: SessionConfig) -> SessionState:
        """Create a new practice session."""
        session_id = datetime.now().strftime("%Y-%m-%d-%H%M%S-") + uuid.uuid4().hex[:6]

        if session_config.session_type == "mock_exam":
            questions = self.question_bank.select_weighted_by_exam(
                session_config.question_count
            )
        elif session_config.session_type == "domain_drill":
            questions = self.question_bank.select_questions(
                count=session_config.question_count,
                domains=session_config.domains,
                difficulty=session_config.difficulty,
            )
        elif session_config.session_type == "weak_areas":
            questions = self.question_bank.select_weak_areas(
                session_config.question_count
            )
        else:
            questions = self.question_bank.select_questions(
                count=session_config.question_count,
                domains=session_config.domains if session_config.domains else None,
                difficulty=session_config.difficulty,
            )

        question_ids = [q.id for q in questions]

        session = SessionState(
            session_id=session_id,
            config=session_config,
            questions=question_ids,
        )

        self.active_sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[SessionState]:
        """Get an active session."""
        return self.active_sessions.get(session_id)

    def submit_answer(
        self,
        session_id: str,
        answer: AnswerSubmission
    ) -> Optional[QuestionResult]:
        """Submit an answer for a question in a session."""
        session = self.active_sessions.get(session_id)
        if not session:
            return None

        question = self.question_bank.get_question(answer.question_id)
        if not question:
            return None

        session.answers[answer.question_id] = answer

        is_correct = answer.selected_answer == question.answer

        return QuestionResult(
            question_id=answer.question_id,
            selected_answer=answer.selected_answer,
            correct_answer=question.answer,
            is_correct=is_correct,
            time_seconds=answer.time_seconds,
            confidence=answer.confidence,
            explanation=question.explanation,
        )

    def complete_session(self, session_id: str) -> Optional[SessionSummary]:
        """Complete a session and generate summary."""
        session = self.active_sessions.get(session_id)
        if not session:
            return None

        total_correct = 0
        total_time = 0
        results_by_domain: dict[str, dict] = {}
        error_types: dict[str, int] = {
            "conceptual": 0,
            "situational": 0,
            "time_pressure": 0,
            "overconfidence": 0,
        }

        for question_id in session.questions:
            question = self.question_bank.get_question(question_id)
            if not question:
                continue

            answer = session.answers.get(question_id)
            if not answer:
                continue

            is_correct = answer.selected_answer == question.answer
            if is_correct:
                total_correct += 1

            total_time += answer.time_seconds

            if question.domain not in results_by_domain:
                results_by_domain[question.domain] = {"correct": 0, "total": 0}
            results_by_domain[question.domain]["total"] += 1
            if is_correct:
                results_by_domain[question.domain]["correct"] += 1

            if not is_correct:
                if answer.time_seconds < 30:
                    error_types["time_pressure"] += 1
                elif answer.confidence == "sure":
                    error_types["overconfidence"] += 1
                elif question.type == "situational":
                    error_types["situational"] += 1
                else:
                    error_types["conceptual"] += 1

        for domain in results_by_domain:
            d = results_by_domain[domain]
            d["percent"] = round(d["correct"] / d["total"] * 100, 1) if d["total"] > 0 else 0

        questions_attempted = len(session.answers)
        score_percent = round(total_correct / questions_attempted * 100, 1) if questions_attempted > 0 else 0

        domains = list(results_by_domain.keys())

        summary = SessionSummary(
            session_id=session_id,
            date=session.started_at.strftime("%Y-%m-%d"),
            time=session.started_at.strftime("%H:%M"),
            session_type=session.config.session_type,
            question_count=len(session.questions),
            questions_attempted=questions_attempted,
            score=total_correct,
            score_percent=score_percent,
            time_taken_minutes=round(total_time / 60, 1),
            domains=domains,
            results_by_domain=results_by_domain,
            error_summary=error_types,
        )

        self._save_session_log(session, summary)
        del self.active_sessions[session_id]

        return summary

    def _save_session_log(self, session: SessionState, summary: SessionSummary):
        """Save session log as markdown file."""
        sessions_path = self.config.get_sessions_path()
        sessions_path.mkdir(parents=True, exist_ok=True)

        filename = f"{summary.date}-{summary.time.replace(':', '')}.md"
        filepath = sessions_path / filename

        lines = [
            "---",
            f"date: {summary.date}",
            f'time: "{summary.time}"',
            f"type: {summary.session_type}",
            f"mode: {'timed' if session.config.timed else 'untimed'}",
            f"duration_minutes: {summary.time_taken_minutes}",
            f"questions_count: {summary.question_count}",
            "domains:",
        ]
        for domain in summary.domains:
            lines.append(f"  - {domain}")
        lines.extend([
            f"score: {summary.score}",
            f"score_percent: {summary.score_percent}",
            f"questions_attempted: {summary.questions_attempted}",
            f"time_taken_minutes: {summary.time_taken_minutes}",
            "---",
            "",
            f"# Session: {summary.date} {summary.time}",
            "",
            "## Summary",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            f"| Score | {summary.score}/{summary.questions_attempted} ({summary.score_percent}%) |",
            f"| Time | {summary.time_taken_minutes} minutes |",
            f"| Mode | {'Timed' if session.config.timed else 'Untimed'} |",
            f"| Domains | {', '.join(summary.domains)} |",
            "",
            "## Results by Domain",
            "",
            "| Domain | Correct | Total | Percent |",
            "|--------|---------|-------|---------|",
        ])

        for domain, data in summary.results_by_domain.items():
            lines.append(f"| {domain} | {data['correct']} | {data['total']} | {data['percent']}% |")

        lines.extend(["", "## Questions", ""])

        for question_id in session.questions:
            question = self.question_bank.get_question(question_id)
            answer = session.answers.get(question_id)

            if question and answer:
                is_correct = answer.selected_answer == question.answer
                emoji = "✅" if is_correct else "❌"
                lines.extend([
                    f"### {emoji} {question_id}",
                    f"- **Selected:** {answer.selected_answer}",
                    f"- **Correct:** {question.answer}",
                    f"- **Time:** {answer.time_seconds}s",
                    f"- **Confidence:** {answer.confidence}",
                    "",
                ])

        lines.extend([
            "## Error Summary",
            "",
            "| Error Type | Count |",
            "|------------|-------|",
        ])
        for error_type, count in summary.error_summary.items():
            if count > 0:
                lines.append(f"| {error_type.replace('_', ' ').title()} | {count} |")

        # Feedback request
        wrong_answers = []
        for question_id in session.questions:
            question = self.question_bank.get_question(question_id)
            answer = session.answers.get(question_id)
            if question and answer and answer.selected_answer != question.answer:
                wrong_answers.append({
                    "id": question_id,
                    "domain": question.domain,
                    "task": question.task,
                    "question": question.question,
                    "options": question.options,
                    "selected": answer.selected_answer,
                    "correct": question.answer,
                    "confidence": answer.confidence,
                    "time_seconds": answer.time_seconds,
                })

        if wrong_answers:
            lines.extend([
                "", "---", "",
                "## Feedback Request", "",
                "Copy the block below and paste into Claude for targeted feedback:", "",
                "```yaml",
                "# PM Practice Session Feedback Request",
                f"session_id: {summary.session_id}",
                f"date: {summary.date}",
                f"score: {summary.score}/{summary.questions_attempted} ({summary.score_percent}%)",
                "", "wrong_answers:",
            ])

            for wa in wrong_answers:
                lines.extend([
                    f"  - id: {wa['id']}",
                    f"    domain: {wa['domain']}",
                    f"    task: {wa['task']}",
                    f"    question: |",
                ])
                for q_line in wa['question'].split('\n'):
                    lines.append(f"      {q_line}")
                lines.extend([
                    f"    options:",
                    f"      A: {wa['options'].get('A', '')}",
                    f"      B: {wa['options'].get('B', '')}",
                    f"      C: {wa['options'].get('C', '')}",
                    f"      D: {wa['options'].get('D', '')}",
                    f"    selected: {wa['selected']}",
                    f"    correct: {wa['correct']}",
                    f"    confidence: {wa['confidence']}",
                    f"    time_seconds: {wa['time_seconds']}",
                    "",
                ])

            lines.extend([
                "```", "",
                "**Prompt to use:**",
                "> Review these PM practice questions I got wrong. For each:",
                "> 1. Explain why my answer was incorrect",
                "> 2. Explain why the correct answer is right",
                "> 3. Identify the specific PM concept I need to review",
                "> 4. Suggest a flashcard (front/back) to help me remember",
                "",
            ])

        content = "\n".join(lines)
        filepath.write_text(content, encoding="utf-8")

        self._update_question_stats(session)

    def _update_question_stats(self, session: SessionState):
        """Update times_shown, times_correct, last_shown in question files."""
        questions_path = self.config.get_questions_path()
        today = datetime.now().strftime("%Y-%m-%d")

        for question_id in session.questions:
            question = self.question_bank.get_question(question_id)
            answer = session.answers.get(question_id)
            if not question or not answer:
                continue

            for md_file in questions_path.rglob("*.md"):
                try:
                    post = frontmatter.load(md_file)
                    if post.metadata.get("id") == question_id:
                        post.metadata["times_shown"] = post.metadata.get("times_shown", 0) + 1
                        if answer.selected_answer == question.answer:
                            post.metadata["times_correct"] = post.metadata.get("times_correct", 0) + 1
                        post.metadata["last_shown"] = today

                        with open(md_file, "w", encoding="utf-8") as f:
                            f.write(frontmatter.dumps(post))

                        question.times_shown = post.metadata["times_shown"]
                        question.times_correct = post.metadata.get("times_correct", 0)
                        question.last_shown = today
                        break
                except Exception as e:
                    print(f"Warning: Failed to update stats for {question_id}: {e}")

    def _load_paused_sessions(self):
        """Load any paused sessions from disk."""
        paused_path = self.config.get_sessions_path() / "paused"
        if not paused_path.exists():
            return

        for json_file in paused_path.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                session = SessionState(
                    session_id=data["session_id"],
                    config=SessionConfig(**data["config"]),
                    questions=data["questions"],
                    current_index=data["current_index"],
                    answers={
                        k: AnswerSubmission(**v) for k, v in data["answers"].items()
                    },
                    started_at=datetime.fromisoformat(data["started_at"]),
                )
                self.active_sessions[session.session_id] = session
            except Exception as e:
                print(f"Warning: Failed to load paused session {json_file}: {e}")

    def pause_session(self, session_id: str) -> bool:
        """Pause a session and save to disk for later resumption."""
        session = self.active_sessions.get(session_id)
        if not session:
            return False

        paused_path = self.config.get_sessions_path() / "paused"
        paused_path.mkdir(parents=True, exist_ok=True)

        filepath = paused_path / f"{session_id}.json"
        data = {
            "session_id": session.session_id,
            "config": session.config.model_dump(),
            "questions": session.questions,
            "current_index": session.current_index,
            "answers": {k: v.model_dump() for k, v in session.answers.items()},
            "started_at": session.started_at.isoformat(),
            "paused_at": datetime.now().isoformat(),
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return True

    def resume_session(self, session_id: str) -> Optional[SessionState]:
        """Resume a paused session."""
        session = self.active_sessions.get(session_id)
        if session:
            paused_file = self.config.get_sessions_path() / "paused" / f"{session_id}.json"
            if paused_file.exists():
                paused_file.unlink()
        return session

    def delete_paused_session(self, session_id: str) -> bool:
        """Delete a paused session."""
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]

        paused_file = self.config.get_sessions_path() / "paused" / f"{session_id}.json"
        if paused_file.exists():
            paused_file.unlink()
            return True
        return False

    def get_paused_sessions(self) -> list[dict]:
        """Get list of paused sessions."""
        paused = []
        for session_id, session in self.active_sessions.items():
            if len(session.answers) < len(session.questions):
                paused.append({
                    "session_id": session_id,
                    "started_at": session.started_at.isoformat(),
                    "questions_total": len(session.questions),
                    "questions_answered": len(session.answers),
                    "domains": list(set(
                        self.question_bank.get_question(q).domain
                        for q in session.questions
                        if self.question_bank.get_question(q)
                    )),
                })
        return paused
