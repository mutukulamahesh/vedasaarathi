# Architecture Rules

- Keep VedaSaarathi mobile-first and usable on phones, tablets, and desktops.
- Build one complete user journey at a time.
- Keep religious content separate from interface and application logic.
- Store ritual steps, sources, reviewer status, language, and tradition as structured data.
- Location-based dates and times must include timezone and calculation/source metadata.
- Preserve KNOWN, UNKNOWN, and UNSURE as distinct states for every tradition field.
- Do not couple the application to a single festival, language, region, or Sampradaya.
- Prefer simple components and clear data flow over speculative abstractions.

## Layering and decisions (carried over from main)

- Keep UI, application, domain, and infrastructure responsibilities separate.
- Put domain decisions behind explicit interfaces.
- Do not call external services directly from presentation code.
- Record architectural decisions in `docs/adr/` when a choice has lasting cross-module impact.
