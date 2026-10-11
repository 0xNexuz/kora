# Submission map

## Program

- Colosseum: Crypto World's Fair — https://colosseum.com/
- Organizer: Colosseum.
- Dates: September 14 – October 12, 2026 (Global Online Hackathon).
- Multichain Scope: Cross-ecosystem hackathon with dedicated tracks including Base Sponsor Track, AI, and Payments/DeFi.
- Offer: $800K+ in track prizes, $2.5M+ venture funding, and all winning teams interviewed for the $250K Colosseum Accelerator.
- Primary Track: Base Ecosystem Track / Payments & Commerce / AI Solutions.
- Judging Focus: Business viability, product execution & working MVP, team composition, presentation & pitch deck, onchain integration.

## Requirements/evidence

| Item | Status | Evidence/action |
|---|---|---|
| Public repository | VERIFIED | https://github.com/0xNexuz/kora |
| Live app | VERIFIED | https://kora-weld-two.vercel.app |
| Public browser demo | VERIFIED | Backend-independent workspace; wallet optional and demo-only |
| Release gate | VERIFIED | Lint + typecheck + 82 tests + production build on every Vercel deployment |
| Full finance loop | VERIFIED TESTNET | Deployed, registered, drawn, and repaid on Base Sepolia (`evidence/transactions/base-sepolia-lifecycle.json`) |
| Base network deployment | VERIFIED TESTNET | Deployed to Base Sepolia at `0xad177afed1593291d872cfe2b3ac984f9cc3febb` (`evidence/transactions/base-sepolia-deployment.json`) |
| Architecture and security | VERIFIED DOCUMENTED | this harness |
| Application confirmation | UNVERIFIED | founder must submit/confirm |

## Judge path

1. Read the one-line thesis.
2. Open the live UI and inspect the eight-step evidence loop.
3. Run the Ada inventory question and adverse scenarios.
4. Inspect exact recommendation/policy/approval.
5. Inspect the clearly labeled Base execution boundary.
6. Verify onchain BaseScan deployment and lifecycle transaction receipts.
7. Review the repository evidence and automated Vercel release result.

## Gaps

- P1: concise recorded demo video (<3 min) for Colosseum submission.
- P1: hosted backend deployment on Cloudflare/Render if public interactive loop without local Node server is desired.
- P2: SDK extraction, performance/recovery testing.

## Gate

Status: **READY TO SUBMIT WITH VERIFIED BASE ONCHAIN LIFECYCLE**. The contract deployment, terms registration, drawdown, and repayment have been executed and verified on Base Sepolia with confirmed block numbers and hashes. All tests and linters pass 100%.
