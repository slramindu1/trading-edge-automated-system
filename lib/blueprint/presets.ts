import type { Edge, Node } from "@xyflow/react";
import { getCatalogDefinition } from "./catalog";
import { BlueprintNodeData, PIN_COLORS, PinDataType } from "./types";

export function createBlueprintNode(
  definitionId: string,
  position: { x: number; y: number },
  id?: string,
  paramOverrides?: Record<string, string | number>
): Node<BlueprintNodeData> {
  const def = getCatalogDefinition(definitionId);
  if (!def) {
    throw new Error(`Unknown blueprint node definition: ${definitionId}`);
  }
  return {
    id: id ?? `${definitionId}-${Math.random().toString(36).slice(2, 8)}`,
    type: "blueprintNode",
    position,
    data: {
      definitionId: def.id,
      label: def.label,
      subtitle: def.subtitle,
      category: def.category,
      params: { ...def.defaultParams, ...paramOverrides },
      paramFields: def.paramFields,
      inputs: def.inputs,
      outputs: def.outputs,
    },
  };
}

export function createBlueprintEdge(
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  pinType: PinDataType
): Edge {
  const color =
    pinType === "exec"
      ? "#E2E8F0"
      : pinType === "number"
        ? "#22C55E"
        : pinType === "boolean"
          ? "#EF4444"
          : pinType === "series"
            ? "#3B82F6"
            : "#F59E0B";
  return {
    id,
    source,
    sourceHandle,
    target,
    targetHandle,
    type: "smoothstep",
    animated: false,
    style: {
      stroke: color,
      strokeWidth: 1.5,
    },
  };
}

