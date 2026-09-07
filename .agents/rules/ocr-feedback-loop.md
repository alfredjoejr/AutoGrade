# AutoGrade Enterprise OCR & Human-in-the-Loop Architecture

## 1. 3-Tier Feedback Flywheel Architecture
All OCR and grading pipelines in AutoGrade must adhere to the following three tiers:
- **Tier 1 (Runtime Few-Shot)**: Every manual correction made in the Moderation View or Master Key Inspector is saved to the PostgreSQL `teacher_corrections` table and fed dynamically into subsequent Gemini API calls as few-shot ground truth.
- **Tier 2 (Admin Curation & Benchmark Evals)**: The corrections log is exposed in the Admin Dashboard for review, filtering, and automated accuracy regression testing.
- **Tier 3 (Supervised Fine-Tuning Pipeline)**: Provide a one-click export to formatted JSONL compatible with Google AI Studio / Vertex AI Tuning API (`ai.tunings.create()`).

## 2. Vision OCR Invariants & Prompting Guidelines
When constructing prompts for `/api/extract-key` and `/api/grade`:
1. **Printed Number Matching**: Always instruct the vision model to match by the physical printed question number label (`1.`, `2.`, ... `N.`), NEVER by row index alone.
2. **Duplicate Line Consolidation**: If a printed row number is repeated (e.g. print typo where `19.` appears twice), consolidate them into that single question number; do not allow offset drift.
3. **Multi-Mark Ambiguity**: When a question has multiple marks (e.g. both A and C ticked), evaluate primary vs faint marks, default to the primary mark, and set confidence to ~70% to trigger human review.
4. **Mark Formats**: Explicitly support checkmarks `✓`, handwritten/typed letters inside boxes (e.g. `[A]`), filled bubbles, and circled letters.
5. **Defensive Parsing**: Always parse returned IDs with `parseInt(String(id).replace(/\D/g, ''), 10)` to guard against string prefixes like `"Q23"`.
