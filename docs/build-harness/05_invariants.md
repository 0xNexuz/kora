# Invariants

| ID | Invariant | Enforcement | Test/evidence | Status |
|---|---|---|---|---|
| INV-001 | Financial values come from typed deterministic skills, not model prose | Skill allowlist and validated inputs | `skills.test.ts` | VERIFIED |
| INV-002 | A run is bound to the exact graph, question, and policy | Canonical hashes and recomputation | `policy.test.ts` | VERIFIED |
| INV-003 | Stale, modified, duplicate, or unsupported evidence fails closed | Graph validator | `domain.test.ts` | VERIFIED |
| INV-004 | Sensitive actions require the configured wallet, chain, live offer, and human signature | Auth and policy engine | `server.test.ts`, `service.test.ts` | VERIFIED — LOCAL |
| INV-005 | One obligation/business cannot receive duplicate active financing | Store transaction and contract mappings | service/EVM tests | VERIFIED — LOCAL |
| INV-006 | Repayment cannot exceed principal plus fee | Backend and contract checks | chain/EVM tests | VERIFIED — LOCAL |
| INV-007 | History changes only after a supported canonical receipt | Receipt verifier and atomic reconciliation | verifier tests; public receipt absent | PARTIAL |
| INV-008 | Raw private business records are never written onchain | Contract accepts salted commitments only | Contract ABI/source review | VERIFIED |

Untested critical invariant: end-to-end Base Sepolia deployment → draw → repayment → graph update is **UNVERIFIED**.
