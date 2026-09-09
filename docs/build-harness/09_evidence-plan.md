# Evidence plan

## Claim map

| Claim | Evidence | Location | Status |
|---|---|---|---|
| Financial conclusions are reproducible | Skill/run tests and structured fields | backend tests | VERIFIED |
| Policy blocks unsafe actions | Adversarial test results | backend tests | VERIFIED |
| Contract lifecycle works | Private-chain EVM test | `chain.evm.test.ts` | VERIFIED — LOCAL |
| Base executes financing | Explorer-verified deployment/register/draw | `evidence/transactions/` | MISSING — P0 |
| Repayment updates history | Repay receipt + graph before/after | `evidence/receipts/` | MISSING — P0 |
| Public app is reachable | Vercel deployment URL and HTTP 200 smoke response | https://kora-weld-two.vercel.app | VERIFIED |

## Required machine-readable bundle

`evidence/transactions/base-sepolia-deployment.json`, `register.json`, `draw.json`, `repay.json`, and `evidence/receipts/graph-before-after.json`. Each must be generated from actual RPC data and include chain ID, block, hash, contract, and explorer URL where applicable.

## Verify it yourself

Run the commands in `08_test-plan.md`. For testnet evidence, compare every stored hash/address/block with BaseScan and the Base Sepolia RPC; do not accept screenshots alone.
