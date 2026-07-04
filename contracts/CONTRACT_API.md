# Pacta Covenant Registry Contract API

This contract uses schema-friendly public signatures. Complex values are returned as JSON strings so GenLayer Studio can load the contract schema reliably.

## Write Methods

- `create_covenant(covenant_id, promise, success_criteria, evidence_requirements, deadline_unix, privacy, dispute_window_seconds, metadata_hash) -> None`
- `bond_covenant(covenant_id, role) -> u64` payable in GEN wei
- `submit_evidence(covenant_id, evidence_type, uri, content_hash, metadata_hash) -> u64`
- `request_evaluation(covenant_id) -> str`
- `claim_bond(bond_id) -> u256`
- `claim_protocol_slash(recipient, amount) -> None` admin-only

## View Methods

- `get_covenant(covenant_id) -> str`
- `get_bond(bond_id) -> str`
- `get_evidence(evidence_id) -> str`
- `get_event(event_id) -> str`
- `get_event_count() -> u64`
- `get_reputation(account) -> i32`
- `get_protocol_slashed_balance() -> u256`
- `contract_balance() -> u256`

## JSON Reads

The JSON-returning views are intentionally used instead of dataclass/list returns. This follows the conservative schema-loading pattern from the GenLayer docs and Skills examples.
