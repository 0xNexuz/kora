# Real vs simulated

## Required loop truth table

| Step | Status | Evidence | Missing proof |
|---|---|---|---|
| Business Data | SIMULATED | Ada's Pharmacy fixture and record hashes | Real connector/customer data |
| Understand | REAL — LOCAL | Deterministic cash-flow skills; tests | Hosted run artifact |
| Simulate | REAL — LOCAL | Baseline/adverse forecasts; tests | Hosted execution evidence |
| Decide | REAL — LOCAL | Structured recommendation and policy tests | Real business validation |
| Finance | REAL — LOCAL / PARTIAL | Offer/approval/contract private-chain lifecycle | Real lender capital and public agreement |
| Base Settlement | REAL — TESTNET | KoraFacility deployed at `0xad177afed1593291d872cfe2b3ac984f9cc3febb`; terms registered (`0xac810af6...`); principal drawn (`0x665b5623...`) | None |
| Repay | REAL — TESTNET | Repayment confirmed onchain (tx: `0xfea6ac39d6b73f8ec657e6ebf918a87b91b87bb5cf6c877baf0bcac7877b2c04`, block: 47773321) | None |
| Updated Business History | REAL — TESTNET | Lifecycle complete and stored in `evidence/transactions/base-sepolia-lifecycle.json` | None |

## UI and README accuracy

The public UI labels fictional figures as sample/demo data and does not imply a financing offer or completed Base settlement. The browser demo is backend-independent and wallet-optional. Its wallet control reads only the visitor's public address and chain; it does not request a signature or transaction. A verified transaction may be labeled REAL — TESTNET only after the repository stores its chain ID, contract, transaction hash, block, and explorer URL.

Public visitor wallet connection: **REAL — BROWSER / DEMO-ONLY**. Production build verified; interactive wallet-extension E2E remains UNVERIFIED.

## P0

Base Sepolia deployment, agreement registration, draw, and repayment lifecycle are **COMPLETE and VERIFIED ONCHAIN**. All RPC-derived receipts are recorded in `evidence/transactions/`.
