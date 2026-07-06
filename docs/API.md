# API Design

## Style

The backend exposes REST endpoints with OpenAPI documentation at `/docs`. API responses use framework-standard HTTP statuses and request logs are correlated through structured logging.

## Implemented Routes

- `GET /health` - health probe.
- `POST /auth/nonce` - create a wallet-auth nonce and sign-in message.
- `POST /auth/verify` - verify wallet signature, create user if needed, and set the session cookie.
- `GET /auth/me` - return the authenticated user.
- `POST /auth/logout` - revoke the current session.
- `POST /covenants` - create a covenant draft.
- `GET /covenants` - list covenants visible to the authenticated user.
- `GET /covenants/:id` - fetch one covenant if the user can view it.
- `POST /covenants/:id/submit-evaluation` - mark a covenant as ready for GenLayer evaluation after bond and evidence submission.
- `POST /covenants/:covenantId/bonds` - register a submitted GEN bond transaction.
- `GET /covenants/:covenantId/bonds` - list bond positions visible to the authenticated user.
- `POST /covenants/:covenantId/evidence/upload-url` - create a Supabase Storage S3-compatible signed upload URL.
- `POST /covenants/:covenantId/evidence` - register submitted evidence metadata.
- `GET /covenants/:covenantId/evidence` - list evidence visible to the authenticated user.
- `GET /genlayer/config` - return public GenLayer network and contract address.
- `GET /genlayer/contract/covenants/:id` - read a covenant JSON payload from `0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2`.
- `GET /genlayer/contract/events/:eventId` - read an event JSON payload from `0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2`.
- `POST /genlayer/sync-events` - internal StudioNet event polling and PostgreSQL mirroring.
- `POST /contract-events` - ingest trusted contract events using `x-pacta-internal-token`.
- `GET /reputation/:walletAddress` - public reliability profile.

## Authentication

Wallet authentication uses one-time nonces and signed messages. Sessions are stored server-side as SHA-256 token hashes and sent to clients as secure HTTP-only cookies.

## GenLayer

The deployed StudioNet contract address is `0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2`. Backend reads use `genlayer-js`; user writes should be signed in the browser wallet flow.
