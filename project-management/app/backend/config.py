"""Configuration loader for PMP Practice App."""

from pathlib import Path
from typing import Optional
import yaml
from pydantic import BaseModel


class DomainConfig(BaseModel):
    name: str
    prefix: str
    weight: float
    target_questions: int


class ServerConfig(BaseModel):
    host: str = "localhost"
    port: int = 8001
    frontend_port: int = 5174


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


class AppConfig(BaseModel):
    vault_path: str = "."
    server: ServerConfig = ServerConfig()
    practice: PracticeConfig = PracticeConfig()
    scoring: ScoringConfig = ScoringConfig()
    paths: PathsConfig = PathsConfig()
    domains: list[DomainConfig] = []

    @property
    def vault_root(self) -> Path:
        """Get absolute path to vault root."""
        return Path(self.vault_path).resolve()

    def get_questions_path(self) -> Path:
        return self.vault_root / self.paths.questions

    def get_sessions_path(self) -> Path:
        return self.vault_root / self.paths.sessions

    def get_domain_by_prefix(self, prefix: str) -> Optional[DomainConfig]:
        for domain in self.domains:
            if domain.prefix == prefix:
                return domain
        return None

    def get_domain_by_name(self, name: str) -> Optional[DomainConfig]:
        for domain in self.domains:
            if domain.name == name:
                return domain
        return None


def load_config(config_path: Optional[Path] = None) -> AppConfig:
    """Load configuration from YAML file."""
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
