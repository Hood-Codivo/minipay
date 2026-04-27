# LinkRail

LinkRail is a standalone MiniPay-friendly merchant payments MVP for Celo.

It lets a merchant:

- create a shareable checkout link for `USDm`, `USDC`, or `USDT`
- open that link inside MiniPay for a wallet-native payment flow
- optionally publish the invoice to a lightweight Celo registry contract
- keep local payment receipts and explorer links for demos and submissions

## Project layout

- `app/`: Next.js routes and pages
- `components/`: UI building blocks and checkout flows
- `hooks/`: MiniPay wallet detection and connection logic
- `lib/`: Celo helpers, invoice storage, encoding, and formatting
- `contracts/`: Solidity source for `MiniPayCheckoutRegistry`
- `scripts/`: frontend build helper plus contract compile and deploy scripts

## Run locally

1. Install dependencies.

   ```bash
   npm install
   ```

2. Copy the env template.

   ```bash
   Copy-Item .env.example .env.local
   ```

   Add a strong `CHECKOUT_SIGNING_SECRET` value before generating share links.

3. Start the app.

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Useful routes

- `/`: landing page
- `/create`: invoice builder
- `/checkout`: payment page
- `/dashboard`: merchant dashboard
- `/history`: local payment receipts
- `/registry`: Celo contract notes and submission checklist

## Contract workflow

Compile the registry contract:

```bash
npm run compile:celo-contract
```

Deploy the registry contract:

```bash
$env:CELO_NETWORK="mainnet"
$env:CELO_RPC_URL="https://forno.celo.org"
$env:CELO_DEPLOYER_PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
npm run deploy:celo-contract
```

You can also copy `.env.deploy.example` into your shell or secret manager for deployment-only values.

After deployment:

1. copy the deployed contract address
2. set `NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS` in `.env.local`
3. restart the frontend
4. publish an invoice from `/create`

## Build check

```bash
npm run build
```

## Notes

- The contract intentionally stores invoice and settlement references instead of verifying token transfers onchain. That keeps the MVP simple enough for a fast MiniPay shipping flow while still giving you a real Celo deployment for submission.
- Signed checkout links now require `CHECKOUT_SIGNING_SECRET`, and registry receipts can only be finalized by the merchant wallet that created the invoice.
- For a production version, you would likely add backend persistence, merchant auth, stronger reconciliation, and contract-level transfer verification or escrow.
