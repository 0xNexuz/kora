# Test plan

## Objective

Prove deterministic finance, evidence integrity, authorization, contract state, exact repayment, and honest receipt reconciliation.

## Current coverage

- Unit: graph/hash, skills, policy, chain encoding.
- Integration: HTTP auth/session/account/run/offer, encrypted store, audit chain.
- End-to-end local: private EVM facility deployment, funding, draw, repayment.
- Adversarial: duplicate/stale/modified evidence, duplicate finance, wrong wallet/chain/signature, replay, expired offers, unauthorized preparation, excessive repayment, tampered storage/audit.

## Network gates

| Environment | Status |
|---|---|
| Local Node/SQLite | VERIFIED |
| Private EVM | VERIFIED |
| Base Sepolia | UNVERIFIED |
| Mainnet | NOT IMPLEMENTED |

## Verification

```sh
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

Expected: typecheck/build/lint exit 0 and 79 tests pass.

## Gaps

- P0: public Base Sepolia end-to-end receipt/reconciliation test.
- P1: browser wallet end-to-end test, Vercel smoke test, CI workflow, production dependency audit.
- P2: performance/recovery testing and multi-tenant isolation tests.
