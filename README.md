# Finance Practice App

A self-study practice question app for finance certification exam preparation. Built with FastAPI (Python) backend and React (TypeScript) frontend.

## Disclaimer

**This project is not affiliated with, endorsed by, or connected to any professional certification organization.** It is an independent, personal study tool.

All questions are original, created for educational purposes. No copyrighted exam materials are included.

## Features

- **Practice Sessions**: Configurable question count, topic selection, and difficulty
- **Spaced Repetition**: Smart question selection prioritizes weak areas and overdue reviews
- **Progress Tracking**: See accuracy by topic, identify weak areas
- **Session Types**:
  - Topic Drill - Focus on specific subjects
  - Subtopic Drill - Narrow focus within a topic
  - Mock Exam - Weighted by typical exam distribution
  - Weak Areas - Prioritizes questions you've struggled with
- **Session Pause/Resume**: Save your progress and continue later
- **Detailed Session Logs**: Markdown logs saved for review

## Quick Start

### Prerequisites

- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)

### Setup

1. Clone or download this repository
2. Run the setup script:

```batch
setup.bat
```

This will:
- Create an isolated Python virtual environment (inside this folder only)
- Install Python dependencies
- Install Node.js dependencies

Your system Python installation is **not** modified.

### Running the App

```batch
start.bat
```

This starts both servers and opens your browser to http://localhost:5173

## Project Structure

```
├── app/
│   ├── backend/          # FastAPI Python backend
│   │   ├── main.py       # API endpoints
│   │   ├── questions.py  # Question loading & selection
│   │   ├── sessions.py   # Session management
│   │   └── venv/         # Python virtual environment (created by setup)
│   └── frontend/         # React TypeScript frontend
│       ├── src/
│       └── node_modules/ # NPM packages (created by setup)
├── Questions/            # Question bank (markdown files)
├── Sessions/             # Session logs (generated)
├── config.yaml           # App configuration
├── setup.bat             # One-time setup script
├── start.bat             # Start the app
└── README.md
```

## Question Format

Questions are stored as markdown files with YAML frontmatter:

```markdown
---
id: ETH-001
topic: Ethics
subtopic: Professional Standards
difficulty: Medium
type: conceptual
---

# Question

What is the primary purpose of a code of ethics?

## Options

- **A**: To provide legal protection
- **B**: To establish standards of conduct
- **C**: To maximize profits

## Answer

B

## Explanation

A code of ethics establishes expected standards of professional conduct...
```

## Adding Questions

1. Create a markdown file in the appropriate `Questions/[Topic]/` folder
2. Follow the format above
3. Restart the backend to reload questions, or use the API reload endpoint

## Configuration

Edit `config.yaml` to customize:

- Default session settings
- Topic weights for mock exams
- Scoring thresholds
- File paths

## Development

**Backend** (Python/FastAPI):
```bash
cd app/backend
venv\Scripts\activate
uvicorn main:app --reload
```

**Frontend** (React/Vite):
```bash
cd app/frontend
npm run dev
```

## Question Bank Progress

Current question generation status:

| Topic | Generated | Target | Status |
|-------|-----------|--------|--------|
| Ethics | 108 | 525 | In Progress |
| Quantitative Methods | 225 | 225 | ✓ Complete |
| Economics | 225 | 225 | ✓ Complete |
| Financial Statement Analysis | 375 | 375 | ✓ Complete |
| Corporate Issuers | 223 | 225 | Almost Complete |
| Equity Investments | 88 | 375 | In Progress |
| Fixed Income | 2 | 375 | Pending |
| Derivatives | 2 | 195 | Pending |
| Alternative Investments | 2 | 255 | Pending |
| Portfolio Management | 300 | 300 | ✓ Complete |

**Total: 1,550 / 3,075 questions (50%)**

*Last updated: 2025-12-27*

## License

MIT License - see [LICENSE](LICENSE)

---

Built for personal learning. Good luck with your studies!
