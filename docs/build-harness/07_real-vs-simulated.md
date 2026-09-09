# Real vs simulated

## Required loop truth table

| Step | Status | Evidence | Missing proof |
|---|---|---|---|
| Business Data | SIMULATED | Ada's Pharmacy fixture and record hashes | Real connector/customer data |
| Understand | REAL — LOCAL | Deterministic cash-flow skills; tests | Hosted run artifact |
| Simulate | REAL — LOCAL | Baseline/adverse forecasts; tests | Hosted execution evidence |
| Decide | REAL — LOCAL | Structured recommendation and policy tests | Real business validation |
| Finance | REAL — LOCAL / PARTIAL | Offer/approval/contract private-chain lifecycle | Real lender capital and public agreement |
| Base Settlement | IMPLEMENTED, UNVERIFIED | Base Sepolia transaction preparation and verifier | Contract address and explorer transactions |
| Repay | REAL — LOCAL / UNVERIFIED TESTNET | Private-chain repayment test | Base Sepolia repayment receipt |
| Updated Business History | PARTIAL | Reconciliation code increments graph and stores receipt-linked performance | Public testnet end-to-end evidence |

## UI and README accuracy

The public UI labels fictional figures as sample/demo data and does not imply a financing offer or completed Base settlement. The browser demo is backend-independent and wallet-optional. Its wallet control reads only the visitor's public address and chain; it does not request a signature or transaction. A verified transaction may be labeled REAL — TESTNET only after the repository stores its chain ID, contract, transaction hash, block, and explorer URL.

Public visitor wallet connection: **REAL — BROWSER / DEMO-ONLY**. Production build verified; interactive wallet-extension E2E remains UNVERIFIED.

## P0

Execute and capture the Base Sepolia agreement lifecycle, then reconcile the repayment into graph version 2+.
