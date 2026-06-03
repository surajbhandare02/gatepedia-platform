# Security Policy

## Supported Versions

Currently, only the `main` branch (v1.0.0+) is supported with security updates.

## Reporting a Vulnerability

We take the security of Gatepedia seriously. 

If you discover a security vulnerability, please **do not open a public issue.** Instead, please send an email directly to the repository maintainer. 

We will respond within 48 hours to acknowledge the report and provide an estimated timeline for a patch. Once the vulnerability is resolved, we will publish a security advisory.

### Scope
We are particularly interested in reports concerning:
- Authentication bypass or broken JWT validation.
- SQL injection (despite the use of Prisma).
- Cross-Site Scripting (XSS).
- Cross-Site Request Forgery (CSRF).
- Rate Limit bypasses.
