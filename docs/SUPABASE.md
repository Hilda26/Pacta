# Supabase Backend

Supabase is the approved backend provider for Pacta. Pacta uses Supabase directly rather than Prisma.

## Runtime Model

- Next.js route handlers are the production API boundary for wallet sessions, CSRF protection, GenLayer reads, audit logging, and authorization.
- Supabase Postgres stores Pacta domain data.
- Supabase Storage stores evidence files.
- `@supabase/supabase-js` is the server-side database and storage client.

## Required Environment

```bash
BACKEND_PROVIDER=supabase
STORAGE_PROVIDER=supabase
SUPABASE_PROJECT_REF=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=pacta-evidence
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The service role key is server-only. Never expose it through `NEXT_PUBLIC_*`.

## Migrations

Run these SQL files in order in the Supabase SQL editor or via Supabase CLI:

1. `supabase/migrations/202607040000_pacta_core_schema.sql`
2. `supabase/migrations/202607040001_pacta_storage_bucket.sql`
3. `supabase/migrations/202607040002_service_role_grants.sql`

The first migration creates Pacta tables, indexes, update triggers, and transactional RPC functions used by the API. The second migration creates the private evidence bucket. The third grants the service role access to Pacta tables and functions.

## Storage Uploads

The API records Supabase Storage evidence references. S3 access keys are not required for Pacta's default storage path.
