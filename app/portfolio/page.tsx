import Link from "next/link";
import PortfolioCalculator from "@/components/PortfolioCalculator/PortfolioCalculator";

export const metadata = {
  title: "Portfolio Suggestion Tool — Crypto Insight",
  description: "Smart beginner-optimized crypto portfolio allocation based on your budget.",
};

export default function PortfolioPage() {
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
            Portfolio Suggestion Tool
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {/* ── Page Title ── */}
        <div className="text-center pb-4">
          <div
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-5"
          >
            <span>💼</span>
            <span style={{ color: "#c4b5fd" }}>Smart Allocation for Beginners</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">Portfolio</span>{" "}
            <span style={{ color: "var(--foreground)" }}>Suggestion Tool</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#94a3b8" }}>
            Enter your budget and get a beginner-safe crypto portfolio split across stable coins,
            growth assets, and high-potential meme coins.
          </p>
        </div>

        {/* ── Allocation Strategy Summary ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tier 1", desc: "BTC + ETH", pct: "50%", color: "#a78bfa" },
            { label: "Tier 2", desc: "SOL / ADA / DOT", pct: "30%", color: "#60a5fa" },
            { label: "Tier 3", desc: "Meme coins", pct: "15%", color: "#f87171" },
            { label: "Reserve", desc: "USDC (DCA)", pct: "5%", color: "#4ade80" },
          ].map((t) => (
            <div
              key={t.label}
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              className="rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold mb-1" style={{ color: t.color }}>
                {t.pct}
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {t.label}
              </p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                {t.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Calculator ── */}
        <PortfolioCalculator />

        {/* ── Disclaimer ── */}
        <div
          style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)" }}
          className="rounded-2xl p-5 text-sm"
        >
          <p style={{ color: "#fbbf24" }} className="font-semibold mb-1">
            ⚠️ Risk Disclaimer &amp; DYOR Notice
          </p>
          <p style={{ color: "#94a3b8" }}>
            This portfolio suggestion is for <strong>educational purposes only</strong> and does{" "}
            <strong>not</strong> constitute financial advice. Cryptocurrency markets are highly
            volatile. Never invest more than you can afford to lose. Always do your own research
            (DYOR) before making any investment decisions. Past performance does not guarantee future
            results.
          </p>
        </div>
      </div>
    </main>
  );
}
