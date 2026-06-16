"""FastAPI backend for Unified Practice App."""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import load_config
from models import SessionConfig, AnswerSubmission, QuestionResponse, QuestionResult, SessionSummary
from questions import QuestionBank
from sessions import SessionManager

config = load_config(Path(__file__).parent.parent.parent / "config.yaml")

# Initialise a QuestionBank and SessionManager per exam type
question_banks: dict[str, QuestionBank] = {}
session_managers: dict[str, SessionManager] = {}

for exam_type in config.exams:
    qb = QuestionBank(config, exam_type)
    question_banks[exam_type] = qb
    session_managers[exam_type] = SessionManager(config, exam_type, qb)

app = FastAPI(
    title="Practice App",
    description="Unified practice question app for CFA, PMP, and more",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{config.server.frontend_port}",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_qb(exam_type: str) -> QuestionBank:
    if exam_type not in question_banks:
        raise HTTPException(status_code=404, detail=f"Unknown exam type: {exam_type}")
    return question_banks[exam_type]


def _get_sm(exam_type: str) -> SessionManager:
    if exam_type not in session_managers:
        raise HTTPException(status_code=404, detail=f"Unknown exam type: {exam_type}")
    return session_managers[exam_type]


# --- Global ---

@app.get("/")
def root():
    return {"status": "ok", "app": "Practice App", "exams": list(config.exams.keys())}


@app.get("/api/exams")
def list_exams():
    """List available exam types with metadata."""
    result = {}
    for exam_type, exam_config in config.exams.items():
        qb = question_banks.get(exam_type)
        result[exam_type] = {
            "name": exam_config.name,
            "category_label": exam_config.category_label,
            "subcategory_label": exam_config.subcategory_label,
            "session_types": exam_config.session_types,
            "question_types": exam_config.question_types,
            "total_questions": len(qb.questions) if qb else 0,
            "categories": [
                {"name": c.name, "weight": c.weight}
                for c in exam_config.categories
            ],
        }
    return result


# --- Per-exam endpoints ---

@app.get("/api/{exam_type}/stats")
def get_stats(exam_type: str):
    return _get_qb(exam_type).get_stats()


@app.get("/api/{exam_type}/categories")
def get_categories(exam_type: str):
    qb = _get_qb(exam_type)
    categories = qb.get_all_categories()
    result = {}
    for cat in categories:
        subcats = qb.get_subcategories(cat)
        count = len(qb.get_questions_for_category(cat))
        result[cat] = {
            "subcategories": subcats,
            "question_count": count,
        }
    return result


@app.post("/api/{exam_type}/reload")
def reload_questions(exam_type: str):
    qb = _get_qb(exam_type)
    qb.reload()
    return {"status": "ok", "total_questions": len(qb.questions)}


# --- Sessions ---

class CreateSessionRequest(BaseModel):
    config: SessionConfig


class CreateSessionResponse(BaseModel):
    session_id: str
    question_count: int
    questions: list[str]


@app.post("/api/{exam_type}/sessions", response_model=CreateSessionResponse)
def create_session(exam_type: str, request: CreateSessionRequest):
    sm = _get_sm(exam_type)
    session = sm.create_session(request.config)
    return CreateSessionResponse(
        session_id=session.session_id,
        question_count=len(session.questions),
        questions=session.questions,
    )


@app.get("/api/{exam_type}/sessions/paused")
def get_paused_sessions(exam_type: str):
    return _get_sm(exam_type).get_paused_sessions()


@app.get("/api/{exam_type}/sessions/{session_id}")
def get_session(exam_type: str, session_id: str):
    sm = _get_sm(exam_type)
    session = sm.get_session(session_id)
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


@app.get("/api/{exam_type}/sessions/{session_id}/question/{question_id}", response_model=QuestionResponse)
def get_session_question(exam_type: str, session_id: str, question_id: str):
    sm = _get_sm(exam_type)
    session = sm.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if question_id not in session.questions:
        raise HTTPException(status_code=404, detail="Question not in session")

    qb = _get_qb(exam_type)
    question = qb.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return QuestionResponse(
        id=question.id,
        category=question.category,
        subcategory=question.subcategory,
        difficulty=question.difficulty,
        question=question.question,
        options=question.options,
    )


@app.post("/api/{exam_type}/sessions/{session_id}/answer", response_model=QuestionResult)
def submit_answer(exam_type: str, session_id: str, answer: AnswerSubmission):
    result = _get_sm(exam_type).submit_answer(session_id, answer)
    if not result:
        raise HTTPException(status_code=404, detail="Session or question not found")
    return result


@app.post("/api/{exam_type}/sessions/{session_id}/complete", response_model=SessionSummary)
def complete_session(exam_type: str, session_id: str):
    summary = _get_sm(exam_type).complete_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary


@app.post("/api/{exam_type}/sessions/{session_id}/pause")
def pause_session(exam_type: str, session_id: str):
    if not _get_sm(exam_type).pause_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "paused", "session_id": session_id}


