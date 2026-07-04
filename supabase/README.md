# Supabase

Supabase is Pacta's backend platform.

Apply migrations in this order:

1. `migrations/202607040000_pacta_core_schema.sql`
2. `migrations/202607040001_pacta_storage_bucket.sql`
3. `migrations/202607040002_service_role_grants.sql`

The backend uses the service role key with `@supabase/supabase-js` for server-side database access and signed evidence upload URLs.
