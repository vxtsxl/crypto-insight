import type { SuggestedPortfolio } from "./portfolioCalculations";

export function formatPortfolioData(portfolio: SuggestedPortfolio): string {
  const { budget, suggestions, generatedAt } = portfolio;

  const header = [
    "Crypto Portfolio Suggestion",
    `Generated: ${generatedAt.toLocaleString()}`,
    `Total Budget: $${budget.toLocaleString()}`,
    "",
    "Coin Name,Ticker,Amount (USD),Percentage,Risk Level",
    ...suggestions.map(
      (s) =>
        `${s.name},${s.ticker},$${s.amountUsd.toFixed(2)},${s.percentage}%,${s.riskLevel}`
    ),
    "",
    "Notes:",
    "- Tier 1 (50%): Established coins — Bitcoin & Ethereum",
    "- Tier 2 (30%): Growth potential — Solana, Cardano, Polkadot",
    "- Tier 3 (15%): High-risk, high-reward — Top meme coins",
    "- Reserve (5%): Dollar-cost averaging with stablecoins",
    "",
    "DISCLAIMER: Not financial advice. Always do your own research (DYOR).",
  ];

  return header.join("\n");
}

export function exportPortfolioToCSV(portfolio: SuggestedPortfolio): void {
  const csvContent = formatPortfolioData(portfolio);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `crypto-portfolio-${portfolio.budget}usd-${new Date().toISOString().split("T")[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
