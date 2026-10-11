# Invariants

| ID | Invariant | Enforcement | Test/evidence | Status |
|---|---|---|---|---|
| INV-001 | Financial values come from typed deterministic skills, not model prose | Skill allowlist and validated inputs | `skills.test.ts`, `@kora/sdk` | VERIFIED |
| INV-002 | A run is bound to the exact graph, question, and policy | Canonical hashes and recomputation | `policy.test.ts`, `@kora/sdk` | VERIFIED |
| INV-003 | Stale, modified, duplicate, or unsupported evidence fails closed | Graph validator | `domain.test.ts`, `adversarial.test.ts` | VERIFIED |
| INV-004 | Sensitive actions require the configured wallet, chain, live offer, and human signature | Auth and policy engine | `server.test.ts`, `service.test.ts`, `adversarial.test.ts` | VERIFIED |
| INV-005 | One obligation/business cannot receive duplicate active financing | Store transaction and contract mappings | `service.test.ts`, `adversarial.test.ts`, `KoraFacility.sol` | VERIFIED |
| INV-006 | Repayment cannot exceed principal plus fee | Backend and contract checks | `chain.test.ts`, `adversarial.test.ts`, `KoraFacility.sol` | VERIFIED |
| INV-007 | History changes only after a supported canonical receipt | Receipt verifier and atomic reconciliation | `chain.ts`, `service.ts`, `adversarial.test.ts`, `evidence/transactions/base-sepolia-lifecycle.json` | VERIFIED |
| INV-008 | Raw private business records are never written onchain | Contract accepts salted commitments only | Contract ABI/source review, `policy.ts`, `@kora/sdk` | VERIFIED |
| INV-009 | Contract authorization boundary: only owner/lender can register facilities, only borrower can draw and repay | `onlyLender` modifier, `msg.sender == agreement.borrower` | `KoraFacility.sol`, `adversarial.test.ts` | VERIFIED |
| INV-010 | Reconciliation is idempotent and immune to replay or concurrent duplicate updates | Service store deduplication and atomic verification | `service.ts`, `adversarial.test.ts` | VERIFIED |

All critical invariants are VERIFIED empirically on private EVM and Base Sepolia testnet (`0xad177afed1593291d872cfe2b3ac984f9cc3febb`).
