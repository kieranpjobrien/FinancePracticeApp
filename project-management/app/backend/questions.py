"""Question loading and management for PMP Practice App."""

import random
from datetime import datetime
from pathlib import Path
from typing import Optional
import frontmatter

from config import AppConfig
from models import Question


class QuestionBank:
    """Manages loading and selecting PMP questions from the vault."""

    def __init__(self, config: AppConfig):
        self.config = config
        self.questions: dict[str, Question] = {}
        self._load_all_questions()

    def _load_all_questions(self):
        """Load all questions from the Questions directory."""
        questions_path = self.config.get_questions_path()
        if not questions_path.exists():
            return

        for md_file in questions_path.rglob("*.md"):
            try:
                question = self._load_question_file(md_file)
                if question:
                    self.questions[question.id] = question
            except Exception as e:
                print(f"Warning: Failed to load {md_file}: {e}")

    def _load_question_file(self, path: Path) -> Optional[Question]:
        """Load a single question from a markdown file."""
        post = frontmatter.load(path)
        metadata = post.metadata

        if not metadata.get("id"):
            return None

        # Parse content to extract question, options, answer, explanation
        content = post.content
        question_text = ""
        options = {}
        answer = ""
        explanation = ""

        # Split by sections
        sections = content.split("## ")
        for section in sections:
            if section.startswith("Question") or section.strip().startswith("#"):
                lines = section.split("\n", 1)
                if len(lines) > 1:
                    question_text = lines[1].strip()
                else:
                    question_text = section.replace("# Question", "").strip()
            elif section.startswith("Options"):
                for line in section.split("\n"):
                    line = line.strip()
                    if line.startswith("- **A**:"):
                        options["A"] = line.replace("- **A**:", "").strip()
                    elif line.startswith("- **B**:"):
                        options["B"] = line.replace("- **B**:", "").strip()
                    elif line.startswith("- **C**:"):
                        options["C"] = line.replace("- **C**:", "").strip()
                    elif line.startswith("- **D**:"):
                        options["D"] = line.replace("- **D**:", "").strip()
            elif section.startswith("Answer"):
                answer = section.replace("Answer", "").strip().split("\n")[0].strip()
            elif section.startswith("Explanation"):
                explanation = section.replace("Explanation", "").strip()

        # Also check for # Question format
        if not question_text and "# Question" in content:
            parts = content.split("# Question")
            if len(parts) > 1:
                rest = parts[1]
                q_end = rest.find("## ")
                if q_end > 0:
                    question_text = rest[:q_end].strip()

        # Convert date objects to strings
        created = metadata.get("created")
        if created and not isinstance(created, str):
            created = str(created)

        last_shown = metadata.get("last_shown")
        if last_shown and not isinstance(last_shown, str):
            last_shown = str(last_shown)

        return Question(
            id=metadata.get("id"),
            domain=metadata.get("domain", ""),
            task=metadata.get("task", ""),
            difficulty=metadata.get("difficulty", "Medium"),
            type=metadata.get("type", "situational"),
            question=question_text,
            options=options,
            answer=answer,
            explanation=explanation,
            tags=metadata.get("tags", []),
            created=created,
            source=metadata.get("source", "claude-generated"),
            times_shown=metadata.get("times_shown", 0),
            times_correct=metadata.get("times_correct", 0),
            last_shown=last_shown,
        )

    def reload(self):
        """Reload all questions from disk."""
        self.questions.clear()
        self._load_all_questions()

    def get_question(self, question_id: str) -> Optional[Question]:
        """Get a question by ID."""
        return self.questions.get(question_id)

    def get_questions_for_domain(self, domain: str) -> list[Question]:
        """Get all questions for a domain."""
        return [q for q in self.questions.values() if q.domain == domain]

    def get_questions_for_task(self, domain: str, task: str) -> list[Question]:
        """Get all questions for a specific task within a domain."""
        return [
            q for q in self.questions.values()
            if q.domain == domain and q.task == task
        ]

    def select_questions(
        self,
        count: int,
        domains: Optional[list[str]] = None,
        difficulty: str = "mixed",
        prioritize_unseen: bool = True,
    ) -> list[Question]:
        """Select questions for a session with spaced repetition weighting."""
        pool = list(self.questions.values())

        # Filter by domains
        if domains:
            pool = [q for q in pool if q.domain in domains]

        # Filter by difficulty
        if difficulty != "mixed":
            pool = [q for q in pool if q.difficulty.lower() == difficulty.lower()]

        if not pool:
            return []

        # Spaced repetition scoring
        today = datetime.now().date()

        def srs_score(q: Question) -> tuple:
            """Lower score = higher priority for selection."""
            if q.times_shown == 0:
                return (0, 0, random.random())

            days_since = 0
            if q.last_shown:
                try:
                    last = datetime.strptime(q.last_shown, "%Y-%m-%d").date()
                    days_since = (today - last).days
                except ValueError:
                    days_since = 999

            if q.accuracy >= 0.8:
                optimal_interval = 7
            elif q.accuracy >= 0.6:
                optimal_interval = 3
            else:
                optimal_interval = 1

            overdue = optimal_interval - days_since

            return (
                1,
                overdue,
                -q.accuracy if q.times_shown > 0 else 0,
                random.random()
            )

        pool = sorted(pool, key=srs_score)
        return pool[:count]

    def select_weighted_by_exam(self, count: int) -> list[Question]:
        """Select questions weighted by exam domain distribution."""
        exam_weights = {
            "People": 0.42,
            "Process": 0.50,
            "Business Environment": 0.08,
        }

        questions = []
        for domain, weight in exam_weights.items():
            domain_count = round(count * weight)
            domain_questions = self.select_questions(
                domain_count,
                domains=[domain],
                difficulty="mixed"
            )
            questions.extend(domain_questions)

        # Adjust if rounding caused over/under selection
        while len(questions) > count:
            questions.pop(random.randint(0, len(questions) - 1))

        random.shuffle(questions)
        return questions

    def select_weak_areas(self, count: int, threshold: float = 0.7) -> list[Question]:
        """Select questions from domains where accuracy is below threshold."""
        domain_stats: dict[str, dict] = {}
        for q in self.questions.values():
            if q.domain not in domain_stats:
                domain_stats[q.domain] = {"shown": 0, "correct": 0}
            domain_stats[q.domain]["shown"] += q.times_shown
            domain_stats[q.domain]["correct"] += q.times_correct

        weak_domains = []
        for domain, stats in domain_stats.items():
            if stats["shown"] == 0:
                weak_domains.append(domain)
            elif stats["correct"] / stats["shown"] < threshold:
                weak_domains.append(domain)

        if not weak_domains:
            weak_domains = list(domain_stats.keys())

        pool = [q for q in self.questions.values() if q.domain in weak_domains]

        pool = sorted(pool, key=lambda q: (
            q.accuracy if q.times_shown > 0 else -1,
            -q.times_shown,
            random.random()
        ))

        return pool[:count]

    def get_all_domains(self) -> list[str]:
        """Get list of all domains with questions."""
        return sorted(set(q.domain for q in self.questions.values()))

    def get_tasks(self, domain: str) -> list[str]:
        """Get list of tasks for a domain."""
        return sorted(set(
            q.task for q in self.questions.values()
            if q.domain == domain
        ))

    def get_stats(self) -> dict:
        """Get overall question bank statistics."""
        by_domain = {}
        for q in self.questions.values():
            if q.domain not in by_domain:
                by_domain[q.domain] = {"total": 0, "easy": 0, "medium": 0, "hard": 0}
            by_domain[q.domain]["total"] += 1
            by_domain[q.domain][q.difficulty.lower()] += 1

        return {
            "total_questions": len(self.questions),
            "by_domain": by_domain,
        }
