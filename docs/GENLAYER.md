# GenLayer Integration

## Deployed Contract

- Network: StudioNet
- Address: `0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2`
- Contract file: `contracts/pacta_covenant_registry.py`

## SDK Integration

Pacta uses the current `genlayer-js` SDK patterns:

- `createClient({ chain, account })`
- `client.readContract({ address, functionName, args })`
- `client.writeContract({ address, functionName, args, value })`
- `client.waitForTransactionReceipt({ hash, status })`

Server-side reads are isolated in `frontend/src/lib/server/genlayer`. Browser wallet writes are isolated in `frontend/src/lib/genlayer`.

## Write Flow

The covenant detail page now submits real StudioNet transactions before updating Supabase read models:

- `create_covenant` links the Supabase covenant ID to the Intelligent Contract covenant ID.
- `bond_covenant` is payable in GEN wei and stores the returned transaction hash on the bond position.
- `submit_evidence` submits evidence references on-chain and stores the returned transaction hash in evidence metadata.
- `request_evaluation` starts GenLayer validator evaluation and stores the returned transaction hash in covenant metadata.

The frontend uses `client.connect("studionet")`, `writeContract`, and `waitForTransactionReceipt` with `TransactionStatus.ACCEPTED`.

## Event Sync

The contract exposes:

- `get_event_count()`
- `get_event(event_id)`

Production contract state reads are exposed through Next.js API routes under `/api/genlayer`.

## Environment

```bash
GENLAYER_NETWORK=studionet
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_CONTRACT_ADDRESS=0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2
```

Supabase is approved for Pacta backend data and storage. The Vercel-hosted Next.js API routes are the server boundary.

## Submission-Grade Consensus Path

The upgraded contract evaluation path is intentionally narrow and reviewer-facing:

1. `request_evaluation` collects the covenant terms and up to 20 evidence records.
2. It extracts up to 3 public `http/https` evidence URLs.
3. Inside the nondeterministic block, the leader fetches those URLs with `gl.nondet.web.get()` and asks the LLM for a structured assessment.
4. Validators independently run the same fetch-and-assess workflow, then compare their normalized result with the leader through `_assessments_agree`.
5. Deterministic bond settlement, reputation updates, and event emission happen only after GenLayer consensus returns.

The canonical assessment now records `independent_sources_count`, `fetched_url_count`, `cross_check_summary`, `risk_flags`, and `source_checks` so reviewers can see whether the result came from real external evidence or weak self-attestation.
