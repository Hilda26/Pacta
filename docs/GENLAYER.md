# GenLayer Integration

## Deployed Contract

- Network: StudioNet
- Address: `0x6a7d7807612a5485e83E53c776fcfe35fE685C59`
- Contract file: `contracts/pacta_covenant_registry.py`

## SDK Integration

Pacta uses the current `genlayer-js` SDK patterns:

- `createClient({ chain, account })`
- `client.readContract({ address, functionName, args })`
- `client.writeContract({ address, functionName, args, value })`
- `client.waitForTransactionReceipt({ hash, status })`

Backend reads and event synchronization are isolated in `backend/src/modules/genlayer`. Browser wallet writes are isolated in `frontend/src/lib/genlayer`.

## Event Sync

The contract exposes:

- `get_event_count()`
- `get_event(event_id)`

The backend internal endpoint `POST /genlayer/sync-events` polls those views and mirrors events into PostgreSQL through the contract-event ingestion service. It requires `x-pacta-internal-token`.

## Environment

```bash
GENLAYER_NETWORK=studionet
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_CONTRACT_ADDRESS=0x6a7d7807612a5485e83E53c776fcfe35fE685C59
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x6a7d7807612a5485e83E53c776fcfe35fE685C59
```

Supabase is approved for Pacta backend data and storage. The NestJS application API remains the server boundary unless we explicitly migrate endpoints to Supabase Edge Functions.
