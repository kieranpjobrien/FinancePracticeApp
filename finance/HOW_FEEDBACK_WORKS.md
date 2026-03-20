# How Session Feedback Works

When you finish a session (not pause, but complete it), the app does three things:

## 1. Creates a Session Log

Saved to `Sessions/YYYY-MM-DD-HHMM.md` with:

- **Summary table**: Score, time, mode, topics
- **Results by topic**: Breakdown showing which areas you struggled with
- **Individual questions**: Each question with ✅/❌, your answer vs correct, time taken, confidence level
- **Error summary**: Categorized errors (conceptual, calculation, time pressure, overconfidence)

## 2. Updates Question Statistics

Each question's markdown file gets updated:

- `times_shown` increments
- `times_correct` increments if you got it right
- `last_shown` set to today

This powers the **spaced repetition** - questions you get wrong appear more often in future sessions.

## 3. Generates a Feedback Request Block

At the bottom of each session log, if you got questions wrong, there's a ready-to-copy YAML block like:

```yaml
# Finance Practice Session Feedback Request
session_id: 2025-12-27-143022-abc123
score: 18/20 (90%)

wrong_answers:
  - id: FI-042
    topic: Fixed Income
    subtopic: Duration
    question: |
      What happens to duration when...
    selected: A
    correct: B
    confidence: sure
```

Plus a **suggested prompt** to paste into Claude:

> Review these finance practice questions I got wrong. For each:
> 1. Explain why my answer was incorrect
> 2. Explain why the correct answer is right
> 3. Identify the specific concept I need to review
> 4. Suggest a flashcard (front/back) to help me remember

---

## Best Workflow

1. **Run a session** (mock exam, topic drill, etc.)
2. **Complete it** (don't just pause)
3. **Open the session log** in `Sessions/` folder
4. **Review the summary** - see which topics need work
5. **Copy the feedback block** and paste it into a Claude conversation
6. **Get targeted explanations** for what you got wrong
7. **Add the suggested flashcards** to your Obsidian flashcard deck if useful

## Error Categories

The error categorization helps identify patterns:

| Error Type | Meaning | Action |
|------------|---------|--------|
| **Time pressure** | Answered in <30s and got it wrong | Slow down, read carefully |
| **Overconfidence** | Said "sure" but were wrong | Review fundamentals |
| **Calculation** | Math/computation error | Practice mechanics |
| **Conceptual** | Didn't understand the concept | Re-read source material |

---

*Session logs are Obsidian-compatible markdown files.*
