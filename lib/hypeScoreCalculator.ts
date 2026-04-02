export interface HypeScoreResult {
  score: number;
  category: "High" | "Medium" | "Low";
  emoji: string;
  volatilityWarning?: string;
}

export interface CoinHypeData {
  priceChange24h: number;
  volumeRatio: number; // (volume / marketCap) * 100
}

export function calculateHypeScore(data: CoinHypeData): number {
  const { priceChange24h, volumeRatio } = data;
  // Price change is weighted at 2× volume ratio (volume is scaled to match price-change magnitude).
  // Division by 2 normalises the combined score into a comparable range.
  return (priceChange24h + volumeRatio * 0.5) / 2;
}

export function getHypeCategory(score: number): "High" | "Medium" | "Low" {
  if (score > 15) return "High";
  if (score > 5) return "Medium";
  return "Low";
}

export function getHypeEmoji(category: "High" | "Medium" | "Low"): string {
  switch (category) {
    case "High":
      return "🔥";
    case "Medium":
      return "⚖️";
    case "Low":
      return "❄️";
  }
}

export function getVolatilityWarning(priceChange24h: number): string | undefined {
  const abs = Math.abs(priceChange24h);
  if (abs > 30) return "Extreme volatility";
  if (abs > 15) return "High volatility";
  return undefined;
}

export function getHypeScore(data: CoinHypeData): HypeScoreResult {
  const score = calculateHypeScore(data);
  const category = getHypeCategory(score);
  const emoji = getHypeEmoji(category);
  const volatilityWarning = getVolatilityWarning(data.priceChange24h);
  return { score, category, emoji, ...(volatilityWarning ? { volatilityWarning } : {}) };
}
