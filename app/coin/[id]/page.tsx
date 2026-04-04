import Link from "next/link";
import HypeScore from "@/components/HypeScore/HypeScore";
import { getHypeScore } from "@/lib/hypeScoreCalculator";

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  image: { large: string };
  categories: string[];
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    high_24h: { usd: number };
    low_24h: { usd: number };
    ath: { usd: number };
    ath_change_percentage: { usd: number | null };
    circulating_supply: number;
    total_supply: number | null;
  };
  description: { en: string };
  // Optional fields from unified API route response
  source?: "binance" | "coingecko";
  currentPrice?: number;
  priceChange24h?: number;
  marketCap?: number | null;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
}

// ─── Risk Score ────────────────────────────────────────────────────────────
type RiskLevel = "Low" | "Medium" | "High" | "Extreme";

interface RiskScore {
  level: RiskLevel;
  score: number; // 0-100
  factors: string[];
}

function calculateRisk(coin: CoinData): RiskScore {
  if (!coin.market_data) {
    console.error("calculateRisk: market_data is missing");
    return { level: "High", score: 50, factors: ["Insufficient data to assess risk"] };
  }

  const factors: string[] = [];
  let score = 0;

  const { market_cap, total_volume, price_change_percentage_24h } =
    coin.market_data;
  const marketCap = market_cap?.usd ?? 0;
  const volume = total_volume?.usd ?? 0;
  const change24h = price_change_percentage_24h ?? 0;

  // Market cap risk (0-40 pts)
  if (marketCap < 10_000_000) {
    score += 40;
    factors.push("Micro-cap (<$10M)");
  } else if (marketCap < 100_000_000) {
    score += 30;
    factors.push("Small-cap (<$100M)");
  } else if (marketCap < 1_000_000_000) {
    score += 20;
    factors.push("Mid-cap (<$1B)");
  } else if (marketCap < 10_000_000_000) {
    score += 10;
    factors.push("Large-cap (<$10B)");
  } else {
    score += 0;
    factors.push("Mega-cap (>$10B)");
  }

  // Volatility risk (0-30 pts)
  const absChange = Math.abs(change24h);
  if (absChange > 30) {
    score += 30;
    factors.push("Extreme volatility (>30% 24h)");
  } else if (absChange > 20) {
    score += 22;
    factors.push("High volatility (>20% 24h)");
  } else if (absChange > 10) {
    score += 15;
    factors.push("Moderate volatility (>10% 24h)");
  } else {
    score += 5;
    factors.push("Low volatility (<10% 24h)");
  }

  // Volume/market-cap ratio risk (0-20 pts)
  const volumeRatio = marketCap > 0 ? (volume / marketCap) * 100 : 0;
  if (volumeRatio > 50) {
    score += 20;
    factors.push("Very high volume ratio (>50%)");
  } else if (volumeRatio > 30) {
    score += 12;
    factors.push("High volume ratio (>30%)");
  } else {
    score += 4;
    factors.push("Normal volume ratio");
  }

  // Meme coin detection (0-10 pts)
  const isMeme = coin.categories.some((c) =>
    c.toLowerCase().includes("meme")
  );
  if (isMeme) {
    score += 10;
    factors.push("Meme coin category");
  }

  // Clamp 0-100
  score = Math.min(100, Math.max(0, score));

  let level: RiskLevel;
  if (score >= 70) level = "Extreme";
  else if (score >= 45) level = "High";
  else if (score >= 25) level = "Medium";
  else level = "Low";

  return { level, score, factors };
}

// ─── Verdict ──────────────────────────────────────────────────────────────
type VerdictAction = "BUY" | "WAIT" | "AVOID" | "NEUTRAL";
type Confidence = "High" | "Medium" | "Low";

interface Verdict {
  action: VerdictAction;
  label: string;
  emoji: string;
  reason: string;
  confidence: Confidence;
}

