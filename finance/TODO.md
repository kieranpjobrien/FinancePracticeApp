# CFA Practice App - Future Enhancements

## Completed Features

### Weak Areas Mode
- [x] Auto-select questions from topics with <70% accuracy
- [x] Added to SessionConfig dropdown
- [x] Prioritizes individually weak questions within weak topics

### Spaced Repetition
- [x] Weight question selection by `last_shown` and accuracy
- [x] Questions answered incorrectly have shorter review intervals (1 day)
- [x] Questions with 60-80% accuracy reviewed every 3 days
- [x] Mastered questions (80%+) reviewed weekly

### Question Review Mode
- [x] Browse all questions without timed session
- [x] Filter by topic, difficulty, seen/unseen
- [x] Click to view full question with answer and explanation

### Export Stats
- [x] CSV export from Progress Dashboard
- [x] Includes: id, topic, subtopic, difficulty, times_shown, times_correct, accuracy, last_shown

## Future Scope

### CFA Level 2
- [ ] Add `level: 2` support to question schema (already in model)
- [ ] Level selector in session config
- [ ] Separate progress tracking by level
- [ ] Item set / vignette question format (multiple questions per case)

### CFA Level 3
- [ ] Essay-style questions (constructed response)
- [ ] Would need different UI for free-text answers
- [ ] Manual or AI-assisted grading

## Technical Debt

- [ ] Add question ID index for faster stat updates (currently iterates all files)
- [ ] Consider SQLite for stats if question count grows large
- [ ] Add error boundaries in React components

## Content

- [ ] Scale question bank to 3,000 questions
- [ ] ~300 per topic for Level 1
