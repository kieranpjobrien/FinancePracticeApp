"""Question loading and management."""

import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import frontmatter

from config import AppConfig
from models import Question


class QuestionBank:
    """Manages loading and selecting questions from the vault."""

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
                # Extract question text (skip the header line)
                lines = section.split("\n", 1)
                if len(lines) > 1:
                    question_text = lines[1].strip()
                else:
                    question_text = section.replace("# Question", "").strip()
            elif section.startswith("Options"):
                # Parse options
                for line in section.split("\n"):
                    line = line.strip()
                    if line.startswith("- **A**:"):
                        options["A"] = line.replace("- **A**:", "").strip()
                    elif line.startswith("- **B**:"):
                        options["B"] = line.replace("- **B**:", "").strip()
                    elif line.startswith("- **C**:"):
                        options["C"] = line.replace("- **C**:", "").strip()
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
            level=metadata.get("level", 1),
            topic=metadata.get("topic", ""),
            subtopic=metadata.get("subtopic", ""),
            difficulty=metadata.get("difficulty", "Medium"),
            type=metadata.get("type", "conceptual"),
            question=question_text,
            options=options,
            answer=answer,
            explanation=explanation,
            los=metadata.get("los"),
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

    def get_questions_for_topic(self, topic: str) -> list[Question]:
        """Get all questions for a topic."""
        return [q for q in self.questions.values() if q.topic == topic]

    def get_questions_for_subtopic(self, topic: str, subtopic: str) -> list[Question]:
        """Get all questions for a subtopic."""
        return [
            q for q in self.questions.values()
            if q.topic == topic and q.subtopic == subtopic
        ]

    def select_questions(
        self,
        count: int,
        topics: Optional[list[str]] = None,
        difficulty: str = "mixed",
        prioritize_unseen: bool = True,
    ) -> list[Question]:
        """Select questions for a session with spaced repetition weighting."""
        pool = list(self.questions.values())

        # Filter by topics
        if topics:
            pool = [q for q in pool if q.topic in topics]

        # Filter by difficulty
        if difficulty != "mixed":
            pool = [q for q in pool if q.difficulty.lower() == difficulty.lower()]

        if not pool:
            return []

        # Spaced repetition scoring
        today = datetime.now().date()

        def srs_score(q: Question) -> tuple:
            """Lower score = higher priority for selection."""
            # Never seen = highest priority
            if q.times_shown == 0:
                return (0, 0, random.random())

            # Calculate days since last shown
            days_since = 0
            if q.last_shown:
                try:
                    last = datetime.strptime(q.last_shown, "%Y-%m-%d").date()
                    days_since = (today - last).days
                except ValueError:
                    days_since = 999

            # Calculate optimal interval based on accuracy
            if q.accuracy >= 0.8:
                optimal_interval = 7  # Review weekly if mastered
            elif q.accuracy >= 0.6:
                optimal_interval = 3  # Review every few days
            else:
                optimal_interval = 1  # Review daily if struggling

            # Priority: how overdue is the question?
            overdue = optimal_interval - days_since

            return (
                1,  # Seen questions after unseen
                overdue,  # More overdue = higher priority
                -q.accuracy if q.times_shown > 0 else 0,  # Lower accuracy = priority
                random.random()
            )

        pool = sorted(pool, key=srs_score)
        return pool[:count]

    def select_weighted_by_exam(self, count: int) -> list[Question]:
        """Select questions weighted by CFA L1 exam topic distribution."""
        exam_weights = {
            "Ethics": 0.175,
            "Quantitative Methods": 0.075,
            "Economics": 0.075,
            "Financial Statement Analysis": 0.125,
            "Corporate Issuers": 0.075,
            "Equity Investments": 0.125,
            "Fixed Income": 0.125,
            "Derivatives": 0.065,
            "Alternative Investments": 0.085,
            "Portfolio Management": 0.10,
        }

        questions = []
        for topic, weight in exam_weights.items():
            topic_count = round(count * weight)
            topic_questions = self.select_questions(
                topic_count,
                topics=[topic],
                difficulty="mixed"
            )
            questions.extend(topic_questions)

        # Adjust if rounding caused over/under selection
        while len(questions) > count:
            questions.pop(random.randint(0, len(questions) - 1))

        random.shuffle(questions)
        return questions

    def select_weak_areas(self, count: int, threshold: float = 0.7) -> list[Question]:
        """Select questions from topics where accuracy is below threshold."""
        # Calculate accuracy by topic
        topic_stats: dict[str, dict] = {}
        for q in self.questions.values():
            if q.topic not in topic_stats:
                topic_stats[q.topic] = {"shown": 0, "correct": 0}
            topic_stats[q.topic]["shown"] += q.times_shown
            topic_stats[q.topic]["correct"] += q.times_correct

        # Find weak topics (below threshold or never seen)
        weak_topics = []
        for topic, stats in topic_stats.items():
            if stats["shown"] == 0:
                weak_topics.append(topic)  # Never practiced = weak
            elif stats["correct"] / stats["shown"] < threshold:
                weak_topics.append(topic)

        if not weak_topics:
            # No weak areas - use all topics but prioritize low-accuracy questions
            weak_topics = list(topic_stats.keys())

        # Get questions from weak topics, prioritizing individually weak questions
        pool = [q for q in self.questions.values() if q.topic in weak_topics]

        # Sort by individual weakness (low accuracy first, unseen first)
        pool = sorted(pool, key=lambda q: (
            q.accuracy if q.times_shown > 0 else -1,  # Unseen = -1 (highest priority)
            -q.times_shown,  # Less seen = higher priority
            random.random()
        ))

        return pool[:count]

    def get_all_topics(self) -> list[str]:
        """Get list of all topics with questions."""
        return sorted(set(q.topic for q in self.questions.values()))

    def get_subtopics(self, topic: str) -> list[str]:
        """Get list of subtopics for a topic."""
        return sorted(set(
            q.subtopic for q in self.questions.values()
            if q.topic == topic
        ))

    def get_stats(self) -> dict:
        """Get overall question bank statistics."""
        by_topic = {}
        for q in self.questions.values():
            if q.topic not in by_topic:
                by_topic[q.topic] = {"total": 0, "easy": 0, "medium": 0, "hard": 0}
            by_topic[q.topic]["total"] += 1
            by_topic[q.topic][q.difficulty.lower()] += 1

        return {
            "total_questions": len(self.questions),
            "by_topic": by_topic,
        }
