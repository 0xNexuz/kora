# Kora Build Harness

Source of truth for release and Base Batches 004 readiness. A capability is complete only when implementation, invariant, test, evidence, and execution status agree.

## Current readiness

- Overall: **PARTIAL**
- Conservative score: **72/100**
- P0: no verified Base Sepolia deployment/settlement/repayment receipt; hosted frontend has no durable hosted Kora API.
- P1: no browser end-to-end wallet test, no CI workflow, dependency audit needs a recorded clean production result.
- Verified locally on 2026-09-08: typecheck, 79 tests, production build.
- Verified by: Codex against commit `d9b997c` before this audit update.

The required proof loop is tracked in `07_real-vs-simulated.md`.
