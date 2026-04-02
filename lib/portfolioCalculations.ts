export type RiskLevel = "Low" | "Medium" | "High";

export interface SuggestedCoin {
  name: string;
  ticker: string;
  id: string;
  percentage: number;
  amountUsd: number;
  riskLevel: RiskLevel;
  tier: "Tier 1" | "Tier 2" | "Tier 3" | "Reserve";
  tierLabel: string;
}

export interface SuggestedPortfolio {
  budget: number;
  suggestions: SuggestedCoin[];
  generatedAt: Date;
}

export interface AllocationResult {
  tier1: SuggestedCoin[];
  tier2: SuggestedCoin[];
  tier3: SuggestedCoin[];
  reserve: SuggestedCoin[];
}

const TIER1_COINS: Omit<SuggestedCoin, "amountUsd" | "percentage">[] = [
  { name: "Bitcoin", ticker: "BTC", id: "bitcoin", riskLevel: "Low", tier: "Tier 1", tierLabel: "Stable / Large-cap" },
  { name: "Ethereum", ticker: "ETH", id: "ethereum", riskLevel: "Low", tier: "Tier 1", tierLabel: "Stable / Large-cap" },
];

const TIER2_COINS: Omit<SuggestedCoin, "amountUsd" | "percentage">[] = [
  { name: "Solana", ticker: "SOL", id: "solana", riskLevel: "Medium", tier: "Tier 2", tierLabel: "Growth / Mid-cap" },
  { name: "Cardano", ticker: "ADA", id: "cardano", riskLevel: "Medium", tier: "Tier 2", tierLabel: "Growth / Mid-cap" },
  { name: "Polkadot", ticker: "DOT", id: "polkadot", riskLevel: "Medium", tier: "Tier 2", tierLabel: "Growth / Mid-cap" },
];

const TIER3_COINS: Omit<SuggestedCoin, "amountUsd" | "percentage">[] = [
  { name: "Dogecoin", ticker: "DOGE", id: "dogecoin", riskLevel: "High", tier: "Tier 3", tierLabel: "High-Growth / Meme" },
  { name: "Shiba Inu", ticker: "SHIB", id: "shiba-inu", riskLevel: "High", tier: "Tier 3", tierLabel: "High-Growth / Meme" },
  { name: "PEPE", ticker: "PEPE", id: "pepe", riskLevel: "High", tier: "Tier 3", tierLabel: "High-Growth / Meme" },
];

const RESERVE_COIN: Omit<SuggestedCoin, "amountUsd" | "percentage"> = {
  name: "USD Coin",
  ticker: "USDC",
  id: "usd-coin",
  riskLevel: "Low",
  tier: "Reserve",
  tierLabel: "Cash / Stablecoin (DCA)",
};

export function calculateAllocation(budget: number): AllocationResult {
  // Tier 1: 50% — BTC 30%, ETH 20%
  const tier1Percentages = [30, 20];
  const tier1 = TIER1_COINS.map((coin, i) => ({
    ...coin,
    percentage: tier1Percentages[i],
    amountUsd: parseFloat(((budget * tier1Percentages[i]) / 100).toFixed(2)),
  }));

  // Tier 2: 30% — SOL/ADA/DOT 10% each
  const tier2 = TIER2_COINS.map((coin) => ({
    ...coin,
    percentage: 10,
    amountUsd: parseFloat(((budget * 10) / 100).toFixed(2)),
  }));

  // Tier 3: 15% — split equally among 3 meme coins (5% each)
  const tier3PerCoin = 15 / TIER3_COINS.length;
  const tier3 = TIER3_COINS.map((coin) => ({
    ...coin,
    percentage: parseFloat(tier3PerCoin.toFixed(2)),
    amountUsd: parseFloat(((budget * tier3PerCoin) / 100).toFixed(2)),
  }));

  // Reserve: 5%
  const reserve = [
    {
      ...RESERVE_COIN,
      percentage: 5,
      amountUsd: parseFloat(((budget * 5) / 100).toFixed(2)),
    },
  ];

  return { tier1, tier2, tier3, reserve };
}

export function suggestPortfolio(budget: number): SuggestedPortfolio {
  const allocation = calculateAllocation(budget);
  const suggestions = [
    ...allocation.tier1,
    ...allocation.tier2,
    ...allocation.tier3,
    ...allocation.reserve,
  ];

  return {
    budget,
    suggestions,
    generatedAt: new Date(),
  };
}

export function getTopCoins(tier: "Tier 1" | "Tier 2" | "Tier 3" | "Reserve"): Omit<SuggestedCoin, "amountUsd" | "percentage">[] {
  switch (tier) {
    case "Tier 1":
      return TIER1_COINS;
    case "Tier 2":
      return TIER2_COINS;
    case "Tier 3":
      return TIER3_COINS;
    case "Reserve":
      return [RESERVE_COIN];
  }
}
