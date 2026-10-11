# Kora Build Harness

Source of truth for release and Colosseum: Crypto World's Fair readiness. A capability is complete only when implementation, invariant, test, evidence, and execution status agree.

## Current readiness

- Overall: **READY TO SUBMIT WITH EMPIRICALLY VERIFIED BASE ONCHAIN LIFECYCLE**
- Weighted Readiness Score: **97.15 / 100** (See [13_readiness-scorecard.md](file:///C:/Users/USER/.gemini/antigravity/scratch/kora/docs/build-harness/13_readiness-scorecard.md))
- Public demo and repository: **98 / 100**
- Fully verified Base onchain loop: **96 / 100**
- Onchain lifecycle: Deployed ([`0xad177afe...`](https://sepolia.basescan.org/address/0xad177afed1593291d872cfe2b3ac984f9cc3febb)), registered, drawn, and repaid on Base Sepolia (`evidence/transactions/base-sepolia-lifecycle.json`).
- Release gate: Lint, typecheck, 97 tests, and production build all pass.
- Verified: 97/97 tests pass, oxlint 0 warnings / 0 errors, Turbopack build succeeds.
- Interactive evaluator suite: Kora CLI (`bin/kora.mjs`), test-drive script (`scripts/test-drive.mjs`), and standalone Developer Kit (`@kora/sdk`).
- Strict UI Preservation: Approved UI (`app/` and `components/`) remains 100% frozen.
