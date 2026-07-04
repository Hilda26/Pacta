# Deployment

## Targets

- Frontend and application API: Vercel
- Backend provider: Supabase
- Database: Supabase Postgres, accessed directly with `@supabase/supabase-js`
- Storage: Supabase Storage
- Application API: Next.js route handlers in `frontend/src/app/api`
- Intelligent Contract: GenLayer Studio / StudioNet

## Supabase Setup

Before first runtime use, run SQL migrations in order:

```text
supabase/migrations/202607040000_pacta_core_schema.sql
supabase/migrations/202607040001_pacta_storage_bucket.sql
supabase/migrations/202607040002_service_role_grants.sql
```

## Local Runtime

```bash
python scripts/run_local_stack.py --start
```

The local script checks environment setup and starts the Next.js app. Local API requests are served from `http://localhost:3000/api`. Database schema application happens through Supabase SQL migrations.

## GenLayer

The Pacta Intelligent Contract is deployed on StudioNet:

```text
0x6a7d7807612a5485e83E53c776fcfe35fE685C59
```

Required GenLayer env:

```bash
GENLAYER_NETWORK=studionet
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_CONTRACT_ADDRESS=0x6a7d7807612a5485e83E53c776fcfe35fE685C59
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x6a7d7807612a5485e83E53c776fcfe35fE685C59
```
