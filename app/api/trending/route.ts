import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

const CACHE_KEY = "trending:coins";
const CACHE_TTL = 300; // 5 minutes

interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    data?: {
      price_change_percentage_24h?: { usd?: number };
      price?: string;
      market_cap?: string;
      total_volume?: string;
    };
  };
}

interface CoinGeckoTrendingResponse {
  coins: TrendingCoin[];
}

export async function GET() {
  const redis = getRedisClient();

  // Check Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const coins: TrendingCoin[] = JSON.parse(cached);
        return NextResponse.json({ coins, cached: true });
      }
    } catch {
      // Redis failure — fall through to normal fetch
    }
  }

  // Cache miss — fetch fresh data from CoinGecko
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/search/trending"
    );

    if (!response.ok) {
      console.error(`[Trending] CoinGecko API error: ${response.status}`);
      return NextResponse.json({ coins: [], cached: false });
    }

    const data = (await response.json()) as CoinGeckoTrendingResponse;
    const coins: TrendingCoin[] = data.coins ?? [];

    // Cache the result for 5 minutes
    if (redis) {
      try {
        await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(coins));
      } catch {
        // Caching failure — still return the data
      }
    }

    return NextResponse.json({ coins, cached: false });
  } catch (err) {
    console.error("[Trending] Failed to fetch from CoinGecko:", err);
    return NextResponse.json({ coins: [], cached: false });
  }
}
