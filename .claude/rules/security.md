# Security Rules

- Collect only information required for the requested feature.
- Ask before using device location and always provide manual location entry.
- Do not expose personal, location, family, or tradition details in logs or URLs.
- Treat participant and family profile information as private data.
- Validate all user-controlled input at client and server boundaries.
- Never commit credentials, API keys, tokens, private contact details, or environment files.
- Keep secrets in approved environment-variable storage.
- Use least-privilege access for databases and external services.
- Do not send user or sacred-source data to an external AI service without explicit approval.

## Additional safeguards (carried over from main)

- Treat coordinates, timezone, account details, and saved preferences as sensitive data.
- State why each piece of data is needed when collecting it.
- Keep secrets out of source, logs, fixtures, and generated documentation.
- Review generated content and external source ingestion for prompt injection and unsafe instructions.
