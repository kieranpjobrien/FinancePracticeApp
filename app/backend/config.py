"""Configuration loader for Finance Practice App."""

from pathlib import Path
from typing import Optional
import yaml
from pydantic import BaseModel


class TopicConfig(BaseModel):
    name: str
    prefix: str
    weight: float
    target_questions: int


class ServerConfig(BaseModel):
    host: str = "localhost"
    port: int = 8000
    frontend_port: int = 5173


class PracticeConfig(BaseModel):
    default_questions: int = 20
    default_time_per_question: int = 90
    show_explanation_immediately: bool = False


class ScoringConfig(BaseModel):
    weak_threshold: int = 60
    strong_threshold: int = 80
    min_questions_for_assessment: int = 10


class GenerationConfig(BaseModel):
    target_total_questions: int = 3000
    questions_per_batch: int = 10
    review_before_adding: bool = True


class PathsConfig(BaseModel):
    questions: str = "Questions"
    sessions: str = "Sessions"
    feedback: str = "Feedback"
    flashcards: str = "Flashcards"
    lessons: str = "Lessons"


class AppConfig(BaseModel):
    vault_path: str = "."
    server: ServerConfig = ServerConfig()
    practice: PracticeConfig = PracticeConfig()
    scoring: ScoringConfig = ScoringConfig()
    generation: GenerationConfig = GenerationConfig()
    paths: PathsConfig = PathsConfig()
    topics: list[TopicConfig] = []

    @property
    def vault_root(self) -> Path:
        """Get absolute path to vault root."""
        return Path(self.vault_path).resolve()

    def get_questions_path(self) -> Path:
        return self.vault_root / self.paths.questions

    def get_sessions_path(self) -> Path:
        return self.vault_root / self.paths.sessions

    def get_topic_by_prefix(self, prefix: str) -> Optional[TopicConfig]:
        for topic in self.topics:
            if topic.prefix == prefix:
                return topic
        return None

    def get_topic_by_name(self, name: str) -> Optional[TopicConfig]:
        for topic in self.topics:
            if topic.name == name:
                return topic
        return None


def load_config(config_path: Optional[Path] = None) -> AppConfig:
    """Load configuration from YAML file."""
    if config_path is None:
        # Look for config.yaml in parent directories
        current = Path(__file__).parent
        for _ in range(5):  # Check up to 5 levels up
            candidate = current / "config.yaml"
            if candidate.exists():
                config_path = candidate
                break
            current = current.parent

    if config_path is None or not config_path.exists():
        # Return default config
        return AppConfig()

    with open(config_path) as f:
        data = yaml.safe_load(f)

    # Set vault_path relative to config file location
    if data.get("vault_path") == ".":
        data["vault_path"] = str(config_path.parent)

    return AppConfig(**data)
