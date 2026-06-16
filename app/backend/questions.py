"""Question loading and management for Unified Practice App."""

import random
from datetime import datetime
from pathlib import Path
from typing import Optional
import frontmatter

from config import AppConfig, ExamConfig
from models import Question


class QuestionBank:
    """Manages loading and selecting questions for a single exam type."""

    def __init__(self, config: AppConfig, exam_type: str):
        self.config = config
        self.exam_type = exam_type
        self.exam_config: ExamConfig = config.get_exam(exam_type)
        self.questions: dict[str, Question] = {}
        self._load_all_questions()

    def _load_all_questions(self):
        questions_path = self.config.get_questions_path(self.exam_type)
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
        post = frontmatter.load(path)
        metadata = post.metadata

        if not metadata.get("id"):
            return None

        content = post.content
        question_text = ""
        options = {}
        answer = ""
        explanation = ""

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
                    for letter in ("A", "B", "C", "D"):
                        if line.startswith(f"- **{letter}**:"):
                            options[letter] = line.replace(f"- **{letter}**:", "").strip()
            elif section.startswith("Answer"):
                answer = section.replace("Answer", "").strip().split("\n")[0].strip()
            elif section.startswith("Explanation"):
                explanation = section.replace("Explanation", "").strip()

        if not question_text and "# Question" in content:
            parts = content.split("# Question")
            if len(parts) > 1:
                rest = parts[1]
                q_end = rest.find("## ")
                if q_end > 0:
                    question_text = rest[:q_end].strip()

        created = metadata.get("created")
        if created and not isinstance(created, str):
            created = str(created)

        last_shown = metadata.get("last_shown")
        if last_shown and not isinstance(last_shown, str):
            last_shown = str(last_shown)

        # Map exam-specific fields to generic category/subcategory
        cat_field = self.exam_config.category_field
        subcat_field = self.exam_config.subcategory_field

        return Question(
            id=metadata.get("id"),
            category=metadata.get(cat_field, metadata.get("category", "")),
            subcategory=metadata.get(subcat_field, metadata.get("subcategory", "")),
            difficulty=metadata.get("difficulty", "Medium"),
            type=metadata.get("type", "conceptual"),
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
        self.questions.clear()
        self._load_all_questions()

    def get_question(self, question_id: str) -> Optional[Question]:
        return self.questions.get(question_id)

    def get_questions_for_category(self, category: str) -> list[Question]:
        return [q for q in self.questions.values() if q.category == category]

    def get_questions_for_subcategory(self, category: str, subcategory: str) -> list[Question]:
        return [
            q for q in self.questions.values()
            if q.category == category and q.subcategory == subcategory
        ]

    def select_questions(
        self,
        count: int,
        categories: Optional[list[str]] = None,
        difficulty: str = "mixed",
    ) -> list[Question]:
        pool = list(self.questions.values())

        if categories:
            pool = [q for q in pool if q.category in categories]

        if difficulty != "mixed":
            pool = [q for q in pool if q.difficulty.lower() == difficulty.lower()]

        if not pool:
            return []

        today = datetime.now().date()

        def srs_score(q: Question) -> tuple:
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
            return (1, overdue, -q.accuracy if q.times_shown > 0 else 0, random.random())

        pool = sorted(pool, key=srs_score)
        return pool[:count]

    def select_weighted_by_exam(self, count: int) -> list[Question]:
        exam_weights = {
            cat.name: cat.weight / 100.0
            for cat in self.exam_config.categories
        }

        questions = []
        for category, weight in exam_weights.items():
            cat_count = round(count * weight)
            cat_questions = self.select_questions(cat_count, categories=[category], difficulty="mixed")
            questions.extend(cat_questions)

        while len(questions) > count:
            questions.pop(random.randint(0, len(questions) - 1))

        random.shuffle(questions)
        return questions

    def select_weak_areas(self, count: int, threshold: float = 0.7) -> list[Question]:
        cat_stats: dict[str, dict] = {}
        for q in self.questions.values():
            if q.category not in cat_stats:
                cat_stats[q.category] = {"shown": 0, "correct": 0}
            cat_stats[q.category]["shown"] += q.times_shown
            cat_stats[q.category]["correct"] += q.times_correct

        weak_cats = []
        for cat, stats in cat_stats.items():
            if stats["shown"] == 0:
                weak_cats.append(cat)
            elif stats["correct"] / stats["shown"] < threshold:
                weak_cats.append(cat)

        if not weak_cats:
            weak_cats = list(cat_stats.keys())

        pool = [q for q in self.questions.values() if q.category in weak_cats]
        pool = sorted(pool, key=lambda q: (
            q.accuracy if q.times_shown > 0 else -1,
            -q.times_shown,
            random.random()
        ))
        return pool[:count]

    def get_all_categories(self) -> list[str]:
        return sorted(set(q.category for q in self.questions.values()))

    def get_subcategories(self, category: str) -> list[str]:
        return sorted(set(
            q.subcategory for q in self.questions.values()
            if q.category == category
        ))

    def get_stats(self) -> dict:
        by_category = {}
        for q in self.questions.values():
            if q.category not in by_category:
                by_category[q.category] = {"total": 0, "easy": 0, "medium": 0, "hard": 0}
            by_category[q.category]["total"] += 1
            by_category[q.category][q.difficulty.lower()] += 1

        return {
            "total_questions": len(self.questions),
            "by_category": by_category,
        }
