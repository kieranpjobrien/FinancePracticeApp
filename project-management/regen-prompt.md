# PMP Question Regeneration — Master Prompt

You are regenerating PMP exam practice questions to match the actual difficulty and style of the real PMP exam. The current questions have a critical quality issue: the correct answer is always the longest, most detailed option, and the distractors are obviously absurd ("To generate electricity for the project", "Start spreading negative information"). This makes them trivially easy and worthless for exam prep.

## Your task

For each question file, REWRITE the question, options, answer, and explanation. PRESERVE the frontmatter exactly (id, domain, task, difficulty, type, created, source, times_shown, times_correct, last_shown, tags, level if present). Only `last_shown`, `times_shown`, `times_correct` may be reset to defaults if absent.

## PMI testing philosophy — encode this in every question

Real PMP questions test the candidate's grasp of PMI's specific worldview. The correct answer is the one a PMI-trained PM would do FIRST, not necessarily the most thorough option. Key principles:

1. **Servant leadership and people-first thinking** — PMs serve teams, remove impediments, and develop people. They do not command, dictate, or micromanage.
2. **Stakeholder engagement is proactive** — engage early, communicate transparently, build relationships before crises.
3. **Change control discipline** — never bypass formal change control. Even "obvious" improvements go through CCB if they affect baseline.
4. **Agile and hybrid awareness** — questions may be agile (Scrum/Kanban/SAFe), predictive, or hybrid. The correct answer respects the methodology context.
5. **Address root causes, not symptoms** — when teams underperform, find why; don't just add resources or replace people.
6. **Escalation is a last resort** — PMs handle issues at their level first; escalate to sponsor only when blocked.
7. **Risk is identified and managed continuously** — risk register is a living document. Risk responses are categorized (avoid, transfer, mitigate, accept for negative; exploit, share, enhance, accept for positive).
8. **Tailoring matters** — there is no one-size-fits-all. The right answer depends on project context.
9. **Business value drives decisions** — features, scope, and trade-offs serve organisational benefits.
10. **Compliance and ethics are non-negotiable** — never compromise on regulatory, legal, or ethical standards.

## Question format requirements

- **Question stem**: realistic scenario with specific context (industry, team size, methodology, constraint). Avoid generic "What is X?" definitions unless the difficulty is Easy and the topic genuinely is conceptual.
- **4 options (A, B, C, D)**: ALL FOUR must be plausible actions a competent PM might take. The wrong answers should be:
  - Reasonable but not what PMI would do FIRST
  - Skipping a step in the PMI process (e.g., implementing a change without going through change control)
  - Solving the symptom rather than the root cause
  - The right action but at the wrong time
  - Defaulting to escalation when the PM should handle it themselves
- **NEVER include obviously stupid options** like "Ignore the situation", "Start spreading negative information", "To generate electricity for the project", "Demand full-time dedication", "Accept that resources will be pulled unpredictably", "Confront the stakeholder publicly".
- **Length parity**: All four options should be SIMILAR in length. If the correct answer is one sentence, the distractors should also be one sentence. No "longest = correct" pattern.
- **Vary the correct letter**: Across the batch, the correct answer should be roughly evenly distributed across A, B, C, D. Do not default to B.

## Difficulty calibration

- **Easy**: Single-concept conceptual questions. Definitions, formulas, basic process. The candidate either knows the term or doesn't.
- **Medium**: Scenario questions with one obvious right answer if you know the PMI process. Distractors are plausible but skip a step or violate a principle.
- **Hard**: Scenario questions where 2-3 options are reasonable, but only one matches PMI's specific philosophy. Often involves choosing between "what feels right" and "what PMI says to do first". May involve agile vs predictive context tension.

## Output format (markdown file)

```markdown
---
[preserved frontmatter — do not change unless adding missing fields]
---

# Question

[Question stem — realistic scenario with context]

## Options

- **A**: [plausible option]
- **B**: [plausible option]
- **C**: [plausible option]
- **D**: [plausible option]

## Answer

[Single letter A/B/C/D]

## Explanation

[2-4 sentences explaining why the correct answer is best per PMI philosophy, AND why each of the wrong options is wrong (or specifically why it's not the BEST first action). Reference specific PMI concepts where relevant: change control, stakeholder register, risk response, servant leadership, sprint retrospective, etc.]
```

## Quality self-check (apply to every question before writing)

Before saving, verify:
1. ✅ Are all four options plausible actions a real PM might take?
2. ✅ Is the correct answer NOT just the longest one?
3. ✅ Is the explanation clear about why the OTHER options are wrong, not just why the right one is right?
4. ✅ Does the question test PMI mindset, not just reading comprehension?
5. ✅ Is the difficulty appropriate (Easy = definitional, Hard = nuanced trade-off)?

If any answer is no, rewrite before saving.

## Examples of bad → good transformations

### BAD (current style)
> Q: A stakeholder is spreading negative information about the project. How should the PM respond?
> A. Confront the stakeholder publicly
> B. Engage the stakeholder directly to understand their perspective, provide accurate information transparently, build broader communication to counter misinformation, and address legitimate concerns they may have
> C. Start spreading negative information about the stakeholder
> D. Ignore the situation
> Answer: B

### GOOD (proper PMP style)
> Q: A senior stakeholder has begun raising concerns about the project's value to other executives, and you've heard the concerns are based on outdated information from an early status report. The next steering committee meeting is in two weeks. What should the project manager do FIRST?
> A. Update the project's communication management plan to require senior stakeholders to receive briefings before raising concerns externally.
> B. Schedule a one-on-one meeting with the stakeholder to understand their specific concerns and share current project information.
> C. Prepare a comprehensive briefing document with current project metrics and circulate it to all senior stakeholders.
> D. Raise the issue with the project sponsor and request that they address the stakeholder's behaviour at the steering committee.
> Answer: B
> Explanation: PMI emphasises direct stakeholder engagement and addressing concerns at the source before they escalate. (B) addresses the root cause — outdated information held by a specific stakeholder — through direct dialogue. (A) is reactive policy-making after the fact and doesn't address the current concern. (C) treats all stakeholders the same when the issue is specific to one person; broader communication should follow the targeted conversation, not replace it. (D) escalates prematurely; the PM should attempt direct resolution before involving the sponsor.

## Final note

Write questions a working PM with PMP would find genuinely tricky. If a candidate can score 100% in 5 minutes by picking the longest answer, the question bank has failed. Aim for a question bank where a PMP candidate scores 65-80% on first pass, with mistakes coming from "I picked the option that sounded right but PMI says do this other thing first."
