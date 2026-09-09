# Demo: connecting your wallet (Base Sepolia)

1. **Install MetaMask** (browser extension) if you don't have it.

2. **Add the Base Sepolia network** in MetaMask: Settings → Networks → Add network:
   - Network name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Symbol: `ETH`
   - Explorer: `https://sepolia.basescan.org`

3. **Create or select a disposable test-only wallet.** Never paste a seed phrase or private key into Kora, and never use a wallet that holds mainnet funds.

4. **Make sure Base Sepolia is selected** and the wallet you want to authorize is active.

5. **Start the backend** (PowerShell):

   ```powershell
   $env:KORA_OWNER = "0xYOUR_TEST_WALLET_ADDRESS"
   node --experimental-transform-types backend/server.ts
   ```

   Wait until you see `Kora private local API: http://127.0.0.1:4001/approval`.

6. **Start the site** (second terminal):

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:3000` → **Workspace** → **Connect wallet** → approve the signature in MetaMask.

**Success** = the header shows the connected address and the footer shows the persisted account (graph ID `adas-pharmacy`). If the signature prompt does not appear, the API is not running or the wrong network/wallet is selected.