function getVerdict(coin: CoinData, risk: RiskScore): Verdict {
  if (!coin.market_data) {
    console.error("getVerdict: market_data is missing");
    return {
      action: "NEUTRAL",
      label: "Insufficient Data",
      emoji: "❓",
      reason: "Not enough market data available to generate a verdict.",
      confidence: "Low",
    };
  }

  const { price_change_percentage_24h: change24h, market_cap, total_volume } =
    coin.market_data;
  const marketCap = market_cap?.usd ?? 0;
  const volumeRatio =
    marketCap > 0 ? ((total_volume?.usd ?? 0) / marketCap) * 100 : 0;

  // 1. Extreme risk → always Avoid
  if (risk.level === "Extreme") {
    return {
      action: "AVOID",
      label: "Avoid",
      emoji: "🚫",
      reason: "Extreme risk detected. Too dangerous for most investors.",
      confidence: "High",
    };
  }

  // 2. Hype detection (big pump + big volume)
  if (change24h > 20 && volumeRatio > 30) {
    return {
      action: "WAIT",
      label: "Wait",
      emoji: "⚠️",
      reason: "Hype detected — strong pump with elevated volume. Wait for consolidation.",
      confidence: "High",
    };
  }

  // 3. Quality dip (established coin >$100M cap with >15% drop)
  if (change24h < -15 && marketCap > 100_000_000) {
    return {
      action: "BUY",
      label: "Buy the Dip",
      emoji: "📉",
      reason: "Established project in significant dip. Potential accumulation opportunity.",
      confidence: "Medium",
    };
  }

  // 4. Falling knife (small-cap dropping)
  if (change24h < -15 && marketCap <= 100_000_000) {
    return {
      action: "WAIT",
      label: "Falling Knife",
      emoji: "🔪",
      reason: "Small-cap in sharp decline. Wait for stabilisation before entering.",
      confidence: "Medium",
    };
  }

  // 5. Healthy growth (5–15% gain with decent volume ratio)
  if (change24h > 5 && change24h <= 15 && volumeRatio > 10) {
    return {
      action: "BUY",
      label: "Healthy Growth",
      emoji: "✅",
      reason: "Moderate positive movement with solid volume — healthy uptrend signal.",
      confidence: "Medium",
    };
  }

  // 6. Stable movement (−5% to +5%) → neutral
  if (change24h >= -5 && change24h <= 5) {
    return {
      action: "NEUTRAL",
      label: "Stable",
      emoji: "😐",
      reason: "Price is moving sideways. No strong directional signal at this time.",
      confidence: "Low",
    };
  }

  // 7. High risk — wait
  if (risk.level === "High") {
    return {
      action: "WAIT",
      label: "Wait",
      emoji: "⏳",
      reason: "High risk profile. More research and patience advised.",
      confidence: "Low",
    };
  }

  // 8. Default — wait
  return {
    action: "WAIT",
    label: "Wait",
    emoji: "⏳",
    reason: "No strong signal detected. Monitor for a clearer entry point.",
    confidence: "Low",
  };
}

// ─── Explanation ──────────────────────────────────────────────────────────
interface Explanation {
  verdictReasons: string[];
  riskFactors: string[];
  momentumSignals: string[];
  keyMetrics: Array<{ label: string; value: string; impact: "positive" | "negative" | "neutral" }>;
}

