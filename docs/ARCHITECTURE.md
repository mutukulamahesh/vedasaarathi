# Architecture

## Boundaries

- **Experience layer:** web or client interfaces, localization, accessibility, and user preferences.
- **Application layer:** use cases such as knowledge search, explanation, and Panchanga queries.
- **Domain layer:** source-aware dharma concepts and deterministic calendrical calculations.
- **Infrastructure layer:** databases, search indexes, ephemeris providers, observability, and external integrations.

The experience layer must not implement domain calculations. External providers are accessed through explicit adapters so that domain behavior remains testable.

## Cross-cutting requirements

- Store source and revision metadata with knowledge content.
- Make location, timezone, calendar, ayanamsa, and calculation-version inputs explicit.
- Keep audit-friendly records for generated results without retaining unnecessary personal data.
- Prefer small, composable modules with clear contracts.

## Decision records

Architectural decisions that affect multiple boundaries belong in `docs/adr/`.
