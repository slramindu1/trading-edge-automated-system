export interface OhlcvBar {
  time: number; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestConfig {
  initialBalance: number;
  spreadPips: number;
  commissionPerLot: number;
  pipSize: number;
  contractSize: number;
}

export interface BacktestTrade {
  id: number;
  side: "BUY" | "SELL";
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  lots: number;
  sl: number | null;
  tp: number | null;
  grossPnl: number;
  commission: number;
  netPnl: number;
  exitReason: "SL" | "TP" | "SIGNAL" | "END";
  tag: string;
}

export interface BacktestMetrics {
  netProfit: number;
  returnPct: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  finalBalance: number;
}

export interface BacktestResult {
  bars: OhlcvBar[];
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equityCurve: { time: number; value: number }[];
  durationMs: number;
}
