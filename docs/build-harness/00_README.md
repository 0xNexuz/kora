# Kora Build Harness

Source of truth for release and Base Batches 004 readiness. A capability is complete only when implementation, invariant, test, evidence, and execution status agree.

## Current readiness

- Overall: **READY TO SUBMIT AS AN HONESTLY LABELED PROTOTYPE**
- Public demo and repository: **95/100**
- Fully verified Base loop: **78/100**
- P0 for a full-loop claim: no verified Base Sepolia deployment/settlement/repayment receipt.
- Conditional P0: no durable hosted Kora API; this is only blocking if the public deployment is claimed to execute the real financing loop.
- P1: no browser wallet-extension end-to-end test; dependency audit needs a recorded clean production result.
- Release gate: every Vercel deployment runs lint, typecheck, all tests, and the production build.
- Verified on 2026-09-10: lint, typecheck, 82 tests, and Vercel production build.
- Verified by: Vercel against commit `dbedd4fcce293992063dbaaccde85f9a6165a3b8`.

The required proof loop is tracked in `07_real-vs-simulated.md`. The public demo must retain its DEMO/SIMULATED labels until RPC-derived Base receipts exist.
