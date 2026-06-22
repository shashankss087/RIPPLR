/**
 * Demand forecasting for RIPPLR Orchestrator.
 *
 * Per the DaaS deck, replenishment should be driven by an "ML-powered demand
 * forecast" that raises POs ~72h before a projected stockout. We implement a
 * transparent, dependency-free forecaster that captures the signals that
 * actually move FMCG q-commerce demand:
 *
 *   - level:        exponentially-weighted moving average (recent days matter more)
 *   - trend:        slope across the window (growth/decline)
 *   - seasonality:  day-of-week multipliers (weekend q-commerce spikes)
 *
 * It also back-tests itself (predict the most recent 7 days from the prior
 * window) to report a forecast-accuracy %, mirroring the deck's 92% claim.
 */

export type DailyPoint = { date: string; units: number };

export type Forecast = {
  forecastVelocity: number; // blended units/day for the next horizon
  trendPerDay: number;
  dowFactors: number[]; // index 0=Sun .. 6=Sat
  next7: { date: string; units: number }[];
  accuracy: number; // 0..100, back-tested
  history: DailyPoint[];
};

const HALF_LIFE_DAYS = 10;

function ewmaLevel(units: number[]): number {
  if (units.length === 0) return 0;
  const decay = Math.pow(0.5, 1 / HALF_LIFE_DAYS);
  let weighted = 0;
  let weight = 0;
  // newest sample (end of array) gets weight 1, older decays
  for (let i = units.length - 1, w = 1; i >= 0; i--, w *= decay) {
    weighted += units[i] * w;
    weight += w;
  }
  return weight > 0 ? weighted / weight : 0;
}

function linearTrend(units: number[]): number {
  const n = units.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = units.reduce((s, u) => s + u, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (units[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function dayOfWeekFactors(points: DailyPoint[]): number[] {
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const p of points) {
    const d = new Date(p.date).getUTCDay();
    sums[d] += p.units;
    counts[d] += 1;
  }
  const dayAvgs = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
  const overall = dayAvgs.reduce((s, v) => s + v, 0) / 7 || 1;
  return dayAvgs.map((v) => (v > 0 ? v / overall : 1));
}

function predictUnits(level: number, trend: number, stepsAhead: number, dow: number, dowFactors: number[]): number {
  const base = Math.max(0, level + trend * stepsAhead);
  return base * (dowFactors[dow] ?? 1);
}

/** Back-test: forecast the last 7 days using only prior data, return accuracy %. */
function backtestAccuracy(points: DailyPoint[]): number {
  if (points.length < 14) return 0;
  const split = points.length - 7;
  const train = points.slice(0, split);
  const test = points.slice(split);
  const level = ewmaLevel(train.map((p) => p.units));
  const trend = linearTrend(train.map((p) => p.units));
  const dowFactors = dayOfWeekFactors(train);

  let errSum = 0;
  let actSum = 0;
  test.forEach((p, i) => {
    const dow = new Date(p.date).getUTCDay();
    const pred = predictUnits(level, trend, i + 1, dow, dowFactors);
    errSum += Math.abs(pred - p.units);
    actSum += p.units;
  });
  if (actSum === 0) return 0;
  const mape = errSum / actSum;
  return Math.max(0, Math.min(100, Math.round((1 - mape) * 1000) / 10));
}

export function forecast(points: DailyPoint[]): Forecast {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const units = sorted.map((p) => p.units);
  const level = ewmaLevel(units);
  const trend = linearTrend(units);
  const dowFactors = dayOfWeekFactors(sorted);

  const lastDate = sorted.length ? new Date(sorted[sorted.length - 1].date) : new Date();
  const next7: { date: string; units: number }[] = [];
  let horizonSum = 0;
  for (let i = 1; i <= 7; i++) {
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + i);
    const u = predictUnits(level, trend, i, d.getUTCDay(), dowFactors);
    next7.push({ date: d.toISOString().slice(0, 10), units: Math.round(u) });
    horizonSum += u;
  }

  return {
    forecastVelocity: Math.round((horizonSum / 7) * 10) / 10,
    trendPerDay: Math.round(trend * 100) / 100,
    dowFactors: dowFactors.map((f) => Math.round(f * 100) / 100),
    next7,
    accuracy: backtestAccuracy(sorted),
    history: sorted,
  };
}

/**
 * Days until the shelf hits zero given current stock and the forecast curve.
 * Walks the per-day forecast so weekend spikes are respected; falls back to a
 * flat divide beyond the 7-day horizon.
 */
export function projectedStockoutDays(onShelf: number, f: Forecast): number {
  let remaining = onShelf;
  for (let i = 0; i < f.next7.length; i++) {
    if (remaining <= 0) return i;
    remaining -= f.next7[i].units;
  }
  if (remaining <= 0) return f.next7.length;
  const daily = f.forecastVelocity || 0;
  if (daily <= 0) return 999;
  return Math.round((f.next7.length + remaining / daily) * 10) / 10;
}
