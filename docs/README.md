# VedaSaarathi documentation

Read these in order. Each has one job. Where two disagree, the more specific one
wins for its scope, and the broader one is corrected.

| Document | What it is |
| --- | --- |
| [VISION.md](./VISION.md) | The complete long-term platform direction. Canonical. |
| [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md) | Short rules used for everyday product, content, design, and engineering decisions. |
| [VINAYAKA_V1_SCOPE.md](./VINAYAKA_V1_SCOPE.md) | The current pilot contract: what ships, what does not, the two milestones, and when each is ready. Written early; where it disagrees with PRODUCT_DETAILS.md, PRODUCT_DETAILS.md reflects what's actually shipped. |
| [PRODUCT_DETAILS.md](./PRODUCT_DETAILS.md) | What's in the app today, coverage and limitations, AI/audio/review status, privacy, and third-party ownership. The detail behind the top-level `README.md`. |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Setup, testing, build identification and rollback, and project structure. The detail behind the top-level `README.md`'s "For developers" section. |
| [../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) | The dated execution plan, task status, and backlog. |

Enforced engineering and content rules live in
[`../.claude/rules/`](../.claude/rules/) (`architecture.md`, `coding.md`,
`sacred-content.md`, `security.md`, `testing.md`). A rule there overrides a
principle here.

There is one vision file: `VISION.md`. The earlier `VEDASAARATHI_VISION.md` was
merged into it and removed.
