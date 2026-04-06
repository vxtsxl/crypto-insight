# Crypto Insight - Smart Crypto Analysis Tool

A comprehensive cryptocurrency analysis platform that provides real-time insights, market analysis, and investment recommendations.

## Features
- ☸️ **Kubernetes Support** - (Coming Soon) Orchestration and scaling support

- 🔍 **Real-time Coin Analysis** - Instant access to crypto market data from CoinGecko and Binance
- 📊 **Risk Assessment** - Comprehensive risk scoring and volatility analysis
- 💡 **Smart Verdicts** - AI-powered investment recommendations (Avoid/Hold/Buy)
- 🎯 **Hype Score** - Market sentiment and volatility indicators
- 📈 **Market Statistics** - 24h volume, price changes, and trend analysis
- 💰 **Price Zones** - Buy/Sell/Avoid price levels with technical analysis
- 🚀 **Trending Coins** - Real-time trending cryptocurrencies
- 🎲 **Top Opportunities** - Daily investment opportunities

## Tech Stack

- **Frontend:** Next.js 16, React, TypeScript
- **Backend:** Next.js API Routes
- **Caching:** Redis
- **Data Sources:** CoinGecko API, Binance API
- **Containerization:** Docker & Docker Compose

## Quick Start

### Local Development
bash
npm install
npm run dev
# Open http://localhost:3000


### Docker
bash
docker-compose up --build
# Open http://localhost:3000


## Environment Variables

Create a .env.local file:

NEXT_PUBLIC_BASE_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379


## Architecture

### Coin Data Fetching
- Robust retry logic with exponential backoff
- CoinGecko as primary data source
- Binance fallback for 40+ coins when CoinGecko is rate limited
- Redis caching (5 minutes TTL) to reduce API pressure

### Rate Limiting Handling
- 4 automatic retries with 100ms-800ms delays
- User-Agent headers for API compatibility
- Binance fallback for coins in SYMBOL_MAP
- Comprehensive error logging

## Supported Coins

40+ coins including: Bitcoin, Ethereum, Solana, Dogecoin, Shiba Inu, Pepe, Ripple, Cardano, Polkadot, and more!

## API Endpoints

- GET /api/coin/:id\` - Get detailed coin analysis
- GET /api/coins/trending\` - Get trending coins
- GET /api/coins/opportunities\` - Get top opportunities

## Performance

- Response time: <1 second (cached)
- Redis caching: 5 minutes
- Automatic retry on failures
- Rate limit handling: ✅

## Deployment

### Docker Hub
bash
docker pull iivatsal/crypto-insight:latest
docker run -p 3000:3000 iivatsal/crypto-insight:latest


### Requirements
- Node.js 20+
- Redis 7+
- Docker & Docker Compose

## Contributing

Contributions are welcome! Feel free to open issues and pull requests.

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ by vxtsxl**
