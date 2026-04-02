"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { SuggestedCoin } from "@/lib/portfolioCalculations";

interface AllocationChartProps {
  suggestions: SuggestedCoin[];
}

const TIER_COLORS: Record<string, string> = {
  "Tier 1": "#7c3aed",
  "Tier 2": "#2563eb",
  "Tier 3": "#f87171",
  Reserve: "#4ade80",
};

interface TooltipPayloadItem {
  payload: { name: string; ticker: string; amountUsd: number; percentage: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#1a1a2e",
        border: "1px solid #2d2d4a",
        borderRadius: 12,
        padding: "10px 14px",
        fontSize: 13,
        color: "#e2e8f0",
      }}
    >
      <p className="font-semibold">{d.name}</p>
      <p style={{ color: "#94a3b8" }}>
        {d.percentage}% — ${d.amountUsd.toFixed(2)}
      </p>
    </div>
  );
}

export default function AllocationChart({ suggestions }: AllocationChartProps) {
  const data = suggestions.map((s) => ({
    name: s.name,
    ticker: s.ticker,
    amountUsd: s.amountUsd,
    percentage: s.percentage,
    fill: TIER_COLORS[s.tier] ?? "#7c3aed",
    value: s.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          label={({ ticker, percentage }) => `${ticker} ${percentage}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
