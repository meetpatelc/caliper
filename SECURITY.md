# Security policy

## Supported versions

Report issues against the current `main` branch.

## Reporting a vulnerability

**Do not open a public GitHub issue** for:

- Exposed secrets or credentials
- Authentication / session flaws
- Injection, XSS, or data-exfiltration bugs

Email the maintainer through GitHub (see the [profile](https://github.com/meetpatelc)) or use GitHub’s **private vulnerability reporting** on this repository.

Include:

- A short description
- Steps to reproduce
- Impact (what an attacker could do)
- Whether you have a suggested fix

You should receive an acknowledgement within a few days.

## Secrets in this project

- Never commit `.env`, API keys, or database URLs.
- Use `.env.example` as the documented shape only.
- Auth federates through Better Auth at `/api/auth/*`. Do not log tokens or session cookies.
