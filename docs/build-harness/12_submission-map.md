# Submission map

## Program

- Base Batches 004 — https://www.base.org/batches
- Organizer: Base Ecosystem Fund.
- Applications: Aug 19–Sep 9, 2026. Closing timezone is **UNVERIFIED**.
- Fit: Base-first early-stage financing and agent infrastructure.
- Offer: selected teams are offered a $100K investment subject to diligence; this is not a guaranteed grant.
- Judging weights: **UNKNOWN**.

## Requirements/evidence

| Item | Status | Evidence/action |
|---|---|---|
| Public repository | VERIFIED | https://github.com/0xNexuz/kora |
| Live app | VERIFIED | https://kora-weld-two.vercel.app |
| Public browser demo | VERIFIED BUILD | Backend-independent workspace; wallet optional and demo-only |
| Full finance loop | PARTIAL | Local API/contract console; public settlement evidence missing |
| Base network deployment | P0 MISSING | Execute Sepolia lifecycle |
| Architecture and security | VERIFIED DOCUMENTED | this harness |
| Application confirmation | UNVERIFIED | founder must submit/confirm |

## Judge path

1. Read the one-line thesis.
2. Open the live UI and inspect the eight-step evidence loop.
3. Run the Ada inventory question and adverse scenarios.
4. Inspect exact recommendation/policy/approval.
5. Inspect Base deployment, draw, repayment, and graph-update evidence.
6. Run `npm run typecheck && npm test && npm run build`.

## Gaps

- P0: verified Base Sepolia lifecycle and updated history evidence.
- P0: durable hosted API if the public deployment is expected to execute the loop.
- P1: concise recorded demo, CI, browser wallet E2E, dependency audit record.
- P2: SDK extraction, performance/recovery testing.
- P3: optional visual polish only after P0/P1.

## Gate

Status: **NOT READY** for a claim of a fully verified Base loop. The application narrative and local mechanism are credible; the exact next action is to fund the authorized test wallet, run the approval console through repayment, and commit RPC-derived evidence.
