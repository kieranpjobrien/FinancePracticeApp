"""Configuration loader for Unified Practice App."""

from pathlib import Path
from typing import Optional
import yaml
from pydantic import BaseModel


class CategoryConfig(BaseModel):
    name: str
    prefix: str
    weight: float
    target_questions: int


class ServerConfig(BaseModel):
    host: str = "localhost"
    port: int = 8010
    frontend_port: int = 5173


class PracticeConfig(BaseModel):
    default_questions: int = 20
    default_time_per_question: int = 90
    show_explanation_immediately: bool = False


class ScoringConfig(BaseModel):
    weak_threshold: int = 60
    strong_threshold: int = 80
    min_questions_for_assessment: int = 10


class PathsConfig(BaseModel):
    questions: str = "Questions"
    sessions: str = "Sessions"


class ExamConfig(BaseModel):
    name: str
    questions_path: str
    sessions_path: str
    category_label: str = "Category"
    subcategory_label: str = "Subcategory"
    category_field: str = "category"
    subcategory_field: str = "subcategory"
    question_types: list[str] = []
    session_types: list[str] = ["mixed", "weak_areas", "mock_exam"]
    categories: list[CategoryConfig] = []


class AppConfig(BaseModel):
    vault_path: str = "."
    server: ServerConfig = ServerConfig()
    practice: PracticeConfig = PracticeConfig()
    scoring: ScoringConfig = ScoringConfig()
    paths: PathsConfig = PathsConfig()
    exams: dict[str, ExamConfig] = {}

    @property
    def vault_root(self) -> Path:
        return Path(self.vault_path).resolve()

    def get_exam(self, exam_type: str) -> ExamConfig:
        if exam_type not in self.exams:
            raise ValueError(f"Unknown exam type: {exam_type}. Available: {list(self.exams.keys())}")
        return self.exams[exam_type]

    def get_questions_path(self, exam_type: str) -> Path:
        return self.vault_root / self.get_exam(exam_type).questions_path

    def get_sessions_path(self, exam_type: str) -> Path:
        return self.vault_root / self.get_exam(exam_type).sessions_path


def load_config(config_path: Optional[Path] = None) -> AppConfig:
    if config_path is None:
        current = Path(__file__).parent
        for _ in range(5):
            candidate = current / "config.yaml"
            if candidate.exists():
                config_path = candidate
                break
            current = current.parent

    if config_path is None or not config_path.exists():
        return AppConfig()

    with open(config_path) as f:
        data = yaml.safe_load(f)

    if data.get("vault_path") == ".":
        data["vault_path"] = str(config_path.parent)

    return AppConfig(**data)
