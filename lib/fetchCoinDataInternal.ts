import { getRedisClient } from "@/lib/redis";

const FETCH_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 100;

const COINGECKO_HEADERS = {
  "User-Agent": "crypto-insight/1.0 (https://github.com/vxtsxl/crypto-insight)",
  Accept: "application/json",
};

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  attempt = 0
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    console.error(
      `[fetchWithRetry] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${url}:`,
      err
    );
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.log(`[fetchWithRetry] Retrying in ${delay}ms (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    console.error(`[fetchWithRetry] All ${MAX_RETRIES + 1} attempts exhausted for ${url}`);
    return null;
  }
}

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
  "avalanche-2": "AVAXUSDT",
  chainlink: "LINKUSDT",
  uniswap: "UNIUSDT",
  litecoin: "LTCUSDT",
  tron: "TRXUSDT",
  stellar: "XLMUSDT",
  cosmos: "ATOMUSDT",
  near: "NEARUSDT",
  "matic-network": "MATICUSDT",
  "bitcoin-cash": "BCHUSDT",
  filecoin: "FILUSDT",
  aave: "AAVEUSDT",
  "internet-computer": "ICPUSDT",
  "hedera-hashgraph": "HBARUSDT",
  "the-open-network": "TONUSDT",
  sui: "SUIUSDT",
  aptos: "APTUSDT",
  arbitrum: "ARBUSDT",
  optimism: "OPUSDT",
  floki: "FLOKIUSDT",
  hyperliquid: "HYPEUSDT",
  "wrapped-bitcoin": "WBTCUSDT",
  "the-sandbox": "SANDUSDT",
  decentraland: "MANAUSDT",
  monero: "XMRUSDT",
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

export interface CoinData {
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

export async function fetchCoinDataInternal(
  id: string
): Promise<CoinData | null> {
  // Validate id to prevent cache key injection.
  // Hyphens and underscores are intentionally allowed — coin IDs such as
  // "shiba-inu" are valid CoinGecko identifiers.
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return null;
  }

  const redis = getRedisClient();

  // Check Redis cache before hitting external APIs
  if (redis) {
    try {
      const cachedData = await redis.get(`coin:${id}`);
      if (cachedData) {
        console.log(`[fetchCoinDataInternal] Cache hit for "${id}"`);
        const parsed = JSON.parse(cachedData);
        return { ...parsed, cached: true, cacheHit: true };
      }
    } catch {
      // Redis failure — fall through to normal fetch
      console.warn(`[fetchCoinDataInternal] Redis read failed for "${id}" — proceeding without cache`);
    }
  }

  const binanceSymbol = SYMBOL_MAP[id] ?? null;
  console.log(`[fetchCoinDataInternal] Fetching "${id}" — binanceSymbol: ${binanceSymbol ?? "none (CoinGecko-only)"}`);

  const geckoUrl = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`;

  const [geckoResult, binanceResult] = await Promise.all([
    fetchWithRetry(geckoUrl, { headers: COINGECKO_HEADERS })
      .then((r) => {
        if (!r) {
          console.error(`[fetchCoinDataInternal] CoinGecko fetch returned null for "${id}"`);
          return null;
        }
        if (!r.ok) {
          console.error(`[fetchCoinDataInternal] CoinGecko responded ${r.status} for "${id}"`);
          return null;
        }
        console.log(`[fetchCoinDataInternal] CoinGecko OK for "${id}"`);
        return r.json() as Promise<CoinGeckoResponse>;
      })
      .catch((err) => {
        console.error(`[fetchCoinDataInternal] CoinGecko error for "${id}":`, err);
        return null;
      }),

    binanceSymbol
      ? fetchWithRetry(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`
        )
          .then((r) => {
            if (!r || !r.ok) {
              console.warn(`[fetchCoinDataInternal] Binance fetch failed for ${binanceSymbol} — will fallback to CoinGecko prices`);
              return null;
            }
            return r.json() as Promise<BinanceTickerResponse>;
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!geckoResult) {
    console.error(`[fetchCoinDataInternal] No CoinGecko data for "${id}" — returning null`);
    return null;
  }

  console.log(`[fetchCoinDataInternal] Data assembled for "${id}" (source: ${binanceResult ? "binance+coingecko" : "coingecko"})`);

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

  const gmd = geckoResult.market_data;
  const gPrice = gmd?.current_price?.usd ?? 0;
  const gChange = gmd?.price_change_percentage_24h ?? 0;
  const gMarketCap = gmd?.market_cap?.usd ?? null;
  const gVolume = gmd?.total_volume?.usd ?? 0;
  const gHigh = gmd?.high_24h?.usd ?? 0;
  const gLow = gmd?.low_24h?.usd ?? 0;

  const data: CoinData = {
    id: geckoResult.id,
    name: geckoResult.name,
    symbol: geckoResult.symbol,
    currentPrice: useBinance
      ? safePositiveNum(binanceResult!.lastPrice, gPrice)
      : gPrice,
    priceChange24h: useBinance
      ? safeParse(binanceResult!.priceChangePercent, gChange)
      : gChange,
    marketCap: gMarketCap,
    volume24h: useBinance
      ? safeParse(binanceResult!.quoteVolume, gVolume)
      : gVolume,
    high24h: useBinance
      ? safePositiveNum(binanceResult!.highPrice, gHigh)
      : gHigh,
    low24h: useBinance
      ? safePositiveNum(binanceResult!.lowPrice, gLow)
      : gLow,
    categories: geckoResult.categories,
    source: useBinance ? "binance" : "coingecko",
    cached: false,
    cacheHit: false,
  };

  // Cache the fresh response in Redis for 30 seconds
  if (redis) {
    try {
      await redis.setex(`coin:${id}`, 30, JSON.stringify(data));
      console.log(`[fetchCoinDataInternal] Cached "${id}" in Redis for 30s`);
    } catch {
      // Caching failure — still return the data
      console.warn(`[fetchCoinDataInternal] Redis write failed for "${id}" — data returned without caching`);
    }
  }

  return data;
}
