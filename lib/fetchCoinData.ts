import type { CoinData } from "@/lib/fetchCoinDataInternal";

export type { CoinData };

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
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
