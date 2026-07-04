# Database

Pacta uses Supabase Postgres directly through `@supabase/supabase-js`.

## Migrations

SQL migrations live in `supabase/migrations` and should be applied in filename order.

- `202607040000_pacta_core_schema.sql` creates domain tables, indexes, triggers, and RPC functions.
- `202607040001_pacta_storage_bucket.sql` creates the private evidence bucket.

## Tables

- `users`
- `wallet_nonces`
- `sessions`
- `covenants`
- `covenant_participants`
- `bond_positions`
- `evidence_items`
- `evaluations`
- `reputation_events`
- `contract_events`
- `audit_logs`

## Transactional RPC Functions

Pacta uses Postgres functions for multi-write operations that must stay atomic:

- `pacta_consume_wallet_nonce_and_create_session`
- `pacta_create_covenant_with_creator`
- `pacta_create_evidence_item`
- `pacta_register_bond_position`
- `pacta_apply_bond_confirmed`
- `pacta_apply_covenant_evaluated`
