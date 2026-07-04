# Architecture

## Overview

Pacta is a production-oriented monorepo with a Next.js frontend, NestJS API, Supabase Postgres, Supabase Storage evidence uploads, and one GenLayer Intelligent Contract deployed to StudioNet.

```mermaid
flowchart LR
  User[User Wallet] --> Frontend[Next.js Frontend]
  Frontend --> Backend[NestJS API]
  Frontend --> GenLayerJS[GenLayer JS SDK]
  Backend --> Postgres[(Supabase Postgres)]
  Backend --> Storage[Supabase Storage]
  Backend --> Workers[Background Workers]
  Backend --> Observability[Sentry and OpenTelemetry]
  GenLayerJS --> Contract[Pacta Covenant Registry]
  Backend --> Contract
  Contract --> Validators[GenLayer Validators and LLM Consensus]
  Validators --> Contract
```

## GenLayer Design

The single contract, `PactaCovenantRegistry`, handles covenant registration, payable GEN bond intake, evidence reference recording, AI-assisted evaluation, canonical outcome storage, bond claim accounting, protocol slash accounting, reputation score deltas, and an event log for backend synchronization.

External web reads and LLM calls happen only inside nondeterministic blocks. Deterministic storage writes happen only after consensus returns.

## Request Flow

1. Client requests a wallet nonce.
2. User signs the nonce.
3. Backend verifies the signature and starts a session.
4. User creates a covenant record through the REST API and contract.
5. User bonds GEN through the GenLayer contract.
6. Evidence is uploaded to Supabase Storage and evidence references are registered on-chain.
7. Evaluation is requested through the Intelligent Contract.
8. GenLayer validators evaluate covenant terms, evidence references, and public web context.
9. Contract stores the canonical outcome and bond claim accounting.
10. Backend syncs contract events and updates off-chain read models.
