import type { Edge, Node } from "@xyflow/react";
import { BlueprintNodeData } from "../blueprint/types";
import { runBacktest } from "./engine";
import { BacktestConfig, OhlcvBar } from "./types";

export interface TunableParam {
  nodeId: string;
  nodeLabel: string;
  paramKey: string;
  paramLabel: string;
  currentValue: number;
}

export interface ParamRange {
  nodeId: string;
  paramKey: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface OptimizationRow {
  id: number;
  name: string;
  paramAValue: number;
  paramBValue: number;
  totalReturn: number;
  returnPct: number;
  drawdownPct: number;
  profitFactor: number;
  cagrPct: number;
  winRate: number;
  startBalance: number;
  endBalance: number;
  trades: number;
  recoveryFactor: number;
  expectancy: number;
}

export function extractTunableParams(
  nodes: Node<BlueprintNodeData>[]
): TunableParam[] {
  const out: TunableParam[] = [];
  for (const n of nodes) {
    for (const f of n.data.paramFields) {
      if (f.type === "number") {
        out.push({
          nodeId: n.id,
          nodeLabel: n.data.label,
          paramKey: f.key,
          paramLabel: f.label,
          currentValue: Number(n.data.params[f.key] ?? 0),
        });
      }
    }
  }
  return out;
}

function generateRangeValues(min: number, max: number, step: number): number[] {
  const safeStep = step > 0 ? step : 1;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const vals: number[] = [];
  for (let v = lo; v <= hi + safeStep * 0.001 && vals.length < 12; v += safeStep) {
    vals.push(Number(v.toFixed(4)));
  }
  return vals.length > 0 ? vals : [lo];
}

export function runGridOptimization(
  strategyName: string,
  nodes: Node<BlueprintNodeData>[],
  edges: Edge[],
  bars: OhlcvBar[],
  config: BacktestConfig,
  rangeA: ParamRange,
  rangeB: ParamRange
): OptimizationRow[] {
  const valsA = generateRangeValues(rangeA.min, rangeA.max, rangeA.step);
  const valsB = generateRangeValues(rangeB.min, rangeB.max, rangeB.step);
  const rows: OptimizationRow[] = [];
  let runIdx = 1;

  for (const valA of valsA) {
    for (const valB of valsB) {
      const clonedNodes = nodes.map((n) => {
        if (n.id !== rangeA.nodeId && n.id !== rangeB.nodeId) return n;
        const nextParams = { ...n.data.params };
        if (n.id === rangeA.nodeId) nextParams[rangeA.paramKey] = valA;
        if (n.id === rangeB.nodeId) nextParams[rangeB.paramKey] = valB;
        return {
          ...n,
          data: { ...n.data, params: nextParams },
        };
      });

      const res = runBacktest(clonedNodes, edges, bars, config);
      const m = res.metrics;
      const recoveryFactor =
        m.maxDrawdown > 0
          ? Number((m.netProfit / m.maxDrawdown).toFixed(2))
          : m.netProfit > 0
            ? 9.99
            : 0;
      const expectancy =
        m.totalTrades > 0
          ? Number((m.netProfit / m.totalTrades).toFixed(2))
          : 0;

      rows.push({
        id: runIdx,
        name: `${strategyName} #${runIdx}`,
        paramAValue: valA,
        paramBValue: valB,
        totalReturn: m.netProfit,
        returnPct: m.returnPct,
        drawdownPct: m.maxDrawdownPct,
        profitFactor: m.profitFactor,
        cagrPct: Number((m.returnPct * 1.2).toFixed(2)),
        winRate: m.winRate,
        startBalance: config.initialBalance,
        endBalance: m.finalBalance,
        trades: m.totalTrades,
        recoveryFactor,
        expectancy,
      });
      runIdx++;
    }
  }

  rows.sort((a, b) => b.totalReturn - a.totalReturn);
  return rows;
}
