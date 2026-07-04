# Security

## Wallet Authentication

Wallet auth uses nonce-based signatures. Nonces expire quickly, are single-use, and are bound to wallet address and intended domain. Sessions are stored as secure HTTP-only cookies, while the database stores only SHA-256 hashes of session tokens.

## Implemented Controls

- Ethereum address validation on auth inputs.
- Single-use wallet nonces.
- Session token hashing before persistence.
- Secure, HTTP-only, SameSite session cookie.
- Server-side session revocation.
- Audit logs for nonce creation, wallet verification, covenant creation, upload URL creation, evidence registration, bond submission, evaluation requests, and contract event ingestion.
- Helmet security headers.
- Strict DTO validation with unknown-field rejection.
- Internal contract-event ingestion requires `x-pacta-internal-token`.
- Contract-event ingestion is idempotent by transaction hash and log index.

## Evidence Security

- Generate signed upload URLs from backend only.
- Enforce MIME and size policies before issuing upload URLs.
- Store content hashes for tamper evidence.
- Persist storage URIs instead of raw files in PostgreSQL.
- Keep private evidence inaccessible without authorization.
- Malware scanning hooks remain planned before public evidence exposure.

## Prompt Injection Controls

- Separate system adjudication instructions from user evidence.
- Treat all evidence text as untrusted input.
- Require structured validator output.
- Constrain contract-side parsing to expected enums and numeric ranges.
- Prefer evidence hashes and URIs over raw unbounded text where possible.

## Session CSRF Protection

Mutating session-authenticated routes require a `pacta_csrf` cookie and matching `x-pacta-csrf` header. The session cookie remains HTTP-only, while the CSRF cookie is readable by the frontend solely for the double-submit check.

## Rate Limiting

API rate limiting is enabled globally through `@nestjs/throttler`. Configure `RATE_LIMIT_TTL_MS` and `RATE_LIMIT_MAX_REQUESTS` per environment.

## Supabase Secret Handling

`SUPABASE_SERVICE_ROLE_KEY`, Supabase S3 access keys, and database passwords are server-only secrets. They must never be exposed through `NEXT_PUBLIC_*` variables or client bundles. The frontend only receives the public Supabase URL and anon key if future client-side Supabase features require them.
