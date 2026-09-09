# Architecture

## System thesis

Kora keeps detailed business records offchain, validates them into a Business Graph, runs deterministic financial skills, and lets policy-approved human actions reach a financing contract. Verified receipts are reconciled into the graph; the LLM is an orchestrator, not the calculator or signer.

## Components

| Component | Responsibility | Trust |
|---|---|---|
| Frontend | Explain the product and request wallet ownership | User-controlled |
| Local API | Authentication, orchestration, policy, receipts | Operator-controlled; REAL — LOCAL |
| Business Graph store | Encrypted demo records and audit chain | Private/local |
| Financial skills | Deterministic forecast, scenario, obligation, capital analysis | Tested code |
| Policy engine | Freshness, duplicate, amount, approval, wallet and chain gates | Tested code |
| KoraFacility | Agreement, escrow, draw, repayment state | Network-enforced when deployed |
| Base Sepolia RPC | Transaction and receipt verification | External/network |

## Core loop

```mermaid
flowchart LR
  A[Business Data] --> B[Understand]
  B --> C[Simulate]
  C --> D[Decide]
  D --> E[Finance]
  E --> F[Base Settlement]
  F --> G[Repay]
  G --> H[Updated Business History]
```

## Critical flow

1. Validate Ada's Pharmacy demo records and evidence hashes.
2. Run typed skills and baseline/adverse forecasts.
3. Return a recommendation with inputs, assumptions, calculations, risks, confidence, and approval requirement.
4. Issue exact terms only when policy passes.
5. Human wallet signs terms and each financial transaction.
6. Verify confirmed Base receipts, contract address, sender, calldata, events, block hash, and chain.
7. Reconcile repayment into graph history and increment graph version.

Expected failure: fail closed with a machine-readable error; never create placeholder chain evidence.

## Onchain/offchain boundary

| Data | Location | Reason |
|---|---|---|
| Bank/POS/invoice/supplier detail | Offchain | Sensitive business data |
| Forecasts and underwriting inputs | Offchain | Private, explainable computation |
| Agreement commitments and USDC lifecycle | Base | Programmable and publicly verifiable |
| Receipt-linked repayment history | Offchain derived from Base | Useful graph state without publishing raw records |

## State model

`PROPOSED → APPROVED → REGISTERED → DRAWN → REPAID`

## Failure paths

- API/store unavailable: frontend degrades to a clearly labeled browser demo; no financial action.
- Wrong wallet/chain/signature: reject.
- Stale/modified evidence or expired offer: reject.
- RPC unavailable or insufficient confirmations: preserve transaction hash and do not reconcile.
- Contract revert: no state advance.

## Scaling constraints

SQLite and a single local operator are prototype constraints. A hosted multi-tenant store, managed keys, job recovery, monitoring, and production compliance controls are PLANNED.
