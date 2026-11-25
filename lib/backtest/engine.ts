import type { Edge, Node } from "@xyflow/react";
import { BlueprintNodeData } from "../blueprint/types";
import {
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  OhlcvBar,
} from "./types";

function getBarSource(bar: OhlcvBar, source: string): number {
  switch (source) {
    case "open":
      return bar.open;
    case "high":
      return bar.high;
    case "low":
      return bar.low;
    case "hlc3":
      return (bar.high + bar.low + bar.close) / 3;
    default:
      return bar.close;
  }
}

function computeSmaSeries(bars: OhlcvBar[], period: number, source: string): number[] {
  const out = new Array<number>(bars.length).fill(NaN);
  const p = Math.max(1, Math.floor(period));
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += getBarSource(bars[i], source);
    if (i >= p) {
      sum -= getBarSource(bars[i - p], source);
    }
    if (i >= p - 1) {
      out[i] = sum / p;
    }
  }
  return out;
}

function computeEmaSeries(bars: OhlcvBar[], period: number, source: string): number[] {
  const out = new Array<number>(bars.length).fill(NaN);
  const p = Math.max(1, Math.floor(period));
  const k = 2 / (p + 1);
  let ema = NaN;
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    const val = getBarSource(bars[i], source);
    if (i < p - 1) {
      sum += val;
    } else if (i === p - 1) {
      sum += val;
      ema = sum / p;
      out[i] = ema;
    } else {
      ema = val * k + ema * (1 - k);
      out[i] = ema;
    }
  }
  return out;
}

function computeRsiSeries(bars: OhlcvBar[], period: number, source: string): number[] {
  const out = new Array<number>(bars.length).fill(NaN);
  const p = Math.max(2, Math.floor(period));
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < bars.length; i++) {
    const diff = getBarSource(bars[i], source) - getBarSource(bars[i - 1], source);
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    if (i <= p) {
      avgGain += gain;
      avgLoss += loss;
      if (i === p) {
        avgGain /= p;
        avgLoss /= p;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
      }
    } else {
      avgGain = (avgGain * (p - 1) + gain) / p;
      avgLoss = (avgLoss * (p - 1) + loss) / p;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    }
  }
  return out;
}

interface OpenPosition {
  side: "BUY" | "SELL";
  entryTime: number;
  entryPrice: number;
  lots: number;
  sl: number | null;
  tp: number | null;
  entryCommission: number;
  tag: string;
}

