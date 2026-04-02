import Link from "next/link";

interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    data?: {
      price_change_percentage_24h?: {
        usd?: number;
      };
      price?: string;
    };
  };
}

async function getTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/search/trending",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.coins ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const trending = await getTrendingCoins();

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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔮</span>
            <span
              className="text-xl font-bold gradient-text"
            >
              Crypto Insight
            </span>
          </div>
          <span
            style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)" }}
            className="text-xs px-3 py-1 rounded-full"
          >
            Powered by CoinGecko
          </span>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
        <div
          style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6"
        >
          <span>✨</span>
          <span style={{ color: "#c4b5fd" }}>AI-Powered Crypto Analysis</span>
        </div>

        <h1 className="text-5xl font-bold mb-4 leading-tight">
          <span className="gradient-text">Smart Crypto</span>
          <br />
          <span style={{ color: "var(--foreground)" }}>Analysis Tool</span>
        </h1>

        <p style={{ color: "#94a3b8" }} className="text-lg max-w-2xl mx-auto mb-8">
          Get instant risk scores, smart verdicts, and price zones for any
          cryptocurrency. Make informed decisions — not emotional ones.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/coin/bitcoin"
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Try Bitcoin Analysis →
          </Link>
          <Link
            href="/coin/ethereum"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
            className="px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition-opacity"
          >
            Analyse Ethereum
          </Link>
        </div>
      </section>

      {/* ── Features Banner ── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "📡", title: "Clear Signals", desc: "Buy, Wait, or Avoid — plain English verdicts for every coin." },
            { icon: "🛡️", title: "Risk Analysis", desc: "Market cap, volatility, and liquidity scored in seconds." },
            { icon: "🧠", title: "Smart Insights", desc: "Hype detection, dip identification, and falling knife warnings." },
          ].map((f) => (
            <div
              key={f.title}
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              className="card-hover rounded-2xl p-5 text-center"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-base mb-1" style={{ color: "var(--foreground)" }}>{f.title}</h3>
              <p className="text-sm" style={{ color: "#94a3b8" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trending Coins ── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl">🔥</span>
          <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Trending Now</h2>
          <span
            style={{ background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.3)" }}
            className="text-xs px-2 py-0.5 rounded-full ml-auto"
          >
            Live
          </span>
        </div>

        {trending.length === 0 ? (
          <div
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            className="rounded-2xl p-8 text-center"
          >
            <p style={{ color: "#94a3b8" }}>Unable to load trending data. Check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.slice(0, 9).map(({ item }) => {
              const change = item.data?.price_change_percentage_24h?.usd;
              const isPositive = typeof change === "number" && change >= 0;
              const changeStr =
                typeof change === "number"
                  ? `${isPositive ? "+" : ""}${change.toFixed(2)}%`
                  : "—";

              return (
                <Link
                  key={item.id}
                  href={`/coin/${item.id}`}
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                  className="card-hover rounded-2xl p-4 flex items-center gap-4 no-underline group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumb}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: "var(--foreground)" }}>
                      {item.name}
                    </p>
                    <p className="text-xs uppercase" style={{ color: "#64748b" }}>
                      {item.symbol}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: isPositive ? "#4ade80" : "#f87171" }}
                    >
                      {changeStr}
                    </p>
                    <p className="text-xs" style={{ color: "#64748b" }}>24h</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: "var(--foreground)" }}>
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: "01", icon: "🔍", title: "Search a Coin", desc: "Enter any CoinGecko coin ID in the URL — e.g. /coin/bitcoin or /coin/pepe." },
            { step: "02", icon: "⚙️", title: "We Analyse It", desc: "Our algorithm scores risk using market cap, volatility, volume, and categories." },
            { step: "03", icon: "💡", title: "Get Your Verdict", desc: "Receive a clear Buy / Wait / Avoid verdict with a confidence level and price zones." },
          ].map((s) => (
            <div
              key={s.step}
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              className="rounded-2xl p-6"
            >
              <div
                className="text-xs font-mono mb-3"
                style={{ color: "#7c3aed" }}
              >
                {s.step}
              </div>
              <div className="text-2xl mb-2">{s.icon}</div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--foreground)" }}>{s.title}</h3>
              <p className="text-sm" style={{ color: "#94a3b8" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Coin Search Guide ── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}
          className="rounded-2xl p-6"
        >
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
            <span>🗺️</span> Quick Coin Reference
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Bitcoin", id: "bitcoin" },
              { label: "Ethereum", id: "ethereum" },
              { label: "Solana", id: "solana" },
              { label: "BNB", id: "binancecoin" },
              { label: "XRP", id: "ripple" },
              { label: "PEPE", id: "pepe" },
              { label: "Dogecoin", id: "dogecoin" },
              { label: "Shiba Inu", id: "shiba-inu" },
            ].map((c) => (
              <Link
                key={c.id}
                href={`/coin/${c.id}`}
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "#a78bfa" }}
                className="rounded-xl px-3 py-2 text-center hover:opacity-80 transition-opacity font-medium"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div
          style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)" }}
          className="rounded-2xl p-5 text-sm"
        >
          <p style={{ color: "#fbbf24" }} className="font-semibold mb-1">⚠️ Disclaimer</p>
          <p style={{ color: "#94a3b8" }}>
            Crypto Insight is for educational purposes only. Nothing here constitutes financial advice.
            Cryptocurrency markets are highly volatile — always do your own research (DYOR) and never
            invest more than you can afford to lose.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{ borderTop: "1px solid var(--card-border)", color: "#64748b" }}
        className="text-center text-sm py-6 mt-4"
      >
        <p>
          🔮 Crypto Insight — Built with{" "}
          <a href="https://nextjs.org" style={{ color: "#7c3aed" }} className="hover:underline">
            Next.js
          </a>{" "}
          &amp; powered by{" "}
          <a href="https://coingecko.com" style={{ color: "#7c3aed" }} className="hover:underline">
            CoinGecko
          </a>
        </p>
        <p className="mt-1">Not financial advice. DYOR.</p>
      </footer>
    </main>
  );
}
