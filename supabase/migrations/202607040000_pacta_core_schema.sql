create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_nonces (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  nonce text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.covenants (
  id uuid primary key default gen_random_uuid(),
  contract_covenant_id text unique,
  creator_id uuid not null references public.users(id),
  title text not null check (char_length(title) between 3 and 120),
  promise text not null,
  success_criteria text not null,
  evidence_requirements text not null,
  deadline_at timestamptz not null,
  privacy text not null default 'PRIVATE' check (privacy in ('PRIVATE', 'UNLISTED', 'PUBLIC')),
  status text not null default 'DRAFT' check (
    status in (
      'DRAFT',
      'BONDED',
      'ACTIVE',
      'EVIDENCE_SUBMITTED',
      'EVALUATION_PENDING',
      'FULFILLED',
      'PARTIALLY_FULFILLED',
      'BROKEN',
      'CANCELLED'
    )
  ),
  required_bond_amount numeric(30, 10) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.covenant_participants (
  id uuid primary key default gen_random_uuid(),
  covenant_id uuid not null references public.covenants(id) on delete cascade,
  wallet_address text not null,
  role text not null,
  created_at timestamptz not null default now(),
  unique (covenant_id, wallet_address, role)
);

create table if not exists public.bond_positions (
  id uuid primary key default gen_random_uuid(),
  covenant_id uuid not null references public.covenants(id) on delete cascade,
  user_id uuid not null references public.users(id),
  amount numeric(30, 10) not null,
  status text not null default 'PENDING',
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  covenant_id uuid not null references public.covenants(id) on delete cascade,
  type text not null check (
    type in (
      'DOCUMENT',
      'GITHUB_COMMIT',
      'PAYMENT_RECEIPT',
      'PHOTO',
      'VIDEO',
      'API_RESPONSE',
      'ATTESTATION',
      'IOT_DEVICE_DATA',
      'SOCIAL_PROOF',
      'URL',
      'STRUCTURED_METADATA'
    )
  ),
  storage_uri text,
  source_url text,
  content_hash text not null,
  structured_metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  covenant_id uuid not null references public.covenants(id) on delete cascade,
  outcome text not null,
  confidence integer not null check (confidence between 0 and 100),
  reasoning jsonb not null,
  bond_distribution jsonb not null,
  reputation_impact jsonb not null,
  contract_tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  event_type text not null,
  delta integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  tx_hash text not null,
  log_index integer not null,
  event_name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_covenants_updated_at on public.covenants;
create trigger set_covenants_updated_at before update on public.covenants
for each row execute function public.set_updated_at();

create index if not exists wallet_nonces_wallet_address_expires_at_idx on public.wallet_nonces(wallet_address, expires_at);
create index if not exists sessions_user_id_expires_at_idx on public.sessions(user_id, expires_at);
create index if not exists covenants_creator_id_created_at_idx on public.covenants(creator_id, created_at);
create index if not exists covenants_status_deadline_at_idx on public.covenants(status, deadline_at);
create index if not exists covenant_participants_wallet_address_idx on public.covenant_participants(wallet_address);
create index if not exists bond_positions_covenant_id_status_idx on public.bond_positions(covenant_id, status);
create index if not exists evidence_items_covenant_id_type_idx on public.evidence_items(covenant_id, type);
create index if not exists evaluations_covenant_id_created_at_idx on public.evaluations(covenant_id, created_at);
create index if not exists reputation_events_user_id_created_at_idx on public.reputation_events(user_id, created_at);
create index if not exists audit_logs_actor_id_created_at_idx on public.audit_logs(actor_id, created_at);

create or replace function public.pacta_consume_wallet_nonce_and_create_session(
  p_nonce_id uuid,
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wallet_nonces
  set consumed_at = now()
  where id = p_nonce_id and consumed_at is null and expires_at > now();

  if not found then
    raise exception 'wallet nonce is expired or already consumed';
  end if;

  insert into public.sessions (user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at);
end;
$$;

create or replace function public.pacta_create_covenant_with_creator(
  p_creator_id uuid,
  p_wallet_address text,
  p_title text,
  p_promise text,
  p_success_criteria text,
  p_evidence_requirements text,
  p_deadline_at timestamptz,
  p_privacy text,
  p_required_bond_amount numeric,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_covenant_id uuid;
begin
  insert into public.covenants (
    creator_id,
    title,
    promise,
    success_criteria,
    evidence_requirements,
    deadline_at,
    privacy,
    required_bond_amount,
    metadata
  )
  values (
    p_creator_id,
    p_title,
    p_promise,
    p_success_criteria,
    p_evidence_requirements,
    p_deadline_at,
    p_privacy,
    p_required_bond_amount,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_covenant_id;

  insert into public.covenant_participants (covenant_id, wallet_address, role)
  values (v_covenant_id, p_wallet_address, 'CREATOR')
  on conflict (covenant_id, wallet_address, role) do nothing;

  return v_covenant_id;
end;
$$;

create or replace function public.pacta_create_evidence_item(
  p_covenant_id uuid,
  p_type text,
  p_storage_uri text,
  p_source_url text,
  p_content_hash text,
  p_structured_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evidence_id uuid;
begin
  insert into public.evidence_items (
    covenant_id,
    type,
    storage_uri,
    source_url,
    content_hash,
    structured_metadata,
    verification_status
  )
  values (
    p_covenant_id,
    p_type,
    p_storage_uri,
    p_source_url,
    p_content_hash,
    coalesce(p_structured_metadata, '{}'::jsonb),
    'SUBMITTED'
  )
  returning id into v_evidence_id;

  update public.covenants
  set status = 'EVIDENCE_SUBMITTED'
  where id = p_covenant_id;

  return v_evidence_id;
end;
$$;

create or replace function public.pacta_register_bond_position(
  p_covenant_id uuid,
  p_user_id uuid,
  p_wallet_address text,
  p_amount numeric,
  p_tx_hash text,
  p_role text,
  p_contract_covenant_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bond_id uuid;
begin
  insert into public.bond_positions (covenant_id, user_id, amount, status, tx_hash)
  values (p_covenant_id, p_user_id, p_amount, 'SUBMITTED', p_tx_hash)
  returning id into v_bond_id;

  insert into public.covenant_participants (covenant_id, wallet_address, role)
  values (p_covenant_id, p_wallet_address, p_role)
  on conflict (covenant_id, wallet_address, role) do nothing;

  update public.covenants
  set status = 'BONDED',
      contract_covenant_id = coalesce(p_contract_covenant_id, contract_covenant_id)
  where id = p_covenant_id;

  return v_bond_id;
end;
$$;

create or replace function public.pacta_apply_bond_confirmed(
  p_bond_position_id uuid,
  p_covenant_id uuid,
  p_contract_covenant_id text,
  p_tx_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bond_positions
  set status = 'CONFIRMED', tx_hash = p_tx_hash
  where id = p_bond_position_id;

  update public.covenants
  set status = 'ACTIVE',
      contract_covenant_id = coalesce(p_contract_covenant_id, contract_covenant_id)
  where id = p_covenant_id;
end;
$$;

create or replace function public.pacta_apply_covenant_evaluated(
  p_covenant_id uuid,
  p_creator_id uuid,
  p_outcome text,
  p_confidence integer,
  p_reasoning jsonb,
  p_bond_distribution jsonb,
  p_reputation_impact jsonb,
  p_contract_tx_hash text,
  p_reputation_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.evaluations (
    covenant_id,
    outcome,
    confidence,
    reasoning,
    bond_distribution,
    reputation_impact,
    contract_tx_hash
  )
  values (
    p_covenant_id,
    p_outcome,
    p_confidence,
    p_reasoning,
    p_bond_distribution,
    p_reputation_impact,
    p_contract_tx_hash
  );

  update public.covenants
  set status = p_outcome
  where id = p_covenant_id;

  insert into public.reputation_events (user_id, event_type, delta, metadata)
  values (
    p_creator_id,
    'COVENANT_' || p_outcome,
    p_reputation_delta,
    jsonb_build_object('covenantId', p_covenant_id, 'confidence', p_confidence, 'txHash', p_contract_tx_hash)
  );
end;
$$;