export function runBacktest(
  nodes: Node<BlueprintNodeData>[],
  edges: Edge[],
  bars: OhlcvBar[],
  config: BacktestConfig
): BacktestResult {
  const t0 = performance.now();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Precompute indicator series for all indicator nodes
  const indicatorCache = new Map<string, number[]>();
  for (const n of nodes) {
    const d = n.data;
    if (d.definitionId === "sma") {
      indicatorCache.set(
        n.id,
        computeSmaSeries(
          bars,
          Number(d.params.period ?? 50),
          String(d.params.source ?? "close")
        )
      );
    } else if (d.definitionId === "ema") {
      indicatorCache.set(
        n.id,
        computeEmaSeries(
          bars,
          Number(d.params.period ?? 20),
          String(d.params.source ?? "close")
        )
      );
    } else if (d.definitionId === "rsi") {
      indicatorCache.set(
        n.id,
        computeRsiSeries(
          bars,
          Number(d.params.period ?? 14),
          String(d.params.source ?? "close")
        )
      );
    }
  }

  const findIncoming = (targetId: string, handleId: string): Edge | undefined =>
    edges.find((e) => e.target === targetId && e.targetHandle === handleId);

  const findOutgoingExec = (sourceId: string, handleId: string): Edge[] =>
    edges.filter((e) => e.source === sourceId && e.sourceHandle === handleId);

  const evalNumeric = (
    sourceId: string,
    sourceHandle: string,
    barIdx: number
  ): number => {
    const node = nodeMap.get(sourceId);
    if (!node) return NaN;
    const d = node.data;

    if (d.category === "events") {
      const b = bars[barIdx];
      if (sourceHandle === "close" || sourceHandle === "bid") return b.close;
      if (sourceHandle === "ask")
        return b.close + config.spreadPips * config.pipSize;
      if (sourceHandle === "spread") return config.spreadPips * config.pipSize;
      if (sourceHandle === "volume") return b.volume;
      return b.close;
    }

    const cached = indicatorCache.get(sourceId);
    if (cached) {
      return cached[barIdx];
    }

    return NaN;
  };

  const evalBoolean = (
    sourceId: string,
    sourceHandle: string,
    barIdx: number
  ): boolean => {
    const node = nodeMap.get(sourceId);
    if (!node) return false;
    const d = node.data;

    if (d.definitionId === "time-filter") {
      const startHr = Number(d.params.startHour ?? 8);
      const endHr = Number(d.params.endHour ?? 17);
      const hour = new Date(bars[barIdx].time * 1000).getUTCHours();
      if (startHr <= endHr) {
        return hour >= startHr && hour < endHr;
      }
      return hour >= startHr || hour < endHr;
    }

    if (d.definitionId === "threshold") {
      const edge = findIncoming(sourceId, "value");
      if (!edge || !edge.sourceHandle) return false;
      const val = evalNumeric(edge.source, edge.sourceHandle, barIdx);
      if (!Number.isFinite(val)) return false;
      const thresh = Number(d.params.threshold ?? 30);
      const op = String(d.params.operator ?? "<");
      switch (op) {
        case "<":
          return val < thresh;
        case "<=":
          return val <= thresh;
        case ">":
          return val > thresh;
        case ">=":
          return val >= thresh;
        case "==":
          return Math.abs(val - thresh) < 1e-6;
        default:
          return false;
      }
    }

    if (d.definitionId === "compare") {
      const edgeA = findIncoming(sourceId, "a");
      const edgeB = findIncoming(sourceId, "b");
      if (!edgeA?.sourceHandle || !edgeB?.sourceHandle) return false;
      const a = evalNumeric(edgeA.source, edgeA.sourceHandle, barIdx);
      const b = evalNumeric(edgeB.source, edgeB.sourceHandle, barIdx);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      const op = String(d.params.operator ?? ">");
      switch (op) {
        case ">":
          return a > b;
        case ">=":
          return a >= b;
        case "<":
          return a < b;
        case "<=":
          return a <= b;
        case "==":
          return Math.abs(a - b) < 1e-6;
        default:
          return false;
      }
    }

    if (d.definitionId === "crossover") {
      if (barIdx < 1) return false;
      const edgeFast = findIncoming(sourceId, "fast");
      const edgeSlow = findIncoming(sourceId, "slow");
      if (!edgeFast?.sourceHandle || !edgeSlow?.sourceHandle) return false;

      const fastCurr = evalNumeric(edgeFast.source, edgeFast.sourceHandle, barIdx);
      const slowCurr = evalNumeric(edgeSlow.source, edgeSlow.sourceHandle, barIdx);
      const fastPrev = evalNumeric(edgeFast.source, edgeFast.sourceHandle, barIdx - 1);
      const slowPrev = evalNumeric(edgeSlow.source, edgeSlow.sourceHandle, barIdx - 1);

      if (
        !Number.isFinite(fastCurr) ||
        !Number.isFinite(slowCurr) ||
        !Number.isFinite(fastPrev) ||
        !Number.isFinite(slowPrev)
      ) {
        return false;
      }

      if (d.params.direction === "CROSS_BELOW") {
        return fastCurr < slowCurr && fastPrev >= slowPrev;
      }
      return fastCurr > slowCurr && fastPrev <= slowPrev;
    }

    if (d.definitionId === "logic-gate") {
      const edgeA = findIncoming(sourceId, "a");
      const edgeB = findIncoming(sourceId, "b");
      const a = edgeA?.sourceHandle
        ? evalBoolean(edgeA.source, edgeA.sourceHandle, barIdx)
        : false;
      const b = edgeB?.sourceHandle
        ? evalBoolean(edgeB.source, edgeB.sourceHandle, barIdx)
        : false;
      const gate = String(d.params.gate ?? "AND");
      if (gate === "OR") return a || b;
      if (gate === "XOR") return a !== b;
      return a && b;
    }

    return false;
  };

  const entryEvent =
    nodes.find((n) => n.data.definitionId === "on-tick") ??
    nodes.find((n) => n.data.category === "events") ??
    null;

  let balance = config.initialBalance;
  let peakEquity = config.initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  let openPos = null as OpenPosition | null;
  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; value: number }[] = [];
  const spreadPrice = config.spreadPips * config.pipSize;
  const pointValue = config.pipSize * 0.1; // 1 point = 0.1 pip on 5-digit FX

  const closeOpenPosition = (
    exitTime: number,
    exitPrice: number,
    reason: BacktestTrade["exitReason"]
  ) => {
    if (!openPos) return;
    const priceDiff =
      openPos.side === "BUY"
        ? exitPrice - openPos.entryPrice
        : openPos.entryPrice - exitPrice;
    const grossPnl = priceDiff * openPos.lots * config.contractSize;
    const exitCommission = (config.commissionPerLot * openPos.lots) / 2;
    const totalCommission = openPos.entryCommission + exitCommission;
    const netPnl = grossPnl - totalCommission;

    balance += netPnl;
    trades.push({
      id: trades.length + 1,
      side: openPos.side,
      entryTime: openPos.entryTime,
      exitTime,
      entryPrice: Number(openPos.entryPrice.toFixed(5)),
      exitPrice: Number(exitPrice.toFixed(5)),
      lots: openPos.lots,
      sl: openPos.sl !== null ? Number(openPos.sl.toFixed(5)) : null,
      tp: openPos.tp !== null ? Number(openPos.tp.toFixed(5)) : null,
      grossPnl: Number(grossPnl.toFixed(2)),
      commission: Number(totalCommission.toFixed(2)),
      netPnl: Number(netPnl.toFixed(2)),
      exitReason: reason,
      tag: openPos.tag,
    });
    openPos = null;
  };

  const executeFlow = (
    nodeId: string,
    barIdx: number,
    visited: Set<string>
  ) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;
    const d = node.data;
    const bar = bars[barIdx];

    if (d.definitionId === "branch") {
      const condEdge = findIncoming(nodeId, "condition");
      const cond = condEdge?.sourceHandle
        ? evalBoolean(condEdge.source, condEdge.sourceHandle, barIdx)
        : false;
      const branchEdges = findOutgoingExec(nodeId, cond ? "true" : "false");
      for (const e of branchEdges) {
        executeFlow(e.target, barIdx, new Set(visited));
      }
      return;
    }

    if (d.definitionId === "market-buy" && !openPos) {
      const lots = Math.max(0.01, Number(d.params.lotSize ?? 0.1));
      const slPts = Number(d.params.stopLoss ?? 0);
      const tpPts = Number(d.params.takeProfit ?? 0);
      const entryPrice = bar.close + spreadPrice;
      openPos = {
        side: "BUY",
        entryTime: bar.time,
        entryPrice,
        lots,
        sl: slPts > 0 ? entryPrice - slPts * pointValue : null,
        tp: tpPts > 0 ? entryPrice + tpPts * pointValue : null,
        entryCommission: (config.commissionPerLot * lots) / 2,
        tag: String(d.params.tag ?? "Buy"),
      };
    } else if (d.definitionId === "market-sell" && !openPos) {
      const lots = Math.max(0.01, Number(d.params.lotSize ?? 0.1));
      const slPts = Number(d.params.stopLoss ?? 0);
      const tpPts = Number(d.params.takeProfit ?? 0);
      const entryPrice = bar.close - spreadPrice;
      openPos = {
        side: "SELL",
        entryTime: bar.time,
        entryPrice,
        lots,
        sl: slPts > 0 ? entryPrice + slPts * pointValue : null,
        tp: tpPts > 0 ? entryPrice - tpPts * pointValue : null,
        entryCommission: (config.commissionPerLot * lots) / 2,
        tag: String(d.params.tag ?? "Sell"),
      };
    } else if (d.definitionId === "close-position" && openPos) {
      const exitPrice =
        openPos.side === "BUY" ? bar.close : bar.close + spreadPrice;
      closeOpenPosition(bar.time, exitPrice, "SIGNAL");
    }

    for (const next of findOutgoingExec(nodeId, "exec-out")) {
      executeFlow(next.target, barIdx, new Set(visited));
    }
  };

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    // 1. Check SL / TP intrabar
    if (openPos) {
      if (openPos.side === "BUY") {
        if (openPos.sl !== null && bar.low <= openPos.sl) {
          closeOpenPosition(bar.time, openPos.sl, "SL");
        } else if (openPos.tp !== null && bar.high >= openPos.tp) {
          closeOpenPosition(bar.time, openPos.tp, "TP");
        }
      } else {
        const askHigh = bar.high + spreadPrice;
        const askLow = bar.low + spreadPrice;
        if (openPos.sl !== null && askHigh >= openPos.sl) {
          closeOpenPosition(bar.time, openPos.sl, "SL");
        } else if (openPos.tp !== null && askLow <= openPos.tp) {
          closeOpenPosition(bar.time, openPos.tp, "TP");
        }
      }
    }

    // 2. Run Blueprint execution graph
    if (entryEvent) {
      for (const e of findOutgoingExec(entryEvent.id, "exec-out")) {
        executeFlow(e.target, i, new Set([entryEvent.id]));
      }
    }

    // 3. Mark-to-market equity & Drawdown
    let floating = 0;
    if (openPos) {
      const markPrice =
        openPos.side === "BUY" ? bar.close : bar.close + spreadPrice;
      const diff =
        openPos.side === "BUY"
          ? markPrice - openPos.entryPrice
          : openPos.entryPrice - markPrice;
      floating = diff * openPos.lots * config.contractSize;
    }

    const equity = balance + floating;
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    const dd = peakEquity - equity;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peakEquity > 0 ? (dd / peakEquity) * 100 : 0;
    }

    equityCurve.push({ time: bar.time, value: Number(equity.toFixed(2)) });
  }

  // Close any open position on the final bar
  if (openPos && bars.length > 0) {
    const lastBar = bars[bars.length - 1];
    closeOpenPosition(lastBar.time, lastBar.close, "END");
  }

  const winningTrades = trades.filter((t) => t.netPnl > 0);
  const losingTrades = trades.filter((t) => t.netPnl <= 0);
  const grossWins = winningTrades.reduce((acc, t) => acc + t.netPnl, 0);
  const grossLosses = Math.abs(
    losingTrades.reduce((acc, t) => acc + t.netPnl, 0)
  );
  const netProfit = balance - config.initialBalance;

  return {
    bars,
    trades,
    equityCurve,
    durationMs: Math.round(performance.now() - t0),
    metrics: {
      netProfit: Number(netProfit.toFixed(2)),
      returnPct: Number(
        ((netProfit / config.initialBalance) * 100).toFixed(2)
      ),
      winRate:
        trades.length > 0
          ? Number(((winningTrades.length / trades.length) * 100).toFixed(1))
          : 0,
      profitFactor:
        grossLosses > 0
          ? Number((grossWins / grossLosses).toFixed(2))
          : grossWins > 0
            ? 99.99
            : 0,
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      finalBalance: Number(balance.toFixed(2)),
    },
  };
}
