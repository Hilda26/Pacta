# Pacta

Pacta is a bond-backed personal covenant registry powered by GenLayer. Users create meaningful promises, back them with GEN stakes, submit evidence, and rely on GenLayer Intelligent Contracts plus AI-assisted validator consensus to determine fulfillment outcomes.

## Stack

- Web app and API: Next.js, TypeScript, Tailwind CSS, Vercel route handlers
- Backend provider: Supabase Postgres and Supabase Storage
- Database: Supabase Postgres with SQL migrations
- Contracts: GenLayer Intelligent Contract deployed to StudioNet
- Storage: Supabase Storage signed upload URLs
- Auth: Wallet authentication with signed nonce sessions
- Observability: Sentry, OpenTelemetry, structured logs
- CI/CD: GitHub Actions

## Repository Layout

- `frontend/` - Next.js user experience and production API routes
- `backend/` - non-deployed NestJS service source retained for local reference
- `contracts/` - GenLayer Intelligent Contract source and tests
- `supabase/` - Supabase SQL migrations
- `database/` - migration validation scripts
- `shared/` - shared schemas and TypeScript types
- `docs/` - product, architecture, API, database, security, deployment, and testing docs
- `scripts/` - executable project automation
- `infra/` - deployment metadata for approved providers
- `monitoring/` - observability configuration
- `security/` - threat model and security checklists
- `e2e/` - Playwright flows
- `tests/` - cross-package integration tests
