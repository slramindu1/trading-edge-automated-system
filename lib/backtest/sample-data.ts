import { OhlcvBar } from "./types";

/**
 * Generates 500 deterministic 1H EURUSD OHLCV bars with realistic multi-cycle
 * trends and pullbacks so crossover, RSI, and session-filtered EAs trigger
 * both winning and losing trades.
 */
export function generateSampleEurUsd1H(barCount = 500): OhlcvBar[] {
  const bars: OhlcvBar[] = [];
  // Start around 2026-09-01 00:00:00 UTC
  const startTime = 1788220800;
  const hourSec = 3600;

  let price = 1.0845;
  // Deterministic LCG PRNG
  let seed = 421337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < barCount; i++) {
    const time = startTime + i * hourSec;
    const utcHour = new Date(time * 1000).getUTCHours();

    // Higher volatility during London/NY overlap (07:00 - 17:00 UTC)
    const sessionVol = utcHour >= 7 && utcHour <= 17 ? 0.0014 : 0.00055;
    // Multi-frequency cyclical drift so trends reverse cleanly
    const trend =
      Math.sin(i / 28) * 0.00065 + Math.cos(i / 63) * 0.00035;
    const noise = (nextRand() - 0.5) * 2 * sessionVol;

    const open = Number(price.toFixed(5));
    const close = Number(Math.max(1.02, open + trend + noise).toFixed(5));
    const wickUp = nextRand() * sessionVol * 0.9;
    const wickDown = nextRand() * sessionVol * 0.9;
    const high = Number((Math.max(open, close) + wickUp).toFixed(5));
    const low = Number((Math.min(open, close) - wickDown).toFixed(5));
    const volume = Math.round(
      (utcHour >= 7 && utcHour <= 17 ? 1400 : 450) + nextRand() * 900
    );

    bars.push({ time, open, high, low, close, volume });
    price = close;
  }

  return bars;
}

/**
 * Parses a standard OHLCV CSV string (with or without header row).
 * Supports UNIX timestamps (seconds or ms) and ISO date/time strings.
 */
export function parseOhlcvCsv(csvText: string): OhlcvBar[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const firstCols = lines[0].split(/[,;\t]/).map((c) => c.trim().toLowerCase());
  const hasHeader = firstCols.some((c) =>
    ["time", "date", "datetime", "timestamp", "open", "close"].includes(c)
  );

  let idxTime = 0;
  let idxOpen = 1;
  let idxHigh = 2;
  let idxLow = 3;
  let idxClose = 4;
  let idxVol = 5;

  if (hasHeader) {
    const findCol = (names: string[], fallback: number) => {
      const idx = firstCols.findIndex((c) => names.includes(c));
      return idx !== -1 ? idx : fallback;
    };
    idxTime = findCol(["time", "date", "datetime", "timestamp"], 0);
    idxOpen = findCol(["open"], 1);
    idxHigh = findCol(["high"], 2);
    idxLow = findCol(["low"], 3);
    idxClose = findCol(["close"], 4);
    idxVol = findCol(["volume", "tick_volume", "vol"], 5);
  }

  const bars: OhlcvBar[] = [];
  const startRow = hasHeader ? 1 : 0;

  for (let r = startRow; r < lines.length; r++) {
    const cols = lines[r].split(/[,;\t]/).map((c) => c.trim());
    if (cols.length < 5) continue;

    const rawTime = cols[idxTime];
    let timeSec: number;
    if (/^\d+$/.test(rawTime)) {
      const num = Number(rawTime);
      timeSec = num > 1e12 ? Math.floor(num / 1000) : num;
    } else {
      const parsed = Date.parse(rawTime.replace(/\./g, "-"));
      if (Number.isNaN(parsed)) continue;
      timeSec = Math.floor(parsed / 1000);
    }

    const open = Number(cols[idxOpen]);
    const high = Number(cols[idxHigh]);
    const low = Number(cols[idxLow]);
    const close = Number(cols[idxClose]);
    const volume = cols[idxVol] !== undefined ? Number(cols[idxVol]) || 0 : 0;

    if (
      Number.isFinite(timeSec) &&
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close)
    ) {
      bars.push({ time: timeSec, open, high, low, close, volume });
    }
  }

  if (bars.length === 0) {
    throw new Error(
      "Could not parse any valid OHLCV rows. Expected: time,open,high,low,close[,volume]."
    );
  }

  bars.sort((a, b) => a.time - b.time);
  return bars;
}
