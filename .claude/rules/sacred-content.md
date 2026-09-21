# Sacred Content Rules

- Never generate, rewrite, complete, or correct a canonical mantra from model memory.
- Never invent Gotra, Pravara, Veda, Shakha, Sutra, Sampradaya, lineage, ritual rule, festival observance rule, or textual citation.
- Preserve UNKNOWN and UNSURE values. Do not infer them from surname, caste, region, language, or location.
- Every mantra and material ritual claim requires source, source location/reference, tradition, language/script, reviewer, review date, and content version metadata.
- Keep canonical text separate from pronunciation, translation, explanation, and AI-generated assistance.
- Label content as VERIFIED, PRIEST_REVIEWED_PRACTICE, REGIONAL_CUSTOM, or REVIEW_REQUIRED.
- Do not present one regional or family practice as universal Hindu practice.
- Record genuine variants and disagreements instead of silently choosing one.
- Content marked REVIEW_REQUIRED must not appear as approved production guidance.
- For missing materials, show only documented or priest-reviewed alternatives and state the authority level plainly.

## Sourced beta candidates (owner-confirmed product decision)

- `canDisplayAsGuidance()` is NOT weakened. It still means "approved religious guidance" and still returns false for REVIEW_REQUIRED.
- A second, explicit gate `canDisplayAsBetaCandidate()` MAY show unreviewed but sourced content inside an explicitly-labelled beta. A beta candidate may display only when it is intentionally in the beta dataset, has an identified source, an exact PDF page or online section, a content version, and an honest beta status, and is NOT `WITHHELD_FOR_RIGHTS` or `MISSING_SOURCE`.
- A beta candidate is NEVER described as verified or priest-approved. Its review status, provenance, transcription confidence, and reviewer workflow are unchanged.
- Missing, invented, or rights-withheld content stays unavailable. No content in the current Vinayaka beta is unavailable for rights reasons. The Vrata Katha is an original VedaSaarathi retelling in English and Telugu, visible in the guided puja as a `SOURCED_BETA_CANDIDATE` with `REVIEW_REQUIRED` status. It is not priest-approved and is no longer `WITHHELD_FOR_RIGHTS`. Its provenance distinctions stay in force: sections following the Bhagavata Purana are marked sourced, and traditional material with no single citable text is marked traditional. Traditional material is not automatically rights-cleared, and the retelling still requires priest review.
- The Family Beta shows ONE beta notice before the puja; it does not repeat review chips, provenance panels, transcription-confidence warnings, or internal review wording on every step.
- Reviewer mode continues to show source, page, confidence, uncertain-transcription notes, status, provenance, and the review controls (Approve / Correction needed / Not applicable / Comment, JSON export/import). Reviewer decisions never overwrite canonical content.
- A beginner physical action with no reliable source is a minimal literal action derived from the mantra or material, flagged `BETA_ACTION_NEEDS_REVIEW`; elaborate invented gestures are not added.
