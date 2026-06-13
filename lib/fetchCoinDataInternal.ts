import { coinGeckoApiDuration, redisCacheHits, redisCacheMisses } from '@/lib/metrics';
import { getRedisClient } from "@/lib/redis";

const FETCH_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 100;
const CACHE_TTL_SECONDS = 300; // 5 minutes

const COINGECKO_HEADERS = {
  "User-Agent": "crypto-insight/1.0 (https://github.com/vxtsxl/crypto-insight)",
  Accept: "application/json",
};

function jitter(base: number): number {
  return base + Math.floor(Math.random() * base * 0.5);
}

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

    if (response.status === 429 && attempt < MAX_RETRIES) {
      await response.text().catch(() => {});
      const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      const delay = jitter(baseDelay);
      console.warn(
        `[fetchWithRetry] 429 rate-limited on attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${url} — retrying in ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }

    return response;
  } catch (err) {
    clearTimeout(timer);
    console.error(
      `[fetchWithRetry] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${url}:`,
      err
    );
    if (attempt < MAX_RETRIES) {
      const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      const delay = jitter(baseDelay);
      console.log(`[fetchWithRetry] Retrying in ${delay}ms (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    console.error(`[fetchWithRetry] All ${MAX_RETRIES + 1} attempts exhausted for ${url}`);
    return null;
  }
}

const safeParse = (val: string, fallback: number): number => {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
};

const safePositiveNum = (val: string, fallback: number): number => {
  const n = parseFloat(val);
  return isNaN(n) || n <= 0 ? fallback : n;
};

const SYMBOL_MAP: Record<string, string> = {
  // Large-cap / blue-chip
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  cardano: "ADAUSDT",
  binancecoin: "BNBUSDT",
  ripple: "XRPUSDT",
  polkadot: "DOTUSDT",
  "avalanche-2": "AVAXUSDT",
  chainlink: "LINKUSDT",
  litecoin: "LTCUSDT",
  tron: "TRXUSDT",
  stellar: "XLMUSDT",
  cosmos: "ATOMUSDT",
  monero: "XMRUSDT",
  "bitcoin-cash": "BCHUSDT",
  "the-open-network": "TONUSDT",
  vechain: "VETUSDT",
  algorand: "ALGOUSDT",
  tezos: "XTZUSDT",
  neo: "NEOUSDT",
  zcash: "ZECUSDT",
  dash: "DASHUSDT",
  iota: "IOTAUSDT",
  zilliqa: "ZILUSDT",

  // Mid-cap / DeFi
  near: "NEARUSDT",
  "matic-network": "MATICUSDT",
  filecoin: "FILUSDT",
  aave: "AAVEUSDT",
  uniswap: "UNIUSDT",
  "internet-computer": "ICPUSDT",
  "hedera-hashgraph": "HBARUSDT",
  sui: "SUIUSDT",
  aptos: "APTUSDT",
  arbitrum: "ARBUSDT",
  optimism: "OPUSDT",
  "the-graph": "GRTUSDT",
  maker: "MKRUSDT",
  "curve-dao-token": "CRVUSDT",
  "lido-dao": "LDOUSDT",
  "pancakeswap-token": "CAKEUSDT",
  thorchain: "RUNEUSDT",
  "injective-protocol": "INJUSDT",
  "sei-network": "SEIUSDT",
  celestia: "TIAUSDT",
  "dydx-chain": "DYDXUSDT",
  "jupiter-exchange-solana": "JUPUSDT",
  "pyth-network": "PYTHUSDT",
  "jito-governance-token": "JITOUSDT",
  "render-token": "RENDERUSDT",
  stacks: "STXUSDT",
  chiliz: "CHZUSDT",
  flow: "FLOWUSDT",
  "axie-infinity": "AXSUSDT",
  illuvium: "ILVUSDT",
  "immutable-x": "IMXUSDT",
  stepn: "GMTUSDT",
  apecoin: "APEUSDT",
  gala: "GALAUSDT",
  enjincoin: "ENJUSDT",
  "theta-token": "THETAUSDT",
  "compound-governance-token": "COMPUSDT",
  "yearn-finance": "YFIUSDT",
  blur: "BLURUSDT",
  wormhole: "WUSDT",
  helium: "HNTUSDT",
  harmony: "ONEUSDT",
  ontology: "ONTUSDT",

  // Meme coins
  pepe: "PEPEUSDT",
  "shiba-inu": "SHIBUSDT",
  dogecoin: "DOGEUSDT",
  floki: "FLOKIUSDT",
  dogwifcoin: "WIFUSDT",
  bonk: "BONKUSDT",
  notcoin: "NOTUSDT",
  "book-of-meme": "BOMUSDT",

  // Trending / homepage coins
  truefi: "TRUUSDT",
  "pudgy-penguins": "PUDGYUSDT",
  bittensor: "TAOUSDT",
  "fetch-ai": "FETUSDT",
  "artificial-superintelligence-alliance": "FETUSDT",
  "worldcoin-wld": "WLDUSDT",
  hyperliquid: "HYPEUSDT",

  // Wrapped / liquid staking
  "wrapped-bitcoin": "WBTCUSDT",

  // Metaverse / Gaming
  "the-sandbox": "SANDUSDT",
  decentraland: "MANAUSDT",
  magic: "MAGICUSDT",
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
        redisCacheHits.inc({ key_type: 'coin' });
        const parsed = JSON.parse(cachedData);
        return { ...parsed, cached: true, cacheHit: true };
      } else {
        redisCacheMisses.inc({ key_type: 'coin' });
      }
    } catch {
      console.warn(`[fetchCoinDataInternal] Redis read failed for "${id}" — proceeding without cache`);
    }
  }

  const binanceSymbol = SYMBOL_MAP[id] ?? null;
  console.log(`[fetchCoinDataInternal] Fetching "${id}" — binanceSymbol: ${binanceSymbol ?? "none (CoinGecko-only)"}`);

  const geckoUrl = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`;

  const [geckoResult, binanceResult] = await Promise.all([
    // CoinGecko fetch with metrics timing
    (async () => {
      const endTimer = coinGeckoApiDuration.startTimer({ endpoint: 'coins_id', status: 'success' });
      try {
        const r = await fetchWithRetry(geckoUrl, { headers: COINGECKO_HEADERS });
        if (!r) {
          endTimer({ status: 'null' });
          console.error(`[fetchCoinDataInternal] CoinGecko fetch returned null for "${id}"`);
          return null;
        }
        if (!r.ok) {
          endTimer({ status: String(r.status) });
          console.error(`[fetchCoinDataInternal] CoinGecko responded ${r.status} for "${id}"`);
          return null;
        }
        endTimer({ status: '200' });
        console.log(`[fetchCoinDataInternal] CoinGecko OK for "${id}"`);
        return r.json() as Promise<CoinGeckoResponse>;
      } catch (err) {
        endTimer({ status: 'error' });
        console.error(`[fetchCoinDataInternal] CoinGecko error for "${id}":`, err);
        return null;
      }
    })(),

    // Binance fetch (unchanged)
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

  // If CoinGecko failed but we have Binance data, build a partial response from Binance
  if (!geckoResult) {
    if (binanceResult && binanceSymbol) {
      console.warn(
        `[fetchCoinDataInternal] CoinGecko unavailable for "${id}" — using Binance fallback`
      );

      const derivedSymbol = binanceSymbol.replace(/USDT$/, "").toLowerCase();

      const fallbackData: CoinData = {
        id,
        name: id
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        symbol: derivedSymbol,
        currentPrice: safePositiveNum(binanceResult.lastPrice, 0),
        priceChange24h: safeParse(binanceResult.priceChangePercent, 0),
        marketCap: null,
        volume24h: safeParse(binanceResult.quoteVolume, 0),
        high24h: safePositiveNum(binanceResult.highPrice, 0),
        low24h: safePositiveNum(binanceResult.lowPrice, 0),
        categories: [],
        source: "binance",
        cached: false,
        cacheHit: false,
      };

      if (redis) {
        try {
          await redis.setex(`coin:${id}`, CACHE_TTL_SECONDS, JSON.stringify(fallbackData));
          console.log(`[fetchCoinDataInternal] Cached Binance fallback "${id}" in Redis for ${CACHE_TTL_SECONDS}s`);
        } catch {
          console.warn(`[fetchCoinDataInternal] Redis write failed for "${id}" (Binance fallback)`);
        }
      }

      return fallbackData;
    }

    console.error(`[fetchCoinDataInternal] No data available for "${id}" — returning null`);
    return null;
  }

  console.log(`[fetchCoinDataInternal] Data assembled for "${id}" (source: ${binanceResult ? "binance+coingecko" : "coingecko"})`);

  const useBinance = binanceResult !== null;

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

  // Cache the fresh response in Redis for 5 minutes
  if (redis) {
    try {
      await redis.setex(`coin:${id}`, CACHE_TTL_SECONDS, JSON.stringify(data));
      console.log(`[fetchCoinDataInternal] Cached "${id}" in Redis for ${CACHE_TTL_SECONDS}s`);
    } catch {
      console.warn(`[fetchCoinDataInternal] Redis write failed for "${id}" — data returned without caching`);
    }
  }

  return data;
}