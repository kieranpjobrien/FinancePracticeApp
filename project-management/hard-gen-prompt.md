# PMP Hard Question Generation — Master Prompt

You are generating NEW Hard difficulty PMP questions with strict length parity from day one. These supplement the existing bank with genuinely difficult scenarios that test PMI mindset without length tells.

## Core quality rules

1. **All 4 options within ±3 words of each other.** Count before writing. Non-negotiable.
2. **Difficulty: Hard.** Scenarios where 2-3 options are genuinely reasonable — the candidate must know PMI's specific first-action preference.
3. **Type: situational** (almost always). Concrete context: industry, methodology (Scrum/predictive/hybrid), team size, constraint, timing.
4. **Vary correct letter.** Across your batch, roughly 25% each A/B/C/D.
5. **No absurd distractors.** All 4 should be things a competent PM might actually consider.
6. **Avoid repetition.** Before writing, read 5-10 existing questions in your assigned task to understand coverage — then choose scenarios that take genuinely different angles.

## What makes a Hard question Hard

A Hard question sets up a tension where:
- The "nice" answer differs from the PMI answer (e.g. harmony vs. addressing the issue)
- The agile answer differs from the predictive answer (methodology context matters)
- The first instinct differs from the right first action (escalate vs. handle locally)
- Two valid actions compete on timing (A is right eventually, B is right FIRST)
- The obvious fix treats a symptom; only one option addresses the root cause
- A common industry practice violates a PMI principle (e.g. skipping change control "because it's urgent")

## What the distractors should be

Each wrong answer should be wrong for a SPECIFIC, DIFFERENT reason:
- **Premature escalation** — the PM should handle this themselves first
- **Skipping a step** — taking action without completing change control, stakeholder analysis, risk assessment
- **Symptom over root cause** — fixing the visible problem, not what's causing it
- **Wrong methodology** — applying waterfall thinking to an agile context or vice versa
- **Violating servant leadership** — commanding instead of facilitating, dictating instead of coaching
- **Ignoring compliance / ethics** — cutting corners where PMI says never compromise
- **Right thing, wrong time** — the action is correct but happens too early or too late

## PMI mindset anchors

Encode these in the correct answers:
- Servant leadership, coaching, facilitation
- Continuous risk management (living risk register)
- Integrated change control (even for "small" changes)
- Tailoring (context drives methodology)
- Root cause analysis (5 whys, fishbone)
- Business value drives decisions (benefits register, ROI, NPV)
- Compliance is non-negotiable
- Empirical process control (inspect-and-adapt)
- Stakeholder engagement is proactive and specific
- Psychological safety and team development
- Sustainable pace
- Transparency and reporting trust

## File format

```markdown
---
id: [ID — see assignment below]
domain: [People | Process | Business Environment]
task: [Exact task string from existing files — READ an existing file in your task folder to get exact wording]
difficulty: Hard
type: situational
created: 2026-04-17
source: claude-generated
times_shown: 0
times_correct: 0
last_shown: null
tags: [3-5 relevant tags]
---

# Question

[Scenario — 2-4 sentences with concrete context. Industry, methodology, team size, constraint, stage of project, specific roles. End with a focused question.]

## Options

- **A**: [Plausible PM action, matching length]
- **B**: [Plausible PM action, matching length]
- **C**: [Plausible PM action, matching length]
- **D**: [Plausible PM action, matching length]

## Answer

[Single letter]

## Explanation

[2-4 sentences. First sentence: why the correct answer is best per PMI. Then one sentence per distractor explaining the specific PMI principle it violates. Reference specific concepts: change control, servant leadership, Definition of Done, ADKAR, risk response categories, etc.]
```

## Word count discipline

Before finalising each question, count words in each option. Examples of acceptable parity:

**Good (all within 22-25 words):**
- A: 23 words
- B: 22 words
- C: 25 words
- D: 24 words

**Bad (correct is too long):**
- A: 12 words
- B: 14 words
- C: 28 words (correct)
- D: 11 words

If you see the second pattern, rewrite before saving.

## Australian English

Prose in question stems and explanations: organise, realise, behaviour, prioritise, analyse, colour, neighbour, metre, programme (for TV/training, not computer code), centre.

## Final check per question

- ✅ All 4 options within ±3 words of each other
- ✅ Correct answer is NOT the longest
- ✅ All 4 are plausible — none would be rejected as absurd by a working PM
- ✅ Scenario has concrete context (industry, methodology, constraint)
- ✅ Explanation names which PMI principle each wrong answer violates
- ✅ Correct letter distribution across the batch is roughly even

Generate questions that would challenge a PM with 5-10 years of experience who is studying but hasn't internalised PMI's specific philosophy yet.
