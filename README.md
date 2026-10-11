# Kora

> **From fragments to flow.**  
> The AI financial operating system for African businesses, built toward settlement on Base.

[Open the live demo](https://kora-weld-two.vercel.app) · [How to test the app](./docs/TESTING.md) · [Explore the evidence harness](./docs/build-harness/00_README.md) · [Review the smart contract](./contracts/KoraFacility.sol)

Kora turns fragmented bank inflows, POS activity, invoices, supplier obligations, expenses, stablecoin payments and repayment history into traceable financial intelligence, safer operations and contextual access to working capital.

Kora is not a generic accounting dashboard, trading product or AI loan generator. Its core is a permissioned **Business Financial Graph** and a continuously updated **Financial Twin**.

## The proof loop

```text
Business Data
    ↓
Understand
    ↓
Simulate
    ↓
Decide
    ↓
Finance
    ↓
Base Settlement
    ↓
Repay
    ↓
Updated Business History
```

The initial scenario follows the fictional **Ada's Pharmacy**:

1. Kora observes cash, invoices, supplier payments and upcoming obligations.
2. Deterministic financial skills identify a temporary liquidity gap.
3. Baseline and adverse scenarios test late receivables and weaker sales.
4. Kora recommends using existing cash plus a smaller facility.
5. Policy checks decide whether the action is eligible and whether approval is required.
6. The contract interface prepares Base Sepolia settlement.
7. Repayment is verified and reconciled.
8. Verified performance updates the Business Graph.

## Try the public demo

Open [kora-weld-two.vercel.app](https://kora-weld-two.vercel.app).

- No account, backend or wallet is required.
- Open **Workspace** to inspect Ada's fictional business state.
- Ask Kora whether the inventory order is affordable.
- Review assumptions, calculations, scenarios, evidence references and policy status.
- Mark the demo invoice paid and observe the receivables/history update.
- Optionally connect any injected browser wallet. The public demo only reads its public address and chain ID—it does not request a signature, submit a transaction or move funds.

Demo changes are browser-session state and do not represent a real customer or traction.

## What is real?

| Capability | Status | Meaning |
|---|---|---|
| Landing page and animated Kora hero | **REAL** | Production frontend deployed on Vercel |
| Public financial workspace | **DEMO** | Fully interactive, browser-local experience |
| Ada's Pharmacy records and projections | **SIMULATED** | Fictional Nigerian SME data |
| Business Graph and Financial Twin model | **REAL — LOCAL** | Implemented with an encrypted local SQLite store |
| Twelve typed financial skills | **REAL — LOCAL** | Deterministic tools with structured evidence |
| Policy, approval and authorization controls | **REAL — LOCAL** | Implemented and adversarially tested |
| KoraFacility Solidity contract | **DEPLOYED & VERIFIED** | Deployed on Base Sepolia at [`0xad177afed1593291d872cfe2b3ac984f9cc3febb`](https://sepolia.basescan.org/address/0xad177afed1593291d872cfe2b3ac984f9cc3febb) |
| Base Sepolia lifecycle | **REAL — TESTNET** | Terms registered, principal drawn, and USDC repaid with verified RPC receipts |
| Live accounting/payment connectors | **PLANNED** | Not represented as available |

### Verified Base Sepolia Settlement Proofs

| Lifecycle Step | Transaction Hash | Block | Status |
|---|---|---|---|
| **Contract Deployment** | [`0xe21235d2...`](https://sepolia.basescan.org/tx/0xe21235d2f9f99ed6a4a06d2333833b5e0f9a7ced44950159423affdea55b5cc0) | `47772811` | Confirmed |
| **Agreement Registration** | [`0xac810af6...`](https://sepolia.basescan.org/tx/0xac810af60bf10fa548af82d3565bf0981da2dd328ff4e1d111d1d3b51a43ce13) | `47773316` | Confirmed |
| **Principal Drawdown** | [`0x665b5623...`](https://sepolia.basescan.org/tx/0x665b56237a78caacec1c8396dece4969de5732972851d58e54e7d85a6a6329e3) | `47773317` | Confirmed |
| **Full Repayment (USDC)** | [`0xfea6ac39...`](https://sepolia.basescan.org/tx/0xfea6ac39d6b73f8ec657e6ebf918a87b91b87bb5cf6c877baf0bcac7877b2c04) | `47773321` | Confirmed |

Receipt data is recorded in `evidence/transactions/base-sepolia-lifecycle.json`.

## Architecture

```text
Private business records
        ↓
Kora Business Graph
        ↓
Financial skills + orchestration
        ↓
Scenario engine
        ↓
Evidence-backed recommendation
        ↓
Policy and human approval
        ↓
KoraFacility on Base
        ↓
Verified settlement receipt
        ↓
Graph history update
```

Sensitive bank, POS, invoice, supplier and underwriting data stays offchain. Base is reserved for programmable agreement state, USDC settlement, drawdowns, repayments and appropriate cryptographic commitments.

The control boundary is explicit:

```text
AI interprets
→ deterministic engines calculate
→ policies authorize
→ humans approve sensitive actions
→ the system executes
→ evidence is stored
```

## Financial skills

Kora currently implements isolated, typed capabilities for:

- cash-flow analysis
- cash-flow forecasting
- scenario analysis
- receivables analysis
- invoice analysis
- supplier analysis
- reconciliation
- working-capital analysis
- treasury monitoring
- obligation analysis
- repayment analysis
- financial reporting

The agent orchestrates these skills. Financial values are calculated by deterministic code, not invented inside an LLM prompt.

## Verification

Kora uses Node.js 24.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:vercel
```

Verified on **2026-09-10**:

- lint passed
- typecheck passed
- **82 tests passed**
- Vercel production build passed

Every Vercel deployment runs the same release gate through `vercel-build` and fails closed if a check fails.

Coverage includes duplicate financing, duplicate invoices, invoice modification, stale or unsupported evidence, replay attacks, expired offers, unauthorized execution, wrong wallet, wrong chain, signature modification, excessive or duplicate repayment, policy bypass, agent authorization boundaries and tampered evidence.

## Local development

```sh
npm ci
npm run dev
```

Frontend: `http://localhost:3000`

To run the experimental local API and operator console:

```sh
node scripts/compile-contracts.mjs
node --experimental-transform-types backend/server.ts
```

Operator console: `http://localhost:4001/approval`

The operator flow requires a browser wallet on Base Sepolia (chain ID `84532`). Never paste a seed phrase or private key into Kora, and never use mainnet funds for the demo.

## Repository map

| Path | Purpose |
|---|---|
| `app/`, `components/`, `public/` | Product frontend, workspace and visual system |
| `backend/` | Graph, skills, simulations, evidence, policy, approval and reconciliation |
| `sdk/` | **Kora Developer Kit (`@kora/sdk`)**: Decoupled underwriting engine, AI agent tool adapters, and Base client |
| `examples/` | Standalone runnable agent scripts (`examples/agent-underwriting.ts`) |
| `contracts/` | KoraFacility and local TestUSDC test double |
| `demo/` | Fictional Ada's Pharmacy scenario |
| `docs/build-harness/` | Threat model, invariants, evidence truth table and submission audit |
| `evidence/tests/` | Generated local verification artifacts |
| `design/mascot-concepts/` | Archived Kora mascot concepts |
| `scripts/` | Contract compilation and deployment utilities |

## Developer Kit (`@kora/sdk`)

Kora exports a decoupled, framework-agnostic developer kit for autonomous AI agents, fintech underwriters, and web3 developers:

- **12 Deterministic Financial Skills**: Pure arithmetic engine for daily cash ladders, stress scenarios, and working capital buffers with zero LLM math hallucinations.
- **Blinded Privacy Commitments**: Salted SHA-256 commitments (`business`, `obligation`, `evidence`) binding onchain contracts to offchain verified evidence without leaking sensitive balance sheet data.
- **Base Sepolia EVM Facility Client**: Typed viem wrapper for agreement registration, drawdowns, and repayment verification.
- **AI Agent Tool Adapters**: Pre-formatted tool definitions and execution dispatchers compatible with OpenAI Function Calling, Anthropic Claude Tool Use, LangChain, and Eliza.

See the [SDK Documentation](./sdk/README.md) and [Runnable Agent Example](./examples/agent-underwriting.ts).

## Deployment

Import [github.com/0xNexuz/kora](https://github.com/0xNexuz/kora) into Vercel and keep the detected Next.js settings.

The public browser demo needs no environment variables. Only set `NEXT_PUBLIC_KORA_API_URL` when a separately hosted and allowlisted Kora API exists. Never configure a public deployment to call `localhost`.

## Security and evidence

- Private business data and detailed underwriting inputs remain offchain.
- Sensitive financial actions require policy authorization and human approval.
- Runtime data and encryption keys live under `.local/`, which is Git-ignored.
- No seed phrases, private keys or customer records belong in this repository.
- Demo values are clearly labeled.
- Transaction hashes must come from verified receipts.
- The local same-wallet facility flow demonstrates mechanics, not third-party financing.

See the [threat model](./docs/build-harness/04_threat-model.md), [real-versus-simulated register](./docs/build-harness/07_real-vs-simulated.md), [test plan](./docs/build-harness/08_test-plan.md) and [submission map](./docs/build-harness/12_submission-map.md).

## Current readiness

- **Public demo and repository:** ready to submit
- **Production financial service:** not claimed
- **Fully verified Base loop:** pending a signed Base Sepolia deployment, draw, repayment and RPC-derived evidence

Kora's thesis is simple: understand how a business is performing, help it make and execute better financial decisions, and turn verified performance into access to capital.