export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "mql5-ema-sma-ea",
    name: "MQL5 EMA/SMA Cross EA",
    description:
      "OnTick EA: EMA(9) crosses above SMA(21) during 08:00-17:00 session -> Market Buy.",
    nodes: [
      createBlueprintNode("on-tick", { x: 40, y: 110 }, "evt-tick", {
        symbol: "EURUSD",
      }),
      createBlueprintNode("ema", { x: 310, y: 210 }, "ind-ema-fast", {
        period: 9,
        source: "close",
      }),
      createBlueprintNode("sma", { x: 310, y: 390 }, "ind-sma-slow", {
        period: 21,
        source: "close",
      }),
      createBlueprintNode("crossover", { x: 600, y: 270 }, "cond-cross", {
        direction: "CROSS_ABOVE",
      }),
      createBlueprintNode("time-filter", { x: 600, y: 450 }, "cond-time", {
        startHour: 8,
        endHour: 17,
      }),
      createBlueprintNode("logic-gate", { x: 890, y: 320 }, "cond-and", {
        gate: "AND",
      }),
      createBlueprintNode("branch", { x: 1160, y: 110 }, "cond-branch"),
      createBlueprintNode("market-buy", { x: 1440, y: 60 }, "act-buy", {
        lotSize: 0.1,
        stopLoss: 300,
        takeProfit: 600,
        tag: "EMA_SMA_Long",
      }),
    ],
    edges: [
      createBlueprintEdge("e-mql-1", "evt-tick", "exec-out", "cond-branch", "exec-in", "exec"),
      createBlueprintEdge("e-mql-2", "ind-ema-fast", "value", "cond-cross", "fast", "number"),
      createBlueprintEdge("e-mql-3", "ind-sma-slow", "value", "cond-cross", "slow", "number"),
      createBlueprintEdge("e-mql-4", "cond-cross", "triggered", "cond-and", "a", "boolean"),
      createBlueprintEdge("e-mql-5", "cond-time", "allowed", "cond-and", "b", "boolean"),
      createBlueprintEdge("e-mql-6", "cond-and", "out", "cond-branch", "condition", "boolean"),
      createBlueprintEdge("e-mql-7", "cond-branch", "true", "act-buy", "exec-in", "exec"),
    ],
  },
  {
    id: "rsi-mean-reversion",
    name: "RSI Mean Reversion",
    description: "Buys oversold RSI (< 30) on 15m candle close with trailing stop & TP.",
    nodes: [
      createBlueprintNode("on-candle-close", { x: 40, y: 120 }, "evt-1", {
        symbol: "BTC/USDT",
        timeframe: "15m",
      }),
      createBlueprintNode("rsi", { x: 330, y: 270 }, "ind-rsi", {
        period: 14,
        source: "close",
      }),
      createBlueprintNode("threshold", { x: 610, y: 265 }, "cond-thresh", {
        operator: "<",
        threshold: 30,
      }),
      createBlueprintNode("branch", { x: 890, y: 110 }, "cond-branch"),
      createBlueprintNode("market-buy", { x: 1170, y: 50 }, "act-buy", {
        sizePct: 15,
        tag: "rsi_oversold",
      }),
      createBlueprintNode("set-stop-loss", { x: 1460, y: 50 }, "act-sl", {
        stopPct: 1.5,
        mode: "Trailing",
      }),
      createBlueprintNode("set-take-profit", { x: 1740, y: 50 }, "act-tp", {
        targetPct: 4.0,
      }),
    ],
    edges: [
      createBlueprintEdge("e-exec-1", "evt-1", "exec-out", "cond-branch", "exec-in", "exec"),
      createBlueprintEdge("e-series-1", "evt-1", "candles", "ind-rsi", "candles", "series"),
      createBlueprintEdge("e-num-1", "ind-rsi", "value", "cond-thresh", "value", "number"),
      createBlueprintEdge("e-bool-1", "cond-thresh", "result", "cond-branch", "condition", "boolean"),
      createBlueprintEdge("e-exec-2", "cond-branch", "true", "act-buy", "exec-in", "exec"),
      createBlueprintEdge("e-exec-3", "act-buy", "exec-out", "act-sl", "exec-in", "exec"),
      createBlueprintEdge("e-exec-4", "act-sl", "exec-out", "act-tp", "exec-in", "exec"),
    ],
  },
  {
    id: "ema-golden-cross",
    name: "EMA Crossover Momentum",
    description: "Enters long when EMA(9) crosses above EMA(21) on 1h candles.",
    nodes: [
      createBlueprintNode("on-candle-close", { x: 40, y: 150 }, "evt-1", {
        symbol: "ETH/USDT",
        timeframe: "1h",
      }),
      createBlueprintNode("ema", { x: 340, y: 240 }, "ema-fast", {
        period: 9,
        source: "close",
      }),
      createBlueprintNode("ema", { x: 340, y: 420 }, "ema-slow", {
        period: 21,
        source: "close",
      }),
      createBlueprintNode("crossover", { x: 640, y: 310 }, "cond-cross", {
        direction: "CROSS_ABOVE",
      }),
      createBlueprintNode("branch", { x: 920, y: 140 }, "cond-branch"),
      createBlueprintNode("market-buy", { x: 1200, y: 80 }, "act-buy", {
        sizePct: 20,
        tag: "ema_golden_cross",
      }),
      createBlueprintNode("set-stop-loss", { x: 1490, y: 80 }, "act-sl", {
        stopPct: 2.0,
        mode: "Fixed",
      }),
    ],
    edges: [
      createBlueprintEdge("e-1", "evt-1", "exec-out", "cond-branch", "exec-in", "exec"),
      createBlueprintEdge("e-2", "evt-1", "candles", "ema-fast", "candles", "series"),
      createBlueprintEdge("e-3", "evt-1", "candles", "ema-slow", "candles", "series"),
      createBlueprintEdge("e-4", "ema-fast", "value", "cond-cross", "fast", "number"),
      createBlueprintEdge("e-5", "ema-slow", "value", "cond-cross", "slow", "number"),
      createBlueprintEdge("e-6", "cond-cross", "triggered", "cond-branch", "condition", "boolean"),
      createBlueprintEdge("e-7", "cond-branch", "true", "act-buy", "exec-in", "exec"),
      createBlueprintEdge("e-8", "act-buy", "exec-out", "act-sl", "exec-in", "exec"),
    ],
  },
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Start from scratch with an empty Blueprint graph.",
    nodes: [],
    edges: [],
  },
];
