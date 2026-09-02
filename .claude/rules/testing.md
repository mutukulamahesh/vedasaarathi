# Testing rules

- Test domain logic independently from network, storage, and UI dependencies.
- Add regression tests for every corrected calculation or content-handling defect.
- Include Panchanga boundary cases for timezone, location, sunrise, and date transitions.
- Test provenance, uncertainty, and tradition-specific variants in user-facing outputs.
- Keep tests deterministic by fixing clocks, provider versions, and fixtures.
