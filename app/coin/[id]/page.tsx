async function getCoinData(id: string) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}`,
      { cache: "no-store" }
    );

    return res.json();
  } catch (err) {
    console.log("Fetch error:", err);
    return null;
  }
}

export default async function CoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const coin = await getCoinData(id);
  const price = coin?.market_data?.current_price?.usd;
  const change24h = coin?.market_data?.price_change_percentage_24h;

  // 🔥 ADD LOGIC HERE (IMPORTANT)
  let verdict = "Neutral";

if (change24h !== undefined) {
  if (change24h > 15) {
    verdict = "Wait (Too much hype 🚀)";
  } else if (change24h < -10) {
    verdict = "Buy (Dip 📉)";
  } else {
    verdict = "Neutral";
  }
}

  return (
    <div style={{ padding: "20px" }}>
      <h1>{id.toUpperCase()}</h1>

      

      {/* 🔥 SHOW RESULT HERE */}
      <p>💰 Price: ${price}</p>
      <p>📉 24h Change: {change24h}%</p>
      <p>📊 Verdict: {verdict}</p>
    </div>
  );
}