"""FastAPI backend for PMP Practice App."""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import load_config
from models import (
    SessionConfig,
    AnswerSubmission,
    QuestionResponse,
    QuestionResult,
    SessionSummary,
)
from questions import QuestionBank
from sessions import SessionManager

config = load_config(Path(__file__).parent.parent.parent / "config.yaml")

question_bank = QuestionBank(config)
session_manager = SessionManager(config, question_bank)

app = FastAPI(
    title="PMP Practice App",
    description="Practice questions for PMP certification exam preparation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{config.server.frontend_port}",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "app": "PMP Practice"}


@app.get("/api/stats")
def get_stats():
    """Get question bank statistics."""
    return question_bank.get_stats()


@app.get("/api/domains")
def get_domains():
    """Get available domains and their tasks."""
    domains = question_bank.get_all_domains()
    result = {}
    for domain in domains:
        tasks = question_bank.get_tasks(domain)
        count = len(question_bank.get_questions_for_domain(domain))
        result[domain] = {
            "tasks": tasks,
            "question_count": count,
        }
    return result


@app.post("/api/reload")
def reload_questions():
    """Reload questions from disk."""
    question_bank.reload()
    return {"status": "ok", "total_questions": len(question_bank.questions)}


# --- Sessions ---

class CreateSessionRequest(BaseModel):
    config: SessionConfig


class CreateSessionResponse(BaseModel):
    session_id: str
    question_count: int
    questions: list[str]


@app.post("/api/sessions", response_model=CreateSessionResponse)
def create_session(request: CreateSessionRequest):
    """Create a new practice session."""
    session = session_manager.create_session(request.config)
    return CreateSessionResponse(
        session_id=session.session_id,
        question_count=len(session.questions),
        questions=session.questions,
    )


@app.get("/api/sessions/paused")
def get_paused_sessions():
    """Get list of paused sessions."""
    return session_manager.get_paused_sessions()


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str):
    """Get session state."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "question_count": len(session.questions),
        "questions": session.questions,
        "current_index": session.current_index,
        "answers_submitted": len(session.answers),
        "is_complete": session.is_complete,
    }


@app.get("/api/sessions/{session_id}/question/{question_id}", response_model=QuestionResponse)
def get_session_question(session_id: str, question_id: str):
    """Get a question for a session (without answer)."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if question_id not in session.questions:
        raise HTTPException(status_code=404, detail="Question not in session")

    question = question_bank.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return QuestionResponse(
        id=question.id,
        domain=question.domain,
        task=question.task,
        difficulty=question.difficulty,
        question=question.question,
        options=question.options,
    )


@app.post("/api/sessions/{session_id}/answer", response_model=QuestionResult)
def submit_answer(session_id: str, answer: AnswerSubmission):
    """Submit an answer for a question."""
    result = session_manager.submit_answer(session_id, answer)
    if not result:
        raise HTTPException(status_code=404, detail="Session or question not found")
    return result


@app.post("/api/sessions/{session_id}/complete", response_model=SessionSummary)
def complete_session(session_id: str):
    """Complete a session and get summary."""
    summary = session_manager.complete_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary


# --- Questions (for browsing) ---

@app.get("/api/questions")
def list_questions(
    domain: str = None,
    difficulty: str = None,
    seen: bool = None,
):
    """List all questions with optional filters."""
    questions = list(question_bank.questions.values())

    if domain:
        questions = [q for q in questions if q.domain == domain]
    if difficulty:
        questions = [q for q in questions if q.difficulty.lower() == difficulty.lower()]
    if seen is not None:
        if seen:
            questions = [q for q in questions if q.times_shown > 0]
        else:
            questions = [q for q in questions if q.times_shown == 0]

    return [
        {
            "id": q.id,
            "domain": q.domain,
            "task": q.task,
            "difficulty": q.difficulty,
            "times_shown": q.times_shown,
            "times_correct": q.times_correct,
            "accuracy": round(q.accuracy * 100, 1) if q.times_shown > 0 else None,
            "last_shown": q.last_shown,
        }
        for q in questions
    ]


@app.get("/api/questions/{question_id}")
def get_question(question_id: str):
    """Get a question by ID (includes answer - for review mode)."""
    question = question_bank.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


# --- Pause/Resume ---

@app.post("/api/sessions/{session_id}/pause")
def pause_session(session_id: str):
    """Pause a session for later resumption."""
    success = session_manager.pause_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "paused", "session_id": session_id}


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    """Delete a paused session."""
    success = session_manager.delete_paused_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted", "session_id": session_id}


# --- Progress ---

@app.get("/api/progress")
def get_progress():
    """Get progress data for all questions."""
    progress_by_domain = {}
    overall_shown = 0
    overall_correct = 0

    for question in question_bank.questions.values():
        if question.domain not in progress_by_domain:
            progress_by_domain[question.domain] = {
                "total_questions": 0,
                "times_shown": 0,
                "times_correct": 0,
                "accuracy": 0.0,
                "questions_seen": 0,
                "questions_mastered": 0,
            }

        d = progress_by_domain[question.domain]
        d["total_questions"] += 1

        if question.times_shown > 0:
            d["times_shown"] += question.times_shown
            d["times_correct"] += question.times_correct
            d["questions_seen"] += 1
            overall_shown += question.times_shown
            overall_correct += question.times_correct

            if question.accuracy >= 0.8:
                d["questions_mastered"] += 1

    for domain_name, d in progress_by_domain.items():
        if d["times_shown"] > 0:
            d["accuracy"] = round(d["times_correct"] / d["times_shown"] * 100, 1)

    overall_accuracy = round(overall_correct / overall_shown * 100, 1) if overall_shown > 0 else 0

    return {
        "overall": {
            "times_shown": overall_shown,
            "times_correct": overall_correct,
            "accuracy": overall_accuracy,
        },
        "by_domain": progress_by_domain,
    }


@app.get("/api/progress/history")
def get_progress_history():
    """Get historical session data for trend analysis."""
    sessions_path = config.get_sessions_path()
    history = []

    if sessions_path.exists():
        for md_file in sorted(sessions_path.glob("*.md")):
            try:
                import frontmatter as fm
                post = fm.load(md_file)
                meta = post.metadata
                history.append({
                    "date": meta.get("date"),
                    "time": meta.get("time"),
                    "type": meta.get("type"),
                    "score": meta.get("score"),
                    "score_percent": meta.get("score_percent"),
                    "questions_count": meta.get("questions_count"),
                    "domains": meta.get("domains", []),
                })
            except Exception:
                pass

    return history


@app.get("/api/progress/export")
def export_progress_csv():
    """Export question progress as CSV."""
    from fastapi.responses import Response

    lines = ["id,domain,task,difficulty,times_shown,times_correct,accuracy,last_shown"]

    for q in question_bank.questions.values():
        accuracy = round(q.accuracy * 100, 1) if q.times_shown > 0 else ""
        lines.append(
            f"{q.id},{q.domain},{q.task},{q.difficulty},"
            f"{q.times_shown},{q.times_correct},{accuracy},{q.last_shown or ''}"
        )

    csv_content = "\n".join(lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pmp_progress.csv"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.server.host, port=config.server.port)
