"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { suggestPortfolio, type SuggestedPortfolio, type RiskLevel } from "@/lib/portfolioCalculations";
import { exportPortfolioToCSV } from "@/lib/csvExport";

const AllocationChart = dynamic(
  () => import("@/components/AllocationChart/AllocationChart"),
  { ssr: false }
);

const MIN_BUDGET = 50;
const MAX_BUDGET = 10_000;

function riskBadgeStyle(level: RiskLevel) {
  switch (level) {
    case "Low":
      return { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.4)" };
    case "Medium":
      return { background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.4)" };
    case "High":
      return { background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" };
  }
}

function tierBadgeStyle(tier: string) {
  const map: Record<string, { background: string; color: string; border: string }> = {
    "Tier 1": { background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)" },
    "Tier 2": { background: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.4)" },
    "Tier 3": { background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" },
    Reserve: { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.4)" },
  };
  return map[tier] ?? map["Tier 1"];
}

export default function PortfolioCalculator() {
  const [inputValue, setInputValue] = useState("");
  const [portfolio, setPortfolio] = useState<SuggestedPortfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCalculate() {
    setError(null);
    const budget = parseFloat(inputValue);
    if (isNaN(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) {
      setError(`Please enter a budget between $${MIN_BUDGET} and $${MAX_BUDGET.toLocaleString()}.`);
      setPortfolio(null);
      return;
    }
    setPortfolio(suggestPortfolio(budget));
  }

  function handleExportCSV() {
    if (portfolio) exportPortfolioToCSV(portfolio);
  }

  async function handleCopy() {
    if (!portfolio) return;
    const lines = portfolio.suggestions
      .map((s) => `${s.name} (${s.ticker}): $${s.amountUsd.toFixed(2)} (${s.percentage}%) — ${s.riskLevel} risk`)
      .join("\n");
    await navigator.clipboard.writeText(
      `Crypto Portfolio — $${portfolio.budget.toLocaleString()}\n\n${lines}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* ── Budget Input ── */}
      <div
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        className="rounded-2xl p-6"
      >
        <h2 className="font-semibold text-lg mb-1" style={{ color: "var(--foreground)" }}>
          💵 Enter Your Budget
        </h2>
        <p className="text-sm mb-4" style={{ color: "#94a3b8" }}>
          Min $50 — Max $10,000
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold"
              style={{ color: "#64748b" }}
            >
              $
            </span>
            <input
              type="number"
              min={MIN_BUDGET}
              max={MAX_BUDGET}
              placeholder="500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
              style={{
                background: "#0f0f1a",
                border: `1px solid ${error ? "rgba(248,113,113,0.6)" : "var(--card-border)"}`,
                color: "var(--foreground)",
                borderRadius: 12,
              }}
              className="w-full pl-8 pr-4 py-3 outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <button
            onClick={handleCalculate}
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Calculate →
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm" style={{ color: "#f87171" }}>
            ⚠️ {error}
          </p>
        )}
      </div>

      {portfolio && (
        <>
          {/* ── Pie Chart ── */}
          <div
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            className="rounded-2xl p-6"
          >
            <h2 className="font-semibold text-lg mb-4" style={{ color: "var(--foreground)" }}>
              📊 Allocation Breakdown
            </h2>
            <AllocationChart suggestions={portfolio.suggestions} />
          </div>

          {/* ── Suggestions Table ── */}
          <div
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            className="rounded-2xl p-6"
          >
            <h2 className="font-semibold text-lg mb-4" style={{ color: "var(--foreground)" }}>
              🪙 Suggested Coins
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "#64748b", borderBottom: "1px solid var(--card-border)" }}>
                    <th className="text-left pb-3 pr-4">Coin</th>
                    <th className="text-right pb-3 pr-4">Amount</th>
                    <th className="text-right pb-3 pr-4">%</th>
                    <th className="text-right pb-3 pr-4">Risk</th>
                    <th className="text-right pb-3">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.suggestions.map((s) => (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid rgba(45,45,74,0.5)" }}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/coin/${s.id}`}
                          style={{ color: "var(--foreground)" }}
                          className="font-semibold hover:underline"
                        >
                          {s.name}
                        </Link>
                        <span className="ml-2 text-xs" style={{ color: "#64748b" }}>
                          {s.ticker}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold" style={{ color: "var(--foreground)" }}>
                        ${s.amountUsd.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-right" style={{ color: "#94a3b8" }}>
                        {s.percentage}%
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={riskBadgeStyle(s.riskLevel)}
                        >
                          {s.riskLevel}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={tierBadgeStyle(s.tier)}
                        >
                          {s.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportCSV}
              style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80" }}
              className="flex-1 py-3 rounded-xl font-semibold hover:opacity-80 transition-opacity"
            >
              ⬇️ Download CSV
            </button>
            <button
              onClick={handleCopy}
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
              className="flex-1 py-3 rounded-xl font-semibold hover:opacity-80 transition-opacity"
            >
              {copied ? "✅ Copied!" : "📋 Copy to Clipboard"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
