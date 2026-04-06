import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  cardano: "ADAUSDT",
  pepe: "PEPEUSDT",
  "shiba-inu": "SHIBUSDT",
  dogecoin: "DOGEUSDT",
  binancecoin: "BNBUSDT",
  ripple: "XRPUSDT",
  polkadot: "DOTUSDT",
};

interface CoinGeckoResponse {
  id: string;
  name: string;
  symbol: string;
  categories: string[];
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
  };
}

interface BinanceTickerResponse {
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number | null;
  volume24h: number;
  high24h: number;
  low24h: number;
  categories: string[];
  source: "binance" | "coingecko";
  cached: boolean;
  cacheHit: boolean;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid coin ID" }, { status: 404 });
  }

  const redis = getRedisClient();

  // Check Redis cache before hitting external APIs
  if (redis) {
    try {
      const cachedData = await redis.get(`coin:${id}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return NextResponse.json({ ...parsed, cached: true, cacheHit: true });
      }
    } catch {
      // Redis failure — fall through to normal fetch
    }
  }

  const binanceSymbol = SYMBOL_MAP[id] ?? null;

  const [geckoResult, binanceResult] = await Promise.all([
    fetch(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`
    )
      .then((r) => (r.ok ? (r.json() as Promise<CoinGeckoResponse>) : null))
      .catch(() => null),

    binanceSymbol
      ? fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`
        )
          .then((r) =>
            r.ok ? (r.json() as Promise<BinanceTickerResponse>) : null
          )
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!geckoResult) {
    return NextResponse.json({ error: "Coin not found" }, { status: 404 });
  }

  const useBinance = binanceResult !== null;

  const safeParse = (val: string, fallback: number): number => {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };

  // For price fields, treat 0 as invalid and fall back to the alternative source.
  // Binance can return "0.00000000" during brief data gaps; CoinGecko is a better
  // fallback than silently returning $0 to the UI.
  const safePositiveNum = (val: string, fallback: number): number => {
    const n = parseFloat(val);
    return isNaN(n) || n <= 0 ? fallback : n;
  };

  const data: CoinData = {
    id: geckoResult.id,
    name: geckoResult.name,
    symbol: geckoResult.symbol,
    currentPrice: useBinance
      ? safePositiveNum(binanceResult!.lastPrice, geckoResult.market_data?.current_price?.usd ?? 0)
      : geckoResult.market_data?.current_price?.usd ?? 0,
    priceChange24h: useBinance
      ? safeParse(binanceResult!.priceChangePercent, geckoResult.market_data?.price_change_percentage_24h ?? 0)
      : geckoResult.market_data?.price_change_percentage_24h ?? 0,
    marketCap: geckoResult.market_data?.market_cap?.usd ?? null,
    volume24h: useBinance
      ? safeParse(binanceResult!.quoteVolume, geckoResult.market_data?.total_volume?.usd ?? 0)
      : geckoResult.market_data?.total_volume?.usd ?? 0,
    high24h: useBinance
      ? safePositiveNum(binanceResult!.highPrice, geckoResult.market_data?.high_24h?.usd ?? 0)
      : geckoResult.market_data?.high_24h?.usd ?? 0,
    low24h: useBinance
      ? safePositiveNum(binanceResult!.lowPrice, geckoResult.market_data?.low_24h?.usd ?? 0)
      : geckoResult.market_data?.low_24h?.usd ?? 0,
    categories: geckoResult.categories,
    source: useBinance ? "binance" : "coingecko",
    cached: false,
    cacheHit: false,
  };

  // Cache the fresh response in Redis for 30 seconds
  if (redis) {
    try {
      await redis.setex(`coin:${id}`, 30, JSON.stringify(data));
    } catch {
      // Caching failure — still return the data
    }
  }

  return NextResponse.json(data);
}
