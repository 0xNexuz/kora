# Kora

From fragments to flow. The AI financial operating system for African businesses, built toward Base settlement.

Kora connects business activity into a private Business Graph, uses deterministic financial skills to analyze cash flow and simulate decisions, and prepares contextual working-capital actions with explicit human approval.

Live frontend: https://kora-weld-two.vercel.app

## Development snapshot

This repository contains work in progress, not a production financial service.

- **PUBLIC DEMO:** The landing page and interactive workspace use fictional business data and work entirely in the browser. No account, backend or wallet is required. Any visitor with an injected browser wallet can optionally connect it; the public demo does not request a signature, submit a transaction or move funds.
- **VERIFIED — LOCAL:** Local encrypted SQLite store, financial graph, twelve financial skills, scenario analysis, evidence-backed recommendations, policy checks, approval API and wallet signing console. On 2026-09-10, lint, typecheck, 82 tests and the Vercel production build passed.
- **SIMULATED:** Ada's Pharmacy cash flows, sales assumptions, financing need and NGN/USDC conversion assumptions. No real customer or traction is represented.
- **IMPLEMENTED, not deployed:** Solidity financing contract and Base Sepolia transaction preparation/receipt verification. No real testnet deployment, financing or repayment is claimed by this snapshot.
- **PLANNED:** Public testnet evidence, production authorization/key management, live business connectors and a durable hosted backend.
- **HERO IMPLEMENTED:** Three floating Kora mascots replace the original portrait, with desktop pointer parallax, independent animation timing, pause controls and reduced-motion support. Original concepts are archived under `design/mascot-concepts`.

The full truth table and release audit live in `docs/build-harness/`. A public Base Sepolia settlement and repayment receipt remain required before Kora can claim a verified testnet loop.

## Local development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Frontend: http://localhost:3000

The experimental local backend can be started separately:

```sh
node scripts/compile-contracts.mjs
node --experimental-transform-types backend/server.ts
```

Backend/signing console: http://localhost:4001/approval

The signing console requires a connected browser wallet on Base Sepolia (chain ID 84532). The development policy currently restricts authorization to `0x7034aF41397893321c4458ABB3B98F6c67065FaB`. Do not use mainnet funds. The current same-wallet lender/borrower flow is a self-funded testnet demonstration, not third-party financing.

### Public workspace and wallet connection

Open the workspace and use Overview, Invoices and Suppliers immediately. Ask Kora for the rule-backed insight, mark the fictional invoice paid and watch the sample receivables update. These changes last only for the browser session.

The optional **Connect wallet** control accepts any account exposed by an injected browser wallet. It only reads the selected public address and current chain so visitors can see how wallet-aware Kora will feel. A wallet on any chain can connect to the public simulation; Base Sepolia is shown by name when chain ID `84532` is selected. Wallets remain controlled by their wallet application, and clearing the wallet in Kora does not disconnect the extension globally.

The restricted challenge/signature flow and real transaction preparation remain in the separate local operator console at `http://localhost:4001/approval`. To exercise that path, start the backend with a disposable test-only public address in `KORA_OWNER`, use Base Sepolia and never paste a seed phrase or private key into Kora. It is not part of the public visitor demo.

### Vercel deployment

Import `https://github.com/0xNexuz/kora` into Vercel, keep the detected Next.js settings and deploy. Every Vercel release is gated on linting, type checks, the full test suite and the production build. No environment variable is required for the public browser demo. Only set `NEXT_PUBLIC_KORA_API_URL` when a separately hosted, allowlisted Kora backend exists; do not point a public deployment at `localhost`.

## Structure

- `app/`, `components/`, `public/`: existing frontend and hero work.
- `backend/`: graph, deterministic skills, run artifacts, policy, approval and reconciliation interfaces.
- `contracts/`: KoraFacility and a local-only TestUSDC test double.
- `scripts/`: contract compilation.
- `design/`: generated mascot concepts and prompts.

## Safety and evidence

Private records and underwriting inputs stay offchain. Intended onchain state consists of agreements, USDC settlement, repayments and salted evidence commitments. Transaction hashes must come from verified receipts, never placeholders.

Local runtime data and encryption keys are stored in `.local/`, which is excluded from Git. The local key arrangement is not production key management. Never commit environment secrets, private keys, seed phrases or customer data. The LLM must not calculate financial values or directly execute wallet actions.

## Team workflow

Clone this repository, install dependencies, create a feature branch and open a pull request. Preserve the approved UI unless a task explicitly changes it. Keep demo, simulated, implemented and verified capabilities clearly distinguished in code and documentation.
