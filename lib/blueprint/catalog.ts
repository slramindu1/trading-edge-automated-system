import { BlueprintNodeDefinition } from "./types";

export const NODE_CATALOG: BlueprintNodeDefinition[] = [
  // ======================== EVENTS ========================
  {
    id: "on-candle-close",
    label: "On Candle Close",
    subtitle: "Market Event",
    category: "events",
    description: "Fires execution flow when a new OHLCV bar closes.",
    defaultParams: {
      symbol: "BTC/USDT",
      timeframe: "15m",
    },
    paramFields: [
      { key: "symbol", label: "Symbol", type: "text" },
      {
        key: "timeframe",
        label: "Timeframe",
        type: "select",
        options: ["1m", "5m", "15m", "1h", "4h", "1d"],
      },
    ],
    inputs: [],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
      { id: "candles", label: "Candles", type: "series", direction: "output" },
      { id: "close", label: "Close", type: "number", direction: "output" },
      { id: "volume", label: "Volume", type: "number", direction: "output" },
    ],
  },
  {
    id: "on-tick",
    label: "On Price Tick",
    subtitle: "Realtime Event",
    category: "events",
    description: "Fires on every L1 orderbook bid/ask update.",
    defaultParams: {
      symbol: "ETH/USDT",
    },
    paramFields: [{ key: "symbol", label: "Symbol", type: "text" }],
    inputs: [],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
      { id: "bid", label: "Bid", type: "number", direction: "output" },
      { id: "ask", label: "Ask", type: "number", direction: "output" },
      { id: "spread", label: "Spread", type: "number", direction: "output" },
    ],
  },
  {
    id: "on-order-fill",
    label: "On Order Fill",
    subtitle: "Execution Event",
    category: "events",
    description: "Triggers when an active order is filled on the exchange.",
    defaultParams: {
      filterSide: "ANY",
    },
    paramFields: [
      {
        key: "filterSide",
        label: "Side",
        type: "select",
        options: ["ANY", "BUY", "SELL"],
      },
    ],
    inputs: [],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
      { id: "fillPrice", label: "Fill Price", type: "number", direction: "output" },
      { id: "fillQty", label: "Filled Qty", type: "number", direction: "output" },
      { id: "side", label: "Side", type: "string", direction: "output" },
    ],
  },

  // ======================== INDICATORS ========================
  {
    id: "rsi",
    label: "RSI",
    subtitle: "Momentum Oscillator",
    category: "indicators",
    description: "Relative Strength Index (0 - 100).",
    defaultParams: {
      period: 14,
      source: "close",
    },
    paramFields: [
      { key: "period", label: "Period", type: "number", min: 2, max: 200, step: 1 },
      {
        key: "source",
        label: "Source",
        type: "select",
        options: ["close", "open", "high", "low", "hlc3"],
      },
    ],
    inputs: [
      { id: "candles", label: "Candles", type: "series", direction: "input" },
    ],
    outputs: [
      { id: "value", label: "RSI", type: "number", direction: "output" },
    ],
  },
  {
    id: "sma",
    label: "SMA",
    subtitle: "Simple Moving Avg",
    category: "indicators",
    description: "Simple Moving Average over N bars (iMA MODE_SMA).",
    defaultParams: {
      period: 50,
      source: "close",
    },
    paramFields: [
      { key: "period", label: "Period", type: "number", min: 2, max: 500, step: 1 },
      {
        key: "source",
        label: "Source",
        type: "select",
        options: ["close", "open", "high", "low"],
      },
    ],
    inputs: [
      { id: "candles", label: "Candles", type: "series", direction: "input" },
    ],
    outputs: [
      { id: "value", label: "SMA", type: "number", direction: "output" },
    ],
  },
  {
    id: "ema",
    label: "EMA",
    subtitle: "Trend Average",
    category: "indicators",
    description: "Exponential Moving Average over N bars.",
    defaultParams: {
      period: 20,
      source: "close",
    },
    paramFields: [
      { key: "period", label: "Period", type: "number", min: 2, max: 500, step: 1 },
      {
        key: "source",
        label: "Source",
        type: "select",
        options: ["close", "open", "high", "low"],
      },
    ],
    inputs: [
      { id: "candles", label: "Candles", type: "series", direction: "input" },
    ],
    outputs: [
      { id: "value", label: "EMA", type: "number", direction: "output" },
    ],
  },
  {
    id: "macd",
    label: "MACD",
    subtitle: "Trend & Momentum",
    category: "indicators",
    description: "Moving Average Convergence Divergence.",
    defaultParams: {
      fast: 12,
      slow: 26,
      signal: 9,
    },
    paramFields: [
      { key: "fast", label: "Fast", type: "number", min: 2, max: 100, step: 1 },
      { key: "slow", label: "Slow", type: "number", min: 2, max: 200, step: 1 },
      { key: "signal", label: "Signal", type: "number", min: 2, max: 100, step: 1 },
    ],
    inputs: [
      { id: "candles", label: "Candles", type: "series", direction: "input" },
    ],
    outputs: [
      { id: "macd", label: "MACD", type: "number", direction: "output" },
      { id: "signal", label: "Signal", type: "number", direction: "output" },
      { id: "hist", label: "Histogram", type: "number", direction: "output" },
    ],
  },
  {
    id: "bollinger",
    label: "Bollinger Bands",
    subtitle: "Volatility Envelope",
    category: "indicators",
    description: "Upper, middle, and lower standard deviation bands.",
    defaultParams: {
      period: 20,
      stdDev: 2.0,
    },
    paramFields: [
      { key: "period", label: "Period", type: "number", min: 2, max: 200, step: 1 },
      { key: "stdDev", label: "StdDev", type: "number", min: 0.5, max: 5, step: 0.1 },
    ],
    inputs: [
      { id: "candles", label: "Candles", type: "series", direction: "input" },
    ],
    outputs: [
      { id: "upper", label: "Upper", type: "number", direction: "output" },
      { id: "middle", label: "Middle", type: "number", direction: "output" },
      { id: "lower", label: "Lower", type: "number", direction: "output" },
    ],
  },
  {
    id: "atr",
    label: "ATR",
    subtitle: "Volatility Measure",
    category: "indicators",
    description: "Average True Range for dynamic stop sizing.",
    defaultParams: {
      period: 14,
    },
    paramFields: [
      { key: "period", label: "Period", type: "number", min: 2, max: 100, step: 1 },
    ],
    inputs: [
      { id: "candles", label: "Candles", type: "series", direction: "input" },
    ],
    outputs: [
      { id: "atr", label: "ATR", type: "number", direction: "output" },
    ],
  },

  // ======================== CONDITIONS ========================
  {
    id: "threshold",
    label: "Threshold Check",
    subtitle: "Numeric Predicate",
    category: "conditions",
    description: "Compares an incoming number against a constant threshold.",
    defaultParams: {
      operator: "<",
      threshold: 30,
    },
    paramFields: [
      {
        key: "operator",
        label: "Op",
        type: "select",
        options: ["<", "<=", ">", ">=", "=="],
      },
      { key: "threshold", label: "Value", type: "number", step: 0.5 },
    ],
    inputs: [
      { id: "value", label: "Value", type: "number", direction: "input" },
    ],
    outputs: [
      { id: "result", label: "Result", type: "boolean", direction: "output" },
    ],
  },
  {
    id: "compare",
    label: "Compare A / B",
    subtitle: "Relational Node",
    category: "conditions",
    description: "Compares two numeric data streams.",
    defaultParams: {
      operator: ">",
    },
    paramFields: [
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [">", ">=", "<", "<=", "=="],
      },
    ],
    inputs: [
      { id: "a", label: "A", type: "number", direction: "input" },
      { id: "b", label: "B", type: "number", direction: "input" },
    ],
    outputs: [
      { id: "result", label: "Result", type: "boolean", direction: "output" },
    ],
  },
  {
    id: "crossover",
    label: "Crossover",
    subtitle: "Signal Trigger",
    category: "conditions",
    description: "Detects when Fast series crosses above or below Slow series.",
    defaultParams: {
      direction: "CROSS_ABOVE",
    },
    paramFields: [
      {
        key: "direction",
        label: "Direction",
        type: "select",
        options: ["CROSS_ABOVE", "CROSS_BELOW"],
      },
    ],
    inputs: [
      { id: "fast", label: "Fast", type: "number", direction: "input" },
      { id: "slow", label: "Slow", type: "number", direction: "input" },
    ],
    outputs: [
      { id: "triggered", label: "Triggered", type: "boolean", direction: "output" },
    ],
  },
  {
    id: "logic-gate",
    label: "Logic Gate",
    subtitle: "Boolean Combiner",
    category: "conditions",
    description: "Combines two boolean signals with AND, OR, or XOR.",
    defaultParams: {
      gate: "AND",
    },
    paramFields: [
      {
        key: "gate",
        label: "Gate",
        type: "select",
        options: ["AND", "OR", "XOR"],
      },
    ],
    inputs: [
      { id: "a", label: "A", type: "boolean", direction: "input" },
      { id: "b", label: "B", type: "boolean", direction: "input" },
    ],
    outputs: [
      { id: "out", label: "Out", type: "boolean", direction: "output" },
    ],
  },
  {
    id: "time-filter",
    label: "Time Filter",
    subtitle: "Trading Session",
    category: "conditions",
    description: "Allows execution only within the configured server hour window.",
    defaultParams: {
      startHour: 8,
      endHour: 17,
    },
    paramFields: [
      { key: "startHour", label: "Start Hr", type: "number", min: 0, max: 23, step: 1 },
      { key: "endHour", label: "End Hr", type: "number", min: 0, max: 23, step: 1 },
    ],
    inputs: [],
    outputs: [
      { id: "allowed", label: "Allowed", type: "boolean", direction: "output" },
    ],
  },
  {
    id: "branch",
    label: "Branch (If/Else)",
    subtitle: "Flow Control",
    category: "conditions",
    description: "Routes execution down True or False based on Condition.",
    defaultParams: {},
    paramFields: [],
    inputs: [
      { id: "exec-in", label: "Exec", type: "exec", direction: "input" },
      { id: "condition", label: "Condition", type: "boolean", direction: "input" },
    ],
    outputs: [
      { id: "true", label: "True", type: "exec", direction: "output" },
      { id: "false", label: "False", type: "exec", direction: "output" },
    ],
  },

  // ======================== ACTIONS ========================
  {
    id: "market-buy",
    label: "Market Buy",
    subtitle: "Order Execution",
    category: "actions",
    description: "Submits a market Buy order with Lot Size, Stop Loss, and Take Profit.",
    defaultParams: {
      lotSize: 0.1,
      stopLoss: 300,
      takeProfit: 600,
      sizePct: 10,
      tag: "long_entry",
    },
    paramFields: [
      { key: "lotSize", label: "Lots", type: "number", min: 0.01, max: 100, step: 0.01 },
      { key: "stopLoss", label: "SL (pts)", type: "number", min: 0, max: 50000, step: 10 },
      { key: "takeProfit", label: "TP (pts)", type: "number", min: 0, max: 50000, step: 10 },
      { key: "tag", label: "Tag", type: "text" },
    ],
    inputs: [
      { id: "exec-in", label: "Exec", type: "exec", direction: "input" },
      { id: "qtyOverride", label: "Lot Override", type: "number", direction: "input" },
    ],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
    ],
  },
  {
    id: "market-sell",
    label: "Market Sell",
    subtitle: "Order Execution",
    category: "actions",
    description: "Submits a market Sell order with Lot Size, Stop Loss, and Take Profit.",
    defaultParams: {
      lotSize: 0.1,
      stopLoss: 300,
      takeProfit: 600,
      sizePct: 10,
      tag: "short_entry",
    },
    paramFields: [
      { key: "lotSize", label: "Lots", type: "number", min: 0.01, max: 100, step: 0.01 },
      { key: "stopLoss", label: "SL (pts)", type: "number", min: 0, max: 50000, step: 10 },
      { key: "takeProfit", label: "TP (pts)", type: "number", min: 0, max: 50000, step: 10 },
      { key: "tag", label: "Tag", type: "text" },
    ],
    inputs: [
      { id: "exec-in", label: "Exec", type: "exec", direction: "input" },
      { id: "qtyOverride", label: "Lot Override", type: "number", direction: "input" },
    ],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
    ],
  },
  {
    id: "set-stop-loss",
    label: "Set Stop Loss",
    subtitle: "Risk Management",
    category: "actions",
    description: "Attaches a fixed or trailing stop-loss order.",
    defaultParams: {
      stopPct: 1.5,
      mode: "Trailing",
    },
    paramFields: [
      { key: "stopPct", label: "Stop", type: "number", min: 0.1, max: 50, step: 0.1, unit: "%" },
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: ["Trailing", "Fixed"],
      },
    ],
    inputs: [
      { id: "exec-in", label: "Exec", type: "exec", direction: "input" },
      { id: "price", label: "Price", type: "number", direction: "input" },
    ],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
    ],
  },
  {
    id: "set-take-profit",
    label: "Set Take Profit",
    subtitle: "Risk Management",
    category: "actions",
    description: "Attaches a limit take-profit target.",
    defaultParams: {
      targetPct: 3.5,
    },
    paramFields: [
      { key: "targetPct", label: "Target", type: "number", min: 0.1, max: 100, step: 0.25, unit: "%" },
    ],
    inputs: [
      { id: "exec-in", label: "Exec", type: "exec", direction: "input" },
      { id: "price", label: "Price", type: "number", direction: "input" },
    ],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
    ],
  },
  {
    id: "close-position",
    label: "Close Position",
    subtitle: "Position Exit",
    category: "actions",
    description: "Flattens all open exposure for the active symbol.",
    defaultParams: {
      reason: "signal_exit",
    },
    paramFields: [{ key: "reason", label: "Reason", type: "text" }],
    inputs: [
      { id: "exec-in", label: "Exec", type: "exec", direction: "input" },
    ],
    outputs: [
      { id: "exec-out", label: "Exec", type: "exec", direction: "output" },
    ],
  },
];

export function getCatalogDefinition(id: string): BlueprintNodeDefinition | undefined {
  return NODE_CATALOG.find((item) => item.id === id);
}
