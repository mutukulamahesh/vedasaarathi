# Coding Rules

- Use TypeScript with strict, explicit types.
- Keep user-facing sentences short, clear, and understandable to a first-time user.
- Explain traditional terms in plain language when they first appear.
- Reuse existing components and dependencies before adding new packages.
- Keep components focused and move reusable domain data out of page components.
- Handle loading, empty, error, and saved-progress states.
- Maintain keyboard navigation, readable contrast, and accessible labels.
- Never hide errors by inserting invented religious or calendar data.

## General practice (carried over from main)

- Prefer clear, small functions and explicit names over clever abstractions.
- Preserve public contracts unless a change is intentional and documented.
- Make units, timezones, locales, and nullable values explicit.
- Use structured parsers and domain types instead of ad hoc string processing.
- Keep changes focused and update documentation when behavior or assumptions change.
