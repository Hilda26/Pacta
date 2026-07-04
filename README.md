# Pacta

Pacta is a bond-backed personal covenant registry powered by GenLayer. Users create meaningful promises, back them with GEN stakes, submit evidence, and rely on GenLayer Intelligent Contracts plus AI-assisted validator consensus to determine fulfillment outcomes.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: NestJS API with direct Supabase access
- Database: Supabase Postgres with SQL migrations
- Contracts: GenLayer Intelligent Contract deployed to StudioNet
- Storage: Supabase Storage signed upload URLs
- Auth: Wallet authentication with signed nonce sessions
- Observability: Sentry, OpenTelemetry, structured logs
- CI/CD: GitHub Actions

## Repository Layout

- `frontend/` - Next.js user experience
- `backend/` - NestJS REST API and workers
- `contracts/` - GenLayer Intelligent Contract source and tests
- `supabase/` - Supabase SQL migrations
- `database/` - migration validation scripts
- `shared/` - shared schemas and TypeScript types
- `docs/` - product, architecture, API, database, security, deployment, and testing docs
- `scripts/` - executable project automation
- `infra/` - local infrastructure configuration
- `monitoring/` - observability configuration
- `security/` - threat model and security checklists
- `e2e/` - Playwright flows
- `tests/` - cross-package integration tests