function generateExplanation(coin: CoinData, verdict: Verdict, risk: RiskScore): Explanation {
  const { price_change_percentage_24h: change24h, market_cap, total_volume, ath_change_percentage } =
    coin.market_data;
  const marketCap = market_cap?.usd ?? 0;
  const volume = total_volume?.usd ?? 0;
  const volumeRatio = marketCap > 0 ? (volume / marketCap) * 100 : 0;
  // ath_change_percentage.usd is null when ATH data is unavailable (e.g. from normalised API response)
  const athChange = ath_change_percentage?.usd ?? null;

  // ── Verdict reasons ──
  const verdictReasons: string[] = [];

  if (verdict.action === "AVOID") {
    verdictReasons.push(`Risk score is ${risk.score}/100 — classified as Extreme`);
    if (Math.abs(change24h) > 30)
      verdictReasons.push(`Extreme 24h volatility (${change24h.toFixed(1)}%) detected`);
    if (volumeRatio > 50)
      verdictReasons.push(`Dangerously high volume ratio (${volumeRatio.toFixed(1)}%) signals instability`);
    verdictReasons.push("Position not recommended for most investor profiles");
  } else if (verdict.label === "Wait" && change24h > 20 && volumeRatio > 30) {
    verdictReasons.push(`Strong 24h pump (+${change24h.toFixed(1)}%) combined with elevated volume ratio (${volumeRatio.toFixed(1)}%)`);
    verdictReasons.push("Classic hype pattern — price may retrace after the surge");
    verdictReasons.push("Waiting for consolidation reduces chasing risk");
  } else if (verdict.label === "Buy the Dip") {
    verdictReasons.push(`Established project (market cap ${fmt(marketCap)}) in significant decline (${change24h.toFixed(1)}%)`);
    verdictReasons.push("Large-cap projects historically recover from short-term dips");
    if (volumeRatio <= 30)
      verdictReasons.push(`Volume ratio (${volumeRatio.toFixed(1)}%) is normal — no panic selling detected`);
  } else if (verdict.label === "Falling Knife") {
    verdictReasons.push(`Small-cap coin (${fmt(marketCap)}) dropping sharply (${change24h.toFixed(1)}%)`);
    verdictReasons.push("Low market-cap projects carry higher risk during sharp declines");
    verdictReasons.push("Entry before stabilization often leads to further losses");
  } else if (verdict.label === "Healthy Growth") {
    verdictReasons.push(`Moderate 24h gain (+${change24h.toFixed(1)}%) within a healthy range (5–15%)`);
    verdictReasons.push(`Volume ratio (${volumeRatio.toFixed(1)}%) confirms genuine buying interest`);
    verdictReasons.push("Steady growth with volume backing is a reliable uptrend signal");
  } else if (verdict.label === "Stable") {
    verdictReasons.push(`24h price change (${change24h.toFixed(1)}%) is within the −5% to +5% sideways range`);
    verdictReasons.push("No directional catalyst detected at this time");
    verdictReasons.push("Monitor for a breakout or breakdown before taking a position");
  } else {
    // Generic Wait / default
    verdictReasons.push("No strong buy or sell signal identified");
    if (risk.level === "High")
      verdictReasons.push("High risk profile warrants caution and additional research");
    verdictReasons.push("Monitor price action for a clearer entry or exit point");
  }

  // ── Risk factors (re-use existing factors with better wording) ──
  const riskFactors: string[] = risk.factors;

  // ── Momentum signals ──
  const momentumSignals: string[] = [];
  const absChange = Math.abs(change24h);

  if (absChange > 20) {
    momentumSignals.push(
      `24h change: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}% — ${change24h > 0 ? "Strong upward" : "Strong downward"} momentum`
    );
  } else if (absChange > 10) {
    momentumSignals.push(
      `24h change: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}% — ${change24h > 0 ? "Moderate upward" : "Moderate downward"} momentum`
    );
  } else if (absChange > 5) {
    momentumSignals.push(
      `24h change: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}% — mild ${change24h > 0 ? "positive" : "negative"} movement`
    );
  } else {
    momentumSignals.push(`24h change: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}% — price consolidating sideways`);
  }

  if (volumeRatio > 50) {
    momentumSignals.push(`Trading volume: Extremely high activity (${volumeRatio.toFixed(1)}% of market cap)`);
  } else if (volumeRatio > 30) {
    momentumSignals.push(`Trading volume: High activity detected (${volumeRatio.toFixed(1)}% of market cap)`);
  } else if (volumeRatio > 10) {
    momentumSignals.push(`Trading volume: Normal activity (${volumeRatio.toFixed(1)}% of market cap)`);
  } else {
    momentumSignals.push(`Trading volume: Low activity (${volumeRatio.toFixed(1)}% of market cap)`);
  }

  if (change24h < -15) {
    momentumSignals.push("Price below the −15% threshold — qualifies as a significant dip");
  } else if (change24h > 15) {
    momentumSignals.push("Price above the +15% threshold — qualifies as a significant pump");
  }

  if (athChange !== null) {
    if (athChange < -80) {
      momentumSignals.push(`Price is ${Math.abs(athChange).toFixed(0)}% below all-time high — deep value territory`);
    } else if (athChange < -50) {
      momentumSignals.push(`Price is ${Math.abs(athChange).toFixed(0)}% below all-time high — significant discount`);
    } else if (athChange >= -10) {
      momentumSignals.push(`Price is near all-time high (${athChange.toFixed(1)}%) — elevated entry risk`);
    }
  }

  // ── Key metrics ──
  const keyMetrics: Explanation["keyMetrics"] = [
    {
      label: "Market Cap",
      value: fmt(marketCap),
      impact:
        marketCap >= 10_000_000_000
          ? "positive"
          : marketCap >= 100_000_000
          ? "neutral"
          : "negative",
    },
    {
      label: "Volume/Cap Ratio",
      value: `${volumeRatio.toFixed(1)}%`,
      impact: volumeRatio > 50 ? "negative" : volumeRatio > 30 ? "negative" : "neutral",
    },
    {
      label: "24h Price Change",
      value: `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
      impact: change24h >= 5 ? "positive" : change24h <= -15 ? "negative" : "neutral",
    },
    ...(athChange !== null
      ? (() => {
          const athImpact: "positive" | "negative" | "neutral" =
            athChange >= -10 ? "negative" : athChange >= -50 ? "neutral" : "positive";
          return [{
            label: "Distance from ATH",
            value: `${athChange.toFixed(1)}%`,
            impact: athImpact,
          }];
        })()
      : []),
    {
      label: "Risk Score",
      value: `${risk.score}/100`,
      impact: risk.score >= 70 ? "negative" : risk.score >= 45 ? "neutral" : "positive",
    },
  ];

  return { verdictReasons, riskFactors, momentumSignals, keyMetrics };
}

// ─── Price Zones ──────────────────────────────────────────────────────────
interface PriceZones {
  buyBelow: number;
  current: number;
  avoidAbove: number;
}

function getPriceZones(price: number): PriceZones {
  return {
    buyBelow: price * 0.9,
    current: price,
    avoidAbove: price * 1.15,
  };
}

// ─── Data Fetching ─────────────────────────────────────────────────────────
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function getCoinData(id: string): Promise<CoinData | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/coin/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function normalizeData(data: CoinData, imageUrl: string): CoinData {
  // If it has currentPrice field, it came from the unified API route
  if (data.currentPrice !== undefined) {
    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      image: { large: imageUrl },
      market_data: {
        current_price: { usd: data.currentPrice },
        market_cap: { usd: data.marketCap ?? 0 },
        total_volume: { usd: data.volume24h ?? 0 },
        price_change_percentage_24h: data.priceChange24h ?? 0,
        // 7d change and supply are not available from the unified API route.
        price_change_percentage_7d: 0,
        high_24h: { usd: data.high24h ?? data.currentPrice },
        low_24h: { usd: data.low24h ?? data.currentPrice },
        ath: { usd: data.high24h ?? data.currentPrice },
        ath_change_percentage: { usd: null },
        circulating_supply: 0,
        total_supply: null,
      },
      categories: data.categories ?? [],
      description: { en: "" },
      source: data.source,
    };
  }

  // Otherwise it's already in CoinGecko / internal format — return as-is
  return data;
}

async function getCoinImage(coinId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data.image?.large ?? "";
  } catch {
    return "";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(n: number): string {
  if (n >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

function riskColors(level: RiskLevel) {
  switch (level) {
    case "Low": return { bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.4)", text: "#4ade80" };
    case "Medium": return { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.4)", text: "#fbbf24" };
    case "High": return { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.4)", text: "#f87171" };
    case "Extreme": return { bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.4)", text: "#ef4444" };
  }
}

function verdictColors(action: VerdictAction) {
  switch (action) {
    case "BUY": return { bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.4)", text: "#4ade80" };
    case "WAIT": return { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.4)", text: "#fbbf24" };
    case "AVOID": return { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.4)", text: "#f87171" };
    case "NEUTRAL": return { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.4)", text: "#94a3b8" };
  }
}

// ─── Decision Sub-components ──────────────────────────────────────────────
import type { HypeScoreResult } from "@/lib/hypeScoreCalculator";

function DecisionEngineCards({
  risk,
  verdict,
  hype,
  priceChange24h,
  volumeRatio,
}: {
  risk: RiskScore;
  verdict: Verdict;
  hype: HypeScoreResult;
  priceChange24h: number;
  volumeRatio: number;
}) {
  const rc = riskColors(risk.level);
  const vc = verdictColors(verdict.action);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Risk Card */}
      <div
        style={{ background: rc.bg, border: `1px solid ${rc.border}` }}
        className="rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>Risk Level</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}
          >
            {risk.level}
          </span>
        </div>
        <div className="w-full h-2 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-2 rounded-full"
            style={{ width: `${risk.score}%`, background: rc.text }}
          />
        </div>
        <p className="text-2xl font-bold mb-3" style={{ color: rc.text }}>
          {risk.score}/100
        </p>
        <ul className="space-y-1">
          {risk.factors.map((f) => (
            <li key={f} className="text-xs flex items-center gap-2" style={{ color: "#94a3b8" }}>
              <span style={{ color: rc.text }}>•</span> {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Verdict Card */}
      <div
        style={{ background: vc.bg, border: `1px solid ${vc.border}` }}
        className="rounded-2xl p-5"
      >
        <p className="text-sm font-medium mb-3" style={{ color: "#94a3b8" }}>Smart Verdict</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{verdict.emoji}</span>
          <div>
            <p className="text-2xl font-bold" style={{ color: vc.text }}>
              {verdict.label}
            </p>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Confidence:{" "}
              <span style={{ color: vc.text }}>{verdict.confidence}</span>
            </p>
          </div>
        </div>
        <p className="text-sm" style={{ color: "#94a3b8" }}>{verdict.reason}</p>
      </div>

      {/* Hype Score Card */}
      <HypeScore result={hype} priceChange24h={priceChange24h} volumeRatio={volumeRatio} />
    </div>
  );
}

function DecisionExplanationCard({
  risk,
  verdict,
  explanation,
}: {
  risk: RiskScore;
  verdict: Verdict;
  explanation: Explanation;
}) {
  const rc = riskColors(risk.level);
  const vc = verdictColors(verdict.action);
  return (
    <div
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      className="rounded-2xl p-5 space-y-6"
    >
      <h2 className="font-semibold text-lg" style={{ color: "var(--foreground)" }}>
        📊 Decision Explanation
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Why This Verdict? */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#94a3b8" }}>
            Why &ldquo;{verdict.label}&rdquo;?
          </h3>
          <ul className="space-y-2">
            {explanation.verdictReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#cbd5e1" }}>
                <span style={{ color: vc.text, marginTop: "2px", flexShrink: 0 }}>•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Factors */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#94a3b8" }}>
            Risk Factors
          </h3>
          <ul className="space-y-2">
            {explanation.riskFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#cbd5e1" }}>
                <span style={{ color: rc.text, marginTop: "2px", flexShrink: 0 }}>•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>

        {/* Momentum Analysis */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#94a3b8" }}>
            Momentum Analysis
          </h3>
          <ul className="space-y-2">
            {explanation.momentumSignals.map((signal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#cbd5e1" }}>
                <span style={{ color: "#818cf8", marginTop: "2px", flexShrink: 0 }}>•</span>
                {signal}
              </li>
            ))}
          </ul>
        </div>

        {/* Key Metrics */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#94a3b8" }}>
            Key Metrics
          </h3>
          <ul className="space-y-2">
            {explanation.keyMetrics.map((metric) => {
              const impactColor =
                metric.impact === "positive"
                  ? "#4ade80"
                  : metric.impact === "negative"
                  ? "#f87171"
                  : "#94a3b8";
              const impactLabel =
                metric.impact === "positive"
                  ? "Positive"
                  : metric.impact === "negative"
                  ? "Negative"
                  : "Neutral";
              return (
                <li key={metric.label} className="flex items-center justify-between text-sm">
                  <span style={{ color: "#94a3b8" }}>{metric.label}</span>
                  <span className="flex items-center gap-2">
                    <span style={{ color: "var(--foreground)" }} className="font-medium">
                      {metric.value}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        color: impactColor,
                        background: `${impactColor}1a`,
                        border: `1px solid ${impactColor}40`,
                      }}
                    >
                      {impactLabel}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────
export default async function CoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawData = await getCoinData(id);

  // ── Error State ──
  if (!rawData) {
    return (
      <main
        style={{ background: "var(--background)", color: "var(--foreground)" }}
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      >
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
          Coin Not Found
        </h1>
        <p style={{ color: "#94a3b8" }} className="mb-6 max-w-md">
          We couldn&apos;t find &ldquo;{id}&rdquo; on CoinGecko. Check the spelling or try a different coin ID.
        </p>
        <Link
          href="/"
          style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
          className="px-6 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
        >
          ← Back to Home
        </Link>
      </main>
    );
  }

  // Fetch coin image if not already in data, then normalize to internal format
  const imageUrl = rawData.image?.large
    ? rawData.image.large
    : await getCoinImage(id);
  const coin = normalizeData(rawData, imageUrl);

  const price = coin.market_data.current_price.usd;
  const change24h = coin.market_data.price_change_percentage_24h;
  const change7d = coin.market_data.price_change_percentage_7d;
  const marketCap = coin.market_data.market_cap.usd;
  const volume = coin.market_data.total_volume.usd;
  const high24h = coin.market_data.high_24h.usd;
  const low24h = coin.market_data.low_24h.usd;
  const athChange = coin.market_data.ath_change_percentage.usd ?? null;
  const volumeRatio = marketCap > 0 ? (volume / marketCap) * 100 : 0;

  let risk: RiskScore | null = null;
  let verdict: Verdict | null = null;
  let explanation: Explanation | null = null;
  try {
    risk = calculateRisk(coin);
    verdict = getVerdict(coin, risk);
    explanation = generateExplanation(coin, verdict, risk);
  } catch (err) {
    console.error(`[coin/${id}] Decision engine calculation failed:`, err);
  }

  const zones = getPriceZones(price);
  const hype = getHypeScore({ priceChange24h: change24h, volumeRatio });

  return (
    <main
      style={{ background: "var(--background)", color: "var(--foreground)" }}
      className="min-h-screen"
    >
      {/* ── Header ── */}
      <header
        style={{
          borderBottom: "1px solid var(--card-border)",
          background: "rgba(26,26,46,0.9)",
        }}
        className="sticky top-0 z-50 backdrop-blur-sm"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" style={{ color: "#94a3b8" }} className="hover:opacity-80 text-sm">
            ← Home
          </Link>
          <span style={{ color: "#2d2d4a" }}>|</span>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {coin.name} ({coin.symbol.toUpperCase()}) Analysis
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* ── Coin Header ── */}
        <div
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coin.image.large}
            alt={coin.name}
            width={64}
            height={64}
            className="rounded-full"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
              {coin.name}
            </h1>
            <p className="text-sm uppercase mt-0.5" style={{ color: "#64748b" }}>
              {coin.symbol}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
              {fmtPrice(price)}
            </p>
            <p
              className="text-sm font-semibold mt-0.5"
              style={{ color: change24h >= 0 ? "#4ade80" : "#f87171" }}
            >
              {change24h >= 0 ? "+" : ""}{change24h?.toFixed(2)}% (24h)
            </p>
          </div>
        </div>

        {/* ── Risk + Verdict + Hype Score ── */}
        {risk && verdict ? (
          <DecisionEngineCards
            risk={risk}
            verdict={verdict}
            hype={hype}
            priceChange24h={change24h}
            volumeRatio={volumeRatio}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.2)" }}
              className="sm:col-span-2 rounded-2xl p-5 flex items-center gap-4"
            >
              <span className="text-3xl">⚠️</span>
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                  Analysis Unavailable
                </p>
                <p className="text-sm" style={{ color: "#94a3b8" }}>
                  Insufficient market data to generate Risk Level and Smart Verdict for this coin.
                </p>
              </div>
            </div>
            {/* Hype Score is still calculated from available data */}
            <HypeScore result={hype} priceChange24h={change24h} volumeRatio={volumeRatio} />
          </div>
        )}

        {/* ── Decision Explanation ── */}
        {risk && verdict && explanation ? (
          <DecisionExplanationCard risk={risk} verdict={verdict} explanation={explanation} />
        ) : null}

        {/* ── Price Zones ── */}
        <div
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          className="rounded-2xl p-5"
        >
          <h2 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            💰 Price Zones
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div
              style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)" }}
              className="rounded-xl p-4 text-center"
            >
              <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Buy Below</p>
              <p className="font-bold" style={{ color: "#4ade80" }}>{fmtPrice(zones.buyBelow)}</p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>−10%</p>
            </div>
            <div
              style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.3)" }}
              className="rounded-xl p-4 text-center"
            >
              <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Current</p>
              <p className="font-bold" style={{ color: "#818cf8" }}>{fmtPrice(zones.current)}</p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>Live</p>
            </div>
            <div
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}
              className="rounded-xl p-4 text-center"
            >
              <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Avoid Above</p>
              <p className="font-bold" style={{ color: "#f87171" }}>{fmtPrice(zones.avoidAbove)}</p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>+15%</p>
            </div>
          </div>
        </div>

        {/* ── Market Stats ── */}
        <div
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          className="rounded-2xl p-5"
        >
          <h2 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            📊 Market Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Market Cap", value: fmt(marketCap) },
              { label: "24h Volume", value: fmt(volume) },
              { label: "Volume Ratio", value: `${volumeRatio.toFixed(1)}%` },
              { label: "24H High", value: fmtPrice(high24h), color: "#4ade80" },
              { label: "24H Low", value: fmtPrice(low24h), color: "#f87171" },
              {
                label: "7d Change",
                value: `${change7d >= 0 ? "+" : ""}${change7d?.toFixed(2)}%`,
                color: change7d >= 0 ? "#4ade80" : "#f87171",
              },
              {
                label: "From ATH",
                value: athChange !== null ? `${athChange.toFixed(1)}%` : "—",
                color: athChange !== null ? (athChange >= 0 ? "#4ade80" : "#f87171") : undefined,
              },
              {
                label: "Categories",
                value: coin.categories.slice(0, 2).join(", ") || "—",
                small: true,
              },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xs mb-1" style={{ color: "#64748b" }}>{stat.label}</p>
                <p
                  className={`font-semibold ${stat.small ? "text-sm" : "text-base"}`}
                  style={{ color: stat.color ?? "var(--foreground)" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Categories ── */}
        {coin.categories.length > 0 && (
          <div
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            className="rounded-2xl p-5"
          >
            <h2 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              🏷️ Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {coin.categories.map((cat) => (
                <span
                  key={cat}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.3)",
                    color: "#a78bfa",
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div
          style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)" }}
          className="rounded-2xl p-4 text-sm"
        >
          <p style={{ color: "#fbbf24" }} className="font-semibold mb-1">⚠️ Not Financial Advice</p>
          <p style={{ color: "#94a3b8" }}>
            This analysis is algorithmic and for educational purposes only. Always DYOR before making
            any investment decisions.
          </p>
        </div>
      </div>
    </main>
  );
}