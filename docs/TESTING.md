# Testing Strategy

## Layers

- Unit tests for validation, domain services, and reputation scoring.
- Integration tests for REST endpoints and database behavior.
- Contract tests for Intelligent Contract lifecycle behavior where GenLayer tooling supports it.
- E2E tests for wallet auth, covenant creation, evidence submission, and evaluation status.
- Security tests for replay protection, authorization boundaries, rate limits, and file upload validation.

## Required CI Checks

- Typecheck
- Lint
- Unit tests
- Integration tests
- Build
- E2E smoke tests when browser dependencies are available

## Current Automated Coverage

- Static GenLayer contract checks guard schema-safe contract patterns.
- Backend Jest tests cover CSRF enforcement and Pacta contract event ingestion.
- TypeScript builds verify frontend, backend, shared, and database packages.
