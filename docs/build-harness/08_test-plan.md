# Test plan

## Objective

Prove deterministic finance, evidence integrity, authorization, contract state, exact repayment, honest receipt reconciliation, and safe public wallet behavior.

## Current coverage

- Unit: graph/hash, skills, policy, chain encoding, public wallet connect/restore/error behavior.
- Integration: HTTP auth/session/account/run/offer, encrypted store, audit chain.
- End-to-end local: private EVM facility deployment, funding, draw, repayment.
- Adversarial: duplicate/stale/modified evidence, duplicate finance, wrong wallet/chain/signature, replay, expired offers, unauthorized preparation, excessive repayment, tampered storage/audit.

## Network gates

| Environment | Status |
|---|---|
| Public browser demo | VERIFIED |
| Local Node/SQLite | VERIFIED |
| Private EVM | VERIFIED |
| Base Sepolia | UNVERIFIED |
| Mainnet | NOT IMPLEMENTED |

## Verification

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:vercel
```

Expected: lint/typecheck/build exit 0 and 82 tests pass. Vercel runs this gate automatically through `vercel-build` and refuses the release if any step fails.

## Gaps

- P0: public Base Sepolia end-to-end receipt/reconciliation test.
- P1: browser wallet-extension end-to-end test and recorded clean production dependency audit.
- P2: performance/recovery testing and multi-tenant isolation tests.
