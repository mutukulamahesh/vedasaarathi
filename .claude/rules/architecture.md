# Architecture rules

- Keep UI, application, domain, and infrastructure responsibilities separate.
- Put domain decisions behind explicit interfaces.
- Do not call external services directly from presentation code.
- Record architectural decisions in `docs/adr/` when a choice has lasting cross-module impact.
