import type { CoinData } from "@/lib/fetchCoinDataInternal";

export type { CoinData };

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return envUrl;
      }
    } catch {
      // Invalid URL — fall through to default
    }
  }
  return "http://localhost:3000";
}

export async function fetchCoinData(id: string): Promise<CoinData | null> {
  const baseUrl = getBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/coin/${id}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return null;
    }

    return res.json() as Promise<CoinData>;
  } catch {
    return null;
  }
}
