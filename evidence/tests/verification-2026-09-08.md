# Verification — 2026-09-08

Environment: Node.js 24.12.0 on Windows.

| Gate | Observed result |
|---|---|
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0 |
| `npm test` | 79 passed, 0 failed |
| `npm run build` | Vinext production build passed |
| `npm run build:vercel` | Next.js 16.3.4 production build passed; root route statically generated |
| Vercel production build | READY; deployment build passed; https://kora-weld-two.vercel.app returned HTTP 200 |

## Public demo update — 2026-09-09

After separating public wallet connection from the restricted operator backend, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build:vercel` all exited 0. All 79 tests passed and Next.js statically generated the root route. Browser-wallet extension interaction remains a manual verification item because no wallet should be scripted with secrets.

These results verify local mechanisms and buildability. They do not verify a Base Sepolia financing lifecycle. No contract address or transaction hash is recorded because no public testnet lifecycle was executed.
