"""Session management and logging for Unified Practice App."""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional
import uuid

import frontmatter

from config import AppConfig, ExamConfig
from models import (
    SessionConfig,
    SessionState,
    SessionSummary,
    AnswerSubmission,
    QuestionResult,
)
from questions import QuestionBank


class SessionManager:
    """Manages practice sessions for a single exam type."""

    def __init__(self, config: AppConfig, exam_type: str, question_bank: QuestionBank):
        self.config = config
        self.exam_type = exam_type
        self.exam_config: ExamConfig = config.get_exam(exam_type)
        self.question_bank = question_bank
        self.active_sessions: dict[str, SessionState] = {}
        self._load_paused_sessions()

    def _sessions_path(self) -> Path:
        return self.config.get_sessions_path(self.exam_type)

    def create_session(self, session_config: SessionConfig) -> SessionState:
        session_id = datetime.now().strftime("%Y-%m-%d-%H%M%S-") + uuid.uuid4().hex[:6]

        st = session_config.session_type
        if st == "mock_exam":
            questions = self.question_bank.select_weighted_by_exam(session_config.question_count)
        elif st in ("category_drill", "topic_drill", "domain_drill"):
            questions = self.question_bank.select_questions(
                count=session_config.question_count,
                categories=session_config.categories,
                difficulty=session_config.difficulty,
            )
        elif st == "subtopic_drill":
            if session_config.categories and session_config.subcategory:
                all_qs = self.question_bank.get_questions_for_subcategory(
                    session_config.categories[0], session_config.subcategory
                )
                questions = all_qs[:session_config.question_count]
            else:
                questions = []
        elif st == "weak_areas":
            questions = self.question_bank.select_weak_areas(session_config.question_count)
        else:
            questions = self.question_bank.select_questions(
                count=session_config.question_count,
                categories=session_config.categories if session_config.categories else None,
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
        return self.active_sessions.get(session_id)

    def submit_answer(self, session_id: str, answer: AnswerSubmission) -> Optional[QuestionResult]:
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
        session = self.active_sessions.get(session_id)
        if not session:
            return None

        total_correct = 0
        total_time = 0
        results_by_category: dict[str, dict] = {}
        error_types: dict[str, int] = {}

        for question_id in session.questions:
            question = self.question_bank.get_question(question_id)
            answer = session.answers.get(question_id)
            if not question or not answer:
                continue

            is_correct = answer.selected_answer == question.answer
            if is_correct:
                total_correct += 1
            total_time += answer.time_seconds

            if question.category not in results_by_category:
                results_by_category[question.category] = {"correct": 0, "total": 0}
            results_by_category[question.category]["total"] += 1
            if is_correct:
                results_by_category[question.category]["correct"] += 1

            if not is_correct:
                if answer.time_seconds < 30:
                    error_types["time_pressure"] = error_types.get("time_pressure", 0) + 1
                elif answer.confidence == "sure":
                    error_types["overconfidence"] = error_types.get("overconfidence", 0) + 1
                else:
                    error_types[question.type] = error_types.get(question.type, 0) + 1

        for cat in results_by_category:
            c = results_by_category[cat]
            c["percent"] = round(c["correct"] / c["total"] * 100, 1) if c["total"] > 0 else 0

        questions_attempted = len(session.answers)
        score_percent = round(total_correct / questions_attempted * 100, 1) if questions_attempted > 0 else 0

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
            categories=list(results_by_category.keys()),
            results_by_category=results_by_category,
            error_summary=error_types,
        )

        self._save_session_log(session, summary)
        del self.active_sessions[session_id]
        return summary

    def _save_session_log(self, session: SessionState, summary: SessionSummary):
        sessions_path = self._sessions_path()
        sessions_path.mkdir(parents=True, exist_ok=True)

        filename = f"{summary.date}-{summary.time.replace(':', '')}.md"
        filepath = sessions_path / filename

        cat_label = self.exam_config.category_label.lower() + "s"
        lines = [
            "---",
            f"date: {summary.date}",
            f'time: "{summary.time}"',
            f"type: {summary.session_type}",
            f"exam: {self.exam_type}",
            f"mode: {'timed' if session.config.timed else 'untimed'}",
            f"duration_minutes: {summary.time_taken_minutes}",
            f"questions_count: {summary.question_count}",
            f"{cat_label}:",
        ]
        for cat in summary.categories:
            lines.append(f"  - {cat}")
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
            f"| {self.exam_config.category_label}s | {', '.join(summary.categories)} |",
            "",
            f"## Results by {self.exam_config.category_label}",
            "",
            f"| {self.exam_config.category_label} | Correct | Total | Percent |",
            "|--------|---------|-------|---------|",
        ])

        for cat, data in summary.results_by_category.items():
            lines.append(f"| {cat} | {data['correct']} | {data['total']} | {data['percent']}% |")

        lines.extend(["", "## Questions", ""])

        for question_id in session.questions:
            question = self.question_bank.get_question(question_id)
            answer = session.answers.get(question_id)
            if question and answer:
                is_correct = answer.selected_answer == question.answer
                emoji = "\u2705" if is_correct else "\u274c"
                lines.extend([
                    f"### {emoji} {question_id}",
                    f"- **Selected:** {answer.selected_answer}",
                    f"- **Correct:** {question.answer}",
                    f"- **Time:** {answer.time_seconds}s",
                    f"- **Confidence:** {answer.confidence}",
                    "",
                ])

        lines.extend(["## Error Summary", "", "| Error Type | Count |", "|------------|-------|"])
        for error_type, count in summary.error_summary.items():
            if count > 0:
                lines.append(f"| {error_type.replace('_', ' ').title()} | {count} |")

        wrong_answers = []
        for question_id in session.questions:
            question = self.question_bank.get_question(question_id)
            answer = session.answers.get(question_id)
            if question and answer and answer.selected_answer != question.answer:
                wrong_answers.append({
                    "id": question_id,
                    "category": question.category,
                    "subcategory": question.subcategory,
                    "question": question.question,
                    "options": question.options,
                    "selected": answer.selected_answer,
                    "correct": question.answer,
                    "confidence": answer.confidence,
                    "time_seconds": answer.time_seconds,
                })

        if wrong_answers:
            exam_name = self.exam_config.name
            lines.extend([
                "", "---", "",
                "## Feedback Request", "",
                "Copy the block below and paste into Claude for targeted feedback:", "",
                "```yaml",
                f"# {exam_name} Practice Session Feedback Request",
                f"session_id: {summary.session_id}",
                f"date: {summary.date}",
                f"score: {summary.score}/{summary.questions_attempted} ({summary.score_percent}%)",
                "", "wrong_answers:",
            ])
            for wa in wrong_answers:
                lines.extend([
                    f"  - id: {wa['id']}",
                    f"    {self.exam_config.category_field}: {wa['category']}",
                    f"    {self.exam_config.subcategory_field}: {wa['subcategory']}",
                    f"    question: |",
                ])
                for q_line in wa["question"].split("\n"):
                    lines.append(f"      {q_line}")
                lines.append(f"    options:")
                for opt_key in sorted(wa["options"]):
                    lines.append(f"      {opt_key}: {wa['options'][opt_key]}")
                lines.extend([
                    f"    selected: {wa['selected']}",
                    f"    correct: {wa['correct']}",
                    f"    confidence: {wa['confidence']}",
                    f"    time_seconds: {wa['time_seconds']}",
                    "",
                ])
            lines.extend([
                "```", "",
                "**Prompt to use:**",
                f"> Review these {exam_name} practice questions I got wrong. For each:",
                "> 1. Explain why my answer was incorrect",
                "> 2. Explain why the correct answer is right",
                "> 3. Identify the specific concept I need to review",
                "> 4. Suggest a flashcard (front/back) to help me remember",
                "",
            ])

        content = "\n".join(lines)
        filepath.write_text(content, encoding="utf-8")
        self._update_question_stats(session)

    def _update_question_stats(self, session: SessionState):
        questions_path = self.config.get_questions_path(self.exam_type)
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
        paused_path = self._sessions_path() / "paused"
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
                    answers={k: AnswerSubmission(**v) for k, v in data["answers"].items()},
                    started_at=datetime.fromisoformat(data["started_at"]),
                )
                self.active_sessions[session.session_id] = session
            except Exception as e:
                print(f"Warning: Failed to load paused session {json_file}: {e}")

    def pause_session(self, session_id: str) -> bool:
        session = self.active_sessions.get(session_id)
        if not session:
            return False

        paused_path = self._sessions_path() / "paused"
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
        session = self.active_sessions.get(session_id)
        if session:
            paused_file = self._sessions_path() / "paused" / f"{session_id}.json"
            if paused_file.exists():
                paused_file.unlink()
        return session

    def delete_paused_session(self, session_id: str) -> bool:
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]

        paused_file = self._sessions_path() / "paused" / f"{session_id}.json"
        if paused_file.exists():
            paused_file.unlink()
            return True
        return False

    def get_paused_sessions(self) -> list[dict]:
        paused = []
        for session_id, session in self.active_sessions.items():
            if len(session.answers) < len(session.questions):
                paused.append({
                    "session_id": session_id,
                    "started_at": session.started_at.isoformat(),
                    "questions_total": len(session.questions),
                    "questions_answered": len(session.answers),
                    "categories": list(set(
                        self.question_bank.get_question(q).category
                        for q in session.questions
                        if self.question_bank.get_question(q)
                    )),
                })
        return paused
