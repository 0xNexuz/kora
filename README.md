# Kora

From fragments to flow. The AI financial operating system for African businesses, built toward Base settlement.

Kora connects business activity into a private Business Graph, uses deterministic financial skills to analyze cash flow and simulate decisions, and prepares contextual working-capital actions with explicit human approval.

## Development snapshot

This repository contains work in progress, not a production financial service.

- **DEMO:** Existing landing page and workspace use fictional business data. The workspace now also offers an optional, explicitly labeled wallet sign-in ("Connect wallet") that exercises the local API — challenge, EIP-191 signature, session and a persisted demo account. It degrades to the in-browser demo if the local API is offline.
- **IMPLEMENTED, verification pending:** Local encrypted SQLite store, financial graph, twelve financial skills, scenario analysis, evidence-backed recommendations, policy checks, approval API and wallet signing console.
- **SIMULATED:** Ada's Pharmacy cash flows, sales assumptions, financing need and NGN/USDC conversion assumptions. No real customer or traction is represented.
- **IMPLEMENTED, not deployed:** Solidity financing contract and Base Sepolia transaction preparation/receipt verification. No real testnet deployment, financing or repayment is claimed by this snapshot.
- **PLANNED:** Full end-to-end integration, automated security suite, production authorization/key management, live business connectors and hosted backend.
- **HERO IMPLEMENTED:** Three floating Kora mascots replace the original portrait, with desktop pointer parallax, independent animation timing, pause controls and reduced-motion support. Original concepts are archived under `design/mascot-concepts`.

The frontend built successfully before the latest backend additions. The combined snapshot has not yet passed a complete build, typecheck or security audit. Dependency audit findings remain to be triaged.

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

### Workspace wallet sign-in demo

The landing page's "Connect wallet" button proves the backend round trip (challenge → wallet signature → session → persisted `/v1/account`). The page reads the expected owner and chain from the challenge response, so any `KORA_OWNER` works.

1. Import a demo wallet into your browser wallet (e.g. MetaMask) and add Base Sepolia (chain ID `84532`, RPC `https://sepolia.base.org`).
2. Start the backend with that wallet as owner:

   ```powershell
   $env:KORA_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
   node --experimental-transform-types backend/server.ts
   ```

   Demo wallet private key (Anvil key #0 — testnet only, never add funds): `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
3. `npm run dev`, open the workspace and click "Connect wallet". Select the demo wallet in the signature prompt. The header flips to the connected address and the footnote shows the persisted account counts. Use your own address instead by setting `KORA_OWNER` to it.

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
