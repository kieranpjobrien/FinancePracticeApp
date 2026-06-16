# Practice App

A single, config-driven self-study app covering **CFA** (Financial Analysis) and **PMP** (Project Management) exams. One FastAPI backend and one React/TypeScript frontend serve every exam type; the same question bank also ships as an Obsidian plugin that reads the Markdown directly (works on mobile).

~3,000 CFA questions and ~2,400 PMP questions, stored as Markdown with YAML frontmatter — no database.

## Structure

| Path | Contents |
|------|----------|
| `app/backend/` | FastAPI backend — config-driven, one app serves all exams |
| `app/frontend/` | React + TypeScript (Vite) frontend |
| `Questions/CFA/`, `Questions/PMP/` | Question bank (Markdown + YAML frontmatter) |
| `plugin/` | Obsidian plugin — source in `src/`, plus prebuilt `main.js` / `manifest.json` / `styles.css` |
| `config.yaml` | Exam definitions, category weights, server settings |
| `docs/` | Study resources and design notes |

## Running the app

```bash
# Backend (port 8010)
cd app/backend
python -m venv venv
venv/Scripts/pip install -r requirements.txt   # first time
venv/Scripts/python -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload

# Frontend (port 5173, proxies /api to the backend)
cd app/frontend
npm install   # first time
npm run dev
```

## Obsidian plugin

Copy `plugin/` into your vault as `.obsidian/plugins/practice-app/` — the prebuilt `main.js`, `manifest.json` and `styles.css` are included, so no build step is required. To rebuild from source:

```bash
cd plugin
npm install
npm run build   # node esbuild.config.mjs
```

## Adding an exam type

Add a section to `config.yaml`, a `Questions/{TYPE}/` folder, and question Markdown files. No code changes required.

## Question format

```markdown
---
id: ETH-001
topic: Ethics
subtopic: Code of Conduct
difficulty: Medium
type: conceptual
---

## Question
...

## Options
- **A**: ...
- **B**: ...
- **C**: ...

## Answer
A

## Explanation
...
```

## Disclaimer

All questions are AI-generated for personal study. Not affiliated with or endorsed by any certification body. No copyrighted exam content is reproduced.

## License

MIT
