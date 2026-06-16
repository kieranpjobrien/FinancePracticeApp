"""Data models for Unified Practice App."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Question(BaseModel):
    """A single practice question — works for any exam type."""
    id: str
    category: str  # topic (CFA) or domain (PMP)
    subcategory: str  # subtopic (CFA) or task (PMP)
    difficulty: Literal["Easy", "Medium", "Hard"]
    type: str = "conceptual"
    question: str
    options: dict[str, str]
    answer: str
    explanation: str
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
    category: str
    subcategory: str
    difficulty: str
    question: str
    options: dict[str, str]


class AnswerSubmission(BaseModel):
    question_id: str
    selected_answer: str
    time_seconds: int
    confidence: Literal["guessing", "maybe", "sure"]


class QuestionResult(BaseModel):
    question_id: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    time_seconds: int
    confidence: str
    explanation: str


class SessionConfig(BaseModel):
    session_type: str = "mixed"
    categories: list[str] = []
    subcategory: Optional[str] = None
    question_count: int = 20
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    timed: bool = True
    time_per_question: int = 90


class SessionSummary(BaseModel):
    session_id: str
    date: str
    time: str
    session_type: str
    question_count: int
    questions_attempted: int
    score: int
    score_percent: float
    time_taken_minutes: float
    categories: list[str]
    results_by_category: dict[str, dict]
    error_summary: dict[str, int]


class SessionState(BaseModel):
    session_id: str
    config: SessionConfig
    questions: list[str]
    current_index: int = 0
    answers: dict[str, AnswerSubmission] = {}
    started_at: datetime = Field(default_factory=datetime.now)

    @property
    def is_complete(self) -> bool:
        return len(self.answers) == len(self.questions)
