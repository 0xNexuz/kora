# Test plan

## Objective

Prove deterministic finance, evidence integrity, authorization, contract state, exact repayment, honest receipt reconciliation, adversarial resilience, and safe public wallet behavior.

## Current coverage

- **Unit**: graph/hash, deterministic skills (12 skills), policy engine, chain encoding, public wallet connect/restore/error behavior.
- **Integration**: HTTP auth/session/account/run/offer, encrypted store, audit chain, CLI runner.
- **End-to-end local EVM**: private EVM facility deployment, funding, draw, partial & full repayment.
- **Base Sepolia Onchain**: contract deployment (`0xad17...`), allowance, facility registration, drawdown, repayment, receipt verification (`evidence/transactions/base-sepolia-lifecycle.json`).
- **Adversarial (28 vectors)**: duplicate/stale/modified evidence, duplicate finance, wrong wallet/chain/signature, replay, expired offers, unauthorized preparation, excessive repayment, zero repayment, contract authorization bypass (unauthorized register/draw), token transfer failures, chain reorg detection, tampered storage/audit, idempotent reconciliation.
- **SDK**: standalone SDK client (`@kora/sdk`), AI Agent tool schemas (OpenAI, Anthropic, LangChain), runnable agent underwriting example.

## Network gates

| Environment | Status | Proof |
|---|---|---|
| Public browser demo | VERIFIED | `https://kora-weld-two.vercel.app` (Read-only + simulated connect) |
| Local Node/SQLite | VERIFIED | 97/97 tests pass (`npm test`) |
| Private EVM | VERIFIED | Ganache in-memory automated lifecycle & adversarial tests |
| Base Sepolia (84532) | VERIFIED | Contract `0xad177afed1593291d872cfe2b3ac984f9cc3febb`, Block 47772811 |
| Mainnet | NOT IMPLEMENTED | By design (Hackathon testnet scope only) |

## Verification Gates

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:vercel
```

All gates pass cleanly with exit code 0:
- `npm run lint`: 0 warnings, 0 errors across 104 files.
- `npm run typecheck`: 0 TypeScript errors across backend and SDK.
- `npm test`: 97 tests passing (0 failures).
- `npm run build:vercel`: Next.js 16.3.4 Turbopack build succeeds with static prerendering.
