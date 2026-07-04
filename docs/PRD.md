# Product Requirements Document: Pacta

## Vision

Pacta transforms promises into verifiable digital covenants. Users economically back commitments with GEN-token bonds and build a portable reliability history over time.

## Goals

- Let users create, bond, evidence, adjudicate, and archive covenants.
- Use GenLayer Intelligent Contracts for ambiguous evidence evaluation.
- Produce a credible reliability score based on completed covenant outcomes.
- Support public and private covenant visibility models.

## Users

- Covenant creators
- Counterparties
- Witnesses
- Co-stakers
- Public reputation viewers
- Platform operators

## Functional Requirements

1. Wallet authentication using signed nonces.
2. Covenant creation with promise, success criteria, deadline, evidence rules, privacy, dispute parameters, witnesses, counterparties, and metadata.
3. GEN-token bond registration through GenLayer StudioNet integration.
4. Evidence submission for files, URLs, GitHub commits, payment receipts, attestations, API responses, photos, videos, social proofs, and structured metadata.
5. Validator evaluation through one GenLayer Intelligent Contract.
6. Outcome recording as fulfilled, partially fulfilled, or broken.
7. Bond distribution tracking.
8. Reliability score updates and covenant history.

## Non-Functional Requirements

- Security-first wallet authentication.
- Strong input validation and audit logging.
- WCAG 2.1 AA target.
- Observable backend services with logs, metrics, and traces.
- Extensible evidence ingestion architecture.
- Database indexes for deadline, status, wallet address, and contract-event queries.

## Risks

- Prompt injection from user-submitted evidence.
- Ambiguous evidence leading to disputed outcomes.
- External API availability during validation.
- User misunderstanding of bond slashing.
- Privacy leakage through public evidence metadata.

## Success Metrics

- Covenant creation conversion rate.
- Evidence submission completion rate.
- Median adjudication time.
- Fulfilled covenant ratio.
- Repeat covenant creation rate.
- Public reputation profile views.
