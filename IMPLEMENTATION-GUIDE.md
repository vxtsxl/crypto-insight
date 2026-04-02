# Implementation Guide – Crypto Insight

## Prerequisites

- Node.js 18+
- npm 9+

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/vxtsxl/crypto-insight.git
cd crypto-insight

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
crypto-insight/
├── app/
│   ├── coin/
│   │   └── [id]/
│   │       └── page.tsx      ← Coin analysis page (risk, verdict, price zones)
│   ├── globals.css           ← Global styles + custom CSS variables
│   ├── layout.tsx            ← Root layout with metadata
│   └── page.tsx              ← Homepage with trending coins
├── tailwind.config.ts        ← Tailwind v4 configuration
├── postcss.config.mjs        ← PostCSS configuration
├── tsconfig.json             ← TypeScript configuration
├── package.json              ← Dependencies
├── ALGORITHM-LOGIC.md        ← Risk/verdict algorithm documentation
└── IMPLEMENTATION-GUIDE.md   ← This file
```

---

## Key Pages

### Homepage (`/`)
- Trending coins from CoinGecko (revalidated every 60 seconds)
- Features banner and How-It-Works sections
- Quick coin reference links

### Coin Analysis (`/coin/[id]`)
Replace `[id]` with any CoinGecko coin ID:

| Coin | URL |
|---|---|
| Bitcoin | `/coin/bitcoin` |
| Ethereum | `/coin/ethereum` |
| Solana | `/coin/solana` |
| BNB | `/coin/binancecoin` |
| PEPE | `/coin/pepe` |
| Dogecoin | `/coin/dogecoin` |

---

## Testing Scenarios

Run `npm run dev` and verify these scenarios:

| Scenario | URL | Expected Result |
|---|---|---|
| Mega-cap stable | `/coin/bitcoin` | Low risk, Neutral |
| Large-cap | `/coin/ethereum` | Low/Medium risk |
| Meme coin | `/coin/pepe` | High/Extreme risk, Avoid/Wait |
| Meme coin | `/coin/dogecoin` | High risk |
| Invalid ID | `/coin/notacoin123` | Friendly error page |

---

## Build & Deploy

```bash
# Type-check and build
npm run build

# Run production server
npm start

# Lint
npm run lint
```

### Deploying to Vercel

1. Push your code to GitHub
2. Import the repository at [vercel.com/new](https://vercel.com/new)
3. No environment variables required — uses public CoinGecko API

---

## API Details

- **Provider**: CoinGecko public API (no API key required)
- **Rate limiting**: Responses cached with `next: { revalidate: 60 }` (60-second ISR)
- **Endpoints used**:
  - `GET /api/v3/search/trending` — homepage trending coins
  - `GET /api/v3/coins/{id}` — coin analysis page

---

## Customisation

### Adjust Risk Thresholds

Edit `app/coin/[id]/page.tsx` — the `calculateRisk` function:

```ts
// Change market cap thresholds
if (marketCap < 10_000_000) { score += 40; } // Micro-cap boundary
```

### Adjust Price Zones

```ts
function getPriceZones(price: number): PriceZones {
  return {
    buyBelow: price * 0.90,    // change 0.90 for a different discount
    current: price,
    avoidAbove: price * 1.15,  // change 1.15 for a different premium
  };
}
```
