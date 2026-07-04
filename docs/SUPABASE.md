# Supabase Backend

Supabase is the approved backend platform for Pacta. Pacta now uses Supabase directly rather than Prisma.

## Runtime Model

- NestJS remains the application API boundary for wallet sessions, CSRF protection, GenLayer synchronization, audit logging, and authorization.
- Supabase Postgres stores Pacta domain data.
- Supabase Storage stores evidence files.
- `@supabase/supabase-js` is the backend database and storage client.

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

The first migration creates Pacta tables, indexes, update triggers, and transactional RPC functions used by the backend. The second migration creates the private evidence bucket. The third grants the backend service role access to Pacta tables and functions.

## Storage Uploads

The backend creates signed upload URLs with Supabase Storage. S3 access keys are no longer required for the default Pacta storage path.
