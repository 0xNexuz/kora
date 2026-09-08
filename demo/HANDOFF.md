# Demo: connecting your wallet (Base Sepolia)

1. **Install MetaMask** (browser extension) if you don't have it.

2. **Add the Base Sepolia network** in MetaMask: Settings → Networks → Add network:
   - Network name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Symbol: `ETH`
   - Explorer: `https://sepolia.basescan.org`

3. **Import the demo wallet**: MetaMask logo → **Import account**, paste this private key:
   `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

   > Testnet only — never send real funds to this wallet.

4. **Make sure Base Sepolia is the selected network** in MetaMask (the demo wallet must be active).

5. **Start the backend** (PowerShell):

   ```powershell
   $env:KORA_OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
   node --experimental-transform-types backend/server.ts
   ```

   Wait until you see `Kora private local API: http://127.0.0.1:4001/approval`.

6. **Start the site** (second terminal):

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:3000` → **Workspace** → **Connect wallet** → approve the signature in MetaMask.

**Success** = the header flips to `0xf39F…2266` and the footer shows the persisted account (graph ID `adas-pharmacy`, version 1, runs 0). If the signature prompt doesn't appear, the API isn't running or the wrong network/wallet is selected.