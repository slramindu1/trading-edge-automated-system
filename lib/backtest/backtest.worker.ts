import type { Edge, Node } from "@xyflow/react";
import { BlueprintNodeData } from "../blueprint/types";
import { runBacktest } from "./engine";
import { BacktestConfig, OhlcvBar } from "./types";

export interface BacktestWorkerRequest {
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
  bars: OhlcvBar[];
  config: BacktestConfig;
}

self.onmessage = (event: MessageEvent<BacktestWorkerRequest>) => {
  try {
    const { nodes, edges, bars, config } = event.data;
    const result = runBacktest(nodes, edges, bars, config);
    self.postMessage({ type: "RESULT", result });
  } catch (err) {
    self.postMessage({
      type: "ERROR",
      error: err instanceof Error ? err.message : "Backtest simulation failed.",
    });
  }
};
