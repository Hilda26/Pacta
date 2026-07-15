# Pacta Review Response

## Summary

The review feedback identified a wallet connection failure during sign-in. We investigated the reported error and confirmed that the visible failure was:

```text
Create wallet nonce: TypeError: fetch failed
```

This was not a MetaMask signing failure. It happened before wallet signing, when the Pacta API attempted to create a wallet nonce in Supabase. The app now handles this condition clearly and exposes backend dependency health for easier review/debugging.

## Corrections Made

### 1. Wallet Sign-In Error Handling

- Confirmed the failure occurs in the `/api/auth/nonce` flow.
- Mapped Supabase/network fetch failures to a clear `503 Service Unavailable` response.
- Replaced the raw error message with a user-friendly login message:

```text
Pacta could not reach its Supabase backend, so wallet sign-in cannot create a nonce yet. Please try again after the backend project is active.
```

Files changed:

- `frontend/src/lib/server/supabase.ts`
- `frontend/src/app/login/page.tsx`

### 2. Backend Health Diagnostics

- Expanded `/api/health` so it checks Supabase reachability instead of returning only a static `ok: true`.
- The endpoint now reports dependency status:

```json
{
  "ok": false,
  "service": "pacta-web-api",
  "dependencies": {
    "supabase": {
      "ok": false,
      "message": "Supabase is unreachable from the Pacta server."
    }
  }
}
```

File changed:

- `frontend/src/app/api/health/route.ts`

### 3. Frontend Visibility Checks

- Verified that required frontend text, forms, and buttons render correctly.
- Added smoke coverage for the login page:
  - `Sign in to Pacta`
  - `Connect wallet`
  - wallet helper text
- Existing smoke coverage also verifies:
  - landing page identity
  - submission page contract/reviewer details

File changed:

- `e2e/tests/smoke.spec.ts`

### 4. Submission Readiness Package

The app already includes a reviewer-facing submission page:

- `/submission`
- live StudioNet contract address
- GenLayer-native explanation
- manual review path
- mentorship covenant framing

The submission page is intended to make the project easier for reviewers to understand quickly.

## Current Contract

Pacta production points to the upgraded GenLayer StudioNet contract:

```text
0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2
```

The live config endpoint reports:

```json
{
  "network": "studionet",
  "contractAddress": "0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2",
  "rpcUrl": "https://studio.genlayer.com/api",
  "rpcUrlConfigured": true
}
```

## Verification Completed

The following checks passed after the corrections:

- Frontend lint
- Frontend typecheck
- Frontend unit tests
- Contract static tests
- Production build
- Live production smoke tests

Live smoke test result:

```text
6 passed
```

Verified production routes:

- `/`
- `/submission`
- `/login`

## Production Deployment

Production app:

```text
https://pacta-protocol.vercel.app
```

Latest deployed Vercel deployment:

```text
dpl_4ru2MH9CDmDGfcr3Tegj2svS8wXe
```

Latest GitHub commit for frontend visibility coverage:

```text
6742ec2 Cover login UI in smoke tests
```

Latest GitHub commit for wallet-login backend error handling:

```text
9af326b Handle Supabase outages during wallet login
```

## Reviewer Retest Instructions

1. Open `https://pacta-protocol.vercel.app`.
2. Open `https://pacta-protocol.vercel.app/submission`.
3. Confirm the StudioNet contract address is visible.
4. Open `/login`.
5. Confirm the wallet sign-in UI is visible.
6. Connect an EVM wallet.
7. If backend connectivity is unavailable, the app should now show a clear backend availability message instead of the raw nonce/fetch error.

## Final Note

The reported error has been fixed at the application layer by correctly identifying and handling the backend nonce creation failure. If Supabase is unavailable or the Supabase project URL is unreachable, wallet sign-in cannot complete because Pacta needs the backend to create the nonce before the wallet signs it. The app now reports that condition clearly and exposes it through `/api/health`.
