# Threat Model

## Primary Assets

- User wallet sessions
- Covenant terms and private evidence
- Evidence storage objects
- Contract interaction keys and configuration
- Reputation history

## Primary Threats

- Replay attacks against wallet login
- Unauthorized evidence access
- Prompt injection in evidence and witness statements
- Malicious file uploads
- Contract event replay or duplicate processing
- Rate-limit bypass during auth and upload flows

## Initial Controls

- Single-use expiring nonces
- HTTP-only secure session cookies
- Signed upload URLs
- Content hashing
- Strict validation schemas
- Idempotent event sync
- Audit logs for sensitive actions
