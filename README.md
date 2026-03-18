# Practice Apps

Self-study practice question apps for certification exam preparation. Built with FastAPI (Python) backend and React/TypeScript frontend.

## Apps

| App | Questions | Path | Backend Port | Frontend Port |
|-----|-----------|------|-------------|---------------|
| **Finance Practice** | ~3,000 across 10 topics | `finance/` | 8000 | 5173 |
| **Project Management Practice** | ~1,500 across 3 domains | `project-management/` | 8001 | 5174 |

Both apps can run simultaneously on different ports.

## Quick Start

```bash
# Finance Practice
cd finance
setup.bat    # First time only
start.bat    # Opens http://localhost:5173

# Project Management Practice
cd project-management
setup.bat    # First time only
start.bat    # Opens http://localhost:5174
```

## Features

- Timed and untimed practice sessions
- Multiple session types: Mixed, Topic/Domain Drill, Weak Areas, Mock Exam
- Spaced repetition question selection
- Confidence tracking (guessing / maybe / sure)
- Immediate feedback with explanations
- Progress dashboard with per-topic/domain breakdown
- Question browser with filters
- Session pause/resume
- CSV progress export
- Session logs with feedback blocks for Claude review

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Pydantic, python-frontmatter
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Storage**: Markdown files with YAML frontmatter (no database)

## Disclaimer

All questions are AI-generated for personal study purposes. This is not affiliated with or endorsed by any certification body. No copyrighted exam content is reproduced.

## License

MIT
