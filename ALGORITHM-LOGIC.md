# Algorithm Logic – Crypto Insight

## Overview

Crypto Insight uses a multi-factor scoring algorithm to assess risk and generate a smart verdict for any cryptocurrency. All calculations are performed server-side at request time using live CoinGecko data.

---

## Risk Score (0–100)

The risk score is composed of four weighted factors:

### 1. Market Cap (0–40 pts)

| Market Cap Range | Points | Label |
|---|---|---|
| < $10M | 40 | Micro-cap |
| $10M – $100M | 30 | Small-cap |
| $100M – $1B | 20 | Mid-cap |
| $1B – $10B | 10 | Large-cap |
| > $10B | 0 | Mega-cap |

### 2. Volatility — 24h Price Change (0–30 pts)

| Absolute 24h Change | Points | Label |
|---|---|---|
| > 30% | 30 | Extreme volatility |
| > 20% | 22 | High volatility |
| > 10% | 15 | Moderate volatility |
| ≤ 10% | 5 | Low volatility |

### 3. Volume / Market Cap Ratio (0–20 pts)

| Volume Ratio | Points | Label |
|---|---|---|
| > 50% | 20 | Very high |
| > 30% | 12 | High |
| ≤ 30% | 4 | Normal |

### 4. Meme Coin Category (0–10 pts)

If the coin's `categories` array contains the word "meme", 10 points are added.

### Risk Level Thresholds

| Score Range | Level |
|---|---|
| 0–24 | Low |
| 25–44 | Medium |
| 45–69 | High |
| 70–100 | Extreme |

---

## Verdict Algorithm

Verdicts are evaluated in priority order (first match wins):

1. **Extreme Risk → Avoid**  
   If risk level is Extreme, always return `AVOID` (High confidence).

2. **Hype Detection → Wait**  
   24h change > +20% AND volume ratio > 30%.  
   Strong pump with elevated volume — wait for consolidation (High confidence).

3. **Quality Dip → Buy**  
   24h change < −15% AND market cap > $1B.  
   Established project in significant dip — potential accumulation (Medium confidence).

4. **Falling Knife → Avoid**  
   24h change < −15% AND market cap ≤ $1B.  
   Small/mid-cap in sharp decline — too dangerous (Medium confidence).

5. **Healthy Growth → Neutral (positive)**  
   5% < 24h change ≤ 20% AND risk level is not High.  
   Moderate positive movement without excessive hype (Medium confidence).

6. **High Risk → Wait**  
   If risk level is High and no other rule matched.  
   More research and patience advised (Low confidence).

7. **Default → Neutral**  
   No strong signal — monitor for clearer entry (Low confidence).

---

## Price Zones

| Zone | Calculation | Purpose |
|---|---|---|
| Buy Below | Current Price × 0.90 | 10% discount target |
| Current | Live Price | Reference point |
| Avoid Above | Current Price × 1.15 | 15% premium ceiling |

---

## Confidence Levels

| Level | Meaning |
|---|---|
| High | Strong algorithmic signal; rule triggered with clear data |
| Medium | Moderate signal; confirm with additional research |
| Low | Weak signal; no clear directional bias |
