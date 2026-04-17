# PMP Question Length Parity Pass — Master Prompt

The PMP question bank was regenerated with proper distractors, but ~75% of questions still have a length-tell: the correct answer is noticeably longer than the distractors. A savvy test-taker can pick the right answer by length alone without knowing PMI philosophy.

## Your task

For each question file in your batch, enforce LENGTH PARITY across all 4 options. The correct answer must NOT be noticeably longer than the distractors.

## Process for each file

1. Read the file
2. Count words in each of the 4 options (A, B, C, D)
3. If the correct answer is the longest by more than ~3-4 words, REWRITE:
   - Trim the correct answer to match distractor length (preserve the PMI-correct meaning but remove trailing clauses, examples, explanations)
   - AND/OR expand the distractors with plausible additional context (a clause about timing, rationale, or consideration) so they reach similar length
   - The goal: all four options are within roughly ±3 words of each other
4. Preserve the correct answer (don't change which letter is correct)
5. Preserve frontmatter exactly
6. Preserve the explanation (can lightly edit if a distractor was expanded and now needs clearer justification for why it's wrong)
7. Write the file back

## Length parity principles

- **Target**: all 4 options within ±3 words of each other
- **If correct is too long**: trim trailing clauses ("...and then follow up with the team") rather than gutting the core action
- **If distractors are too short**: add plausible context ("to avoid delay", "while maintaining quality", "before the next milestone") that makes them feel equally considered — not obviously-wrong filler
- **Do NOT make distractors absurd** — they must remain plausible PM actions

## Example — before and after

### BEFORE (correct is 2x longer)
- A: Escalate immediately to the sponsor.
- B: Wait for the issue to resolve itself.
- C: Facilitate a team workshop to identify the root cause, capture findings in the risk register, and agree next actions with the team and key stakeholders.
- D: Ask the team lead to handle it.

### AFTER (parity)
- A: Escalate immediately to the sponsor for a directive.
- B: Wait for the issue to resolve itself through routine operations.
- C: Facilitate a team workshop to identify the root cause and agree next actions.
- D: Ask the team lead to handle it quietly within the team.

## Output format

Same as the original: markdown with frontmatter, `# Question`, `## Options`, `## Answer`, `## Explanation`.

## Quality check before saving

- ✅ Count words in each option. No option is more than ~3 words longer than any other.
- ✅ Correct answer letter is unchanged.
- ✅ All options remain plausible PM actions.
- ✅ Frontmatter is intact.

## Files that need NO change

Some questions already have good length parity (all options within ±3 words). Leave those untouched — just verify and move on.

## Report

At the end, report:
- Total files processed
- Files modified (needed length rebalancing)
- Files left alone (already had parity)
- Any files that failed

Work through the files sequentially. Quality > speed.
