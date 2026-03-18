"""Data models for CFA Practice App."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Question(BaseModel):
    """A single practice question."""
    id: str
    level: int = 1
    topic: str
    subtopic: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    type: Literal["conceptual", "calculation", "application"] = "conceptual"
    question: str
    options: dict[str, str]  # {"A": "...", "B": "...", "C": "..."}
    answer: str  # "A", "B", or "C"
    explanation: str
    los: Optional[str] = None
    tags: list[str] = []
    created: Optional[str] = None
    source: str = "claude-generated"
    times_shown: int = 0
    times_correct: int = 0
    last_shown: Optional[str] = None

    @property
    def accuracy(self) -> float:
        if self.times_shown == 0:
            return 0.0
        return self.times_correct / self.times_shown


class QuestionResponse(BaseModel):
    """Question data sent to frontend (without answer)."""
    id: str
    topic: str
    subtopic: str
    difficulty: str
    question: str
    options: dict[str, str]


class AnswerSubmission(BaseModel):
    """User's answer to a question."""
    question_id: str
    selected_answer: str  # "A", "B", or "C"
    time_seconds: int
    confidence: Literal["guessing", "maybe", "sure"]


class QuestionResult(BaseModel):
    """Result for a single question."""
    question_id: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    time_seconds: int
    confidence: str
    explanation: str


class SessionConfig(BaseModel):
    """Configuration for a practice session."""
    session_type: Literal["topic_drill", "subtopic_drill", "mixed", "weak_areas", "mock_exam", "diagnostic"] = "mixed"
    topics: list[str] = []  # Empty = all topics
    subtopic: Optional[str] = None  # For subtopic_drill
    question_count: int = 20
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    timed: bool = True
    time_per_question: int = 90  # seconds


class SessionSummary(BaseModel):
    """Summary of a completed session."""
    session_id: str
    date: str
    time: str
    session_type: str
    question_count: int
    questions_attempted: int
    score: int
    score_percent: float
    time_taken_minutes: float
    topics: list[str]
    results_by_topic: dict[str, dict]  # {"topic": {"correct": n, "total": n, "percent": float}}
    error_summary: dict[str, int]  # {"conceptual": n, "calculation": n, ...}


class SessionState(BaseModel):
    """Current state of an active session."""
    session_id: str
    config: SessionConfig
    questions: list[str]  # Question IDs
    current_index: int = 0
    answers: dict[str, AnswerSubmission] = {}
    started_at: datetime = Field(default_factory=datetime.now)

    @property
    def is_complete(self) -> bool:
        return len(self.answers) == len(self.questions)
