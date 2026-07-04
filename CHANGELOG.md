# Changelog

## 0.9.0

- Migrated backend data access from Prisma to direct Supabase access through `@supabase/supabase-js`.
- Added Supabase SQL core schema migration with transactional RPC functions.
- Replaced Supabase Storage S3 presigning with Supabase Storage signed upload URLs.
- Removed Prisma schema, migration scripts, and package scripts.

## 0.8.0

- Approved Supabase as Pacta's backend platform.
- Added Supabase Postgres environment configuration and Prisma `DIRECT_URL` support.
- Switched evidence storage integration to support Supabase Storage S3-compatible signed uploads.
- Added Supabase setup automation, storage bucket migration, and deployment documentation.

## 0.7.0

- Added the authenticated Pacta frontend workflow for wallet login, dashboard, covenant creation, evidence, bond registration, evaluation requests, and reputation profiles.
- Added StudioNet-safe GenLayer chain configuration for backend and frontend adapters.
- Added CSRF protection, global API rate limiting, request ids, and backend tests.
- Added local runtime automation for PostgreSQL, Prisma migrations, and dev server startup.

## 0.6.0

- Wired deployed StudioNet contract address `0x6a7d7807612a5485e83E53c776fcfe35fE685C59` through Pacta configuration.
- Added backend GenLayer module for contract reads and event synchronization.
- Added frontend GenLayer client utilities for read and wallet-signed write flows.
- Updated API and deployment documentation for post-deployment integration.

## 0.5.1

- Rewrote the Pacta GenLayer contract with schema-friendly public signatures.
- Replaced dataclass/list public read surfaces with JSON string reads.
- Added static tests guarding against schema-hostile contract patterns.

## 0.5.0

- Added the production-oriented Pacta GenLayer Intelligent Contract.
- Renamed the contract file to `pacta_covenant_registry.py`.
- Added contract API documentation, StudioNet deployment instructions, and static contract tests.
- Added persistent event-log sync design for backend integration.

## 0.4.0

- Added bond position APIs for submitted GEN bond transactions.
- Added covenant evaluation request transition.
- Added internal contract-event ingestion with idempotent event storage.
- Added reputation profile read model.
- Added internal API token configuration.

## 0.3.0

- Renamed the project to Pacta.
- Marked backend hosting as requiring explicit user approval.
- Added R2-compatible evidence upload URL generation.
- Added evidence metadata registration and listing endpoints.
- Added storage and evidence NestJS modules.

## 0.2.0

- Added NestJS database, audit, users, auth, and covenants modules.
- Implemented wallet nonce generation, signature verification, server-side sessions, and logout.
- Added first authenticated covenant creation and read APIs.
- Added initial Prisma migration SQL.
- Updated API, database, and security documentation.

## 0.1.0

- Initial production-grade repository scaffold.
- Added architecture, PRD, database, security, deployment, and testing documentation.
- Added frontend, backend, contract, database, shared, monitoring, infra, and CI foundations.