@app.delete("/api/{exam_type}/sessions/{session_id}")
def delete_session(exam_type: str, session_id: str):
    if not _get_sm(exam_type).delete_paused_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted", "session_id": session_id}


# --- Questions (browsing) ---

@app.get("/api/{exam_type}/questions")
def list_questions(exam_type: str, category: str = None, difficulty: str = None, seen: bool = None):
    qb = _get_qb(exam_type)
    questions = list(qb.questions.values())

    if category:
        questions = [q for q in questions if q.category == category]
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
            "category": q.category,
            "subcategory": q.subcategory,
            "difficulty": q.difficulty,
            "times_shown": q.times_shown,
            "times_correct": q.times_correct,
            "accuracy": round(q.accuracy * 100, 1) if q.times_shown > 0 else None,
            "last_shown": q.last_shown,
        }
        for q in questions
    ]


@app.get("/api/{exam_type}/questions/{question_id}")
def get_question(exam_type: str, question_id: str):
    question = _get_qb(exam_type).get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


# --- Progress ---

@app.get("/api/{exam_type}/progress")
def get_progress(exam_type: str):
    qb = _get_qb(exam_type)
    progress_by_category = {}
    overall_shown = 0
    overall_correct = 0

    for question in qb.questions.values():
        if question.category not in progress_by_category:
            progress_by_category[question.category] = {
                "total_questions": 0, "times_shown": 0, "times_correct": 0,
                "accuracy": 0.0, "questions_seen": 0, "questions_mastered": 0,
            }
        c = progress_by_category[question.category]
        c["total_questions"] += 1

        if question.times_shown > 0:
            c["times_shown"] += question.times_shown
            c["times_correct"] += question.times_correct
            c["questions_seen"] += 1
            overall_shown += question.times_shown
            overall_correct += question.times_correct
            if question.accuracy >= 0.8:
                c["questions_mastered"] += 1

    for cat_name, c in progress_by_category.items():
        if c["times_shown"] > 0:
            c["accuracy"] = round(c["times_correct"] / c["times_shown"] * 100, 1)

    overall_accuracy = round(overall_correct / overall_shown * 100, 1) if overall_shown > 0 else 0

    return {
        "overall": {"times_shown": overall_shown, "times_correct": overall_correct, "accuracy": overall_accuracy},
        "by_category": progress_by_category,
    }


@app.get("/api/{exam_type}/progress/history")
def get_progress_history(exam_type: str):
    sessions_path = config.get_sessions_path(exam_type)
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
                    "categories": meta.get("topics", meta.get("domains", meta.get("categories", []))),
                })
            except Exception:
                pass
    return history


@app.get("/api/{exam_type}/progress/export")
def export_progress_csv(exam_type: str):
    from fastapi.responses import Response
    qb = _get_qb(exam_type)
    exam_config = config.get_exam(exam_type)

    lines = [f"id,{exam_config.category_field},{exam_config.subcategory_field},difficulty,times_shown,times_correct,accuracy,last_shown"]
    for q in qb.questions.values():
        accuracy = round(q.accuracy * 100, 1) if q.times_shown > 0 else ""
        lines.append(
            f"{q.id},{q.category},{q.subcategory},{q.difficulty},"
            f"{q.times_shown},{q.times_correct},{accuracy},{q.last_shown or ''}"
        )

    csv_content = "\n".join(lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={exam_type}_progress.csv"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.server.host, port=config.server.port)
