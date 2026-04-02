import type { HypeScoreResult } from "@/lib/hypeScoreCalculator";

interface HypeScoreProps {
  result: HypeScoreResult;
  priceChange24h: number;
  volumeRatio: number;
}

export default function HypeScore({ result, priceChange24h, volumeRatio }: HypeScoreProps) {
  const categoryColors = {
    High: { bg: "rgba(251,113,32,0.1)", border: "rgba(251,113,32,0.4)", text: "#fb7120" },
    Medium: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.4)", text: "#fbbf24" },
    Low: { bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.4)", text: "#818cf8" },
  };

  const colors = categoryColors[result.category];

  return (
    <div
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
      className="rounded-2xl p-5"
    >
      <p className="text-sm font-medium mb-3" style={{ color: "#94a3b8" }}>
        Hype Score
      </p>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{result.emoji}</span>
        <div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>
            {result.category}
          </p>
          <p className="text-sm font-mono" style={{ color: "#64748b" }}>
            {result.score.toFixed(1)}
          </p>
        </div>
      </div>

      <ul className="space-y-1 text-xs" style={{ color: "#94a3b8" }}>
        <li className="flex items-center gap-2">
          <span style={{ color: colors.text }}>•</span>
          24h Change:{" "}
          <span
            style={{ color: priceChange24h >= 0 ? "#4ade80" : "#f87171" }}
            className="font-semibold"
          >
            {priceChange24h >= 0 ? "+" : ""}
            {priceChange24h.toFixed(2)}%
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span style={{ color: colors.text }}>•</span>
          Volume Ratio:{" "}
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>
            {volumeRatio.toFixed(1)}%
          </span>
        </li>
        {result.volatilityWarning && (
          <li className="flex items-center gap-2 mt-2">
            <span>⚡</span>
            <span style={{ color: "#fb7120" }} className="font-semibold">
              {result.volatilityWarning}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
