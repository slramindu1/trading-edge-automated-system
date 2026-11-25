import type { Edge, Node } from "@xyflow/react";
import { BlueprintNodeData } from "./types";

export type TargetLanguage = "typescript" | "python";

export interface CompileResult {
  code: string;
  warnings: string[];
  eventCount: number;
  actionCount: number;
}

function sanitizeVar(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function findIncomingEdge(
  edges: Edge[],
  targetNodeId: string,
  targetHandleId: string
): Edge | undefined {
  return edges.find(
    (e) => e.target === targetNodeId && e.targetHandle === targetHandleId
  );
}

function findOutgoingExecEdges(
  edges: Edge[],
  sourceNodeId: string,
  sourceHandleId: string
): Edge[] {
  return edges.filter(
    (e) => e.source === sourceNodeId && e.sourceHandle === sourceHandleId
  );
}

export function compileBlueprintGraph(
  strategyName: string,
  nodes: Node<BlueprintNodeData>[],
  edges: Edge[],
  language: TargetLanguage
): CompileResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const warnings: string[] = [];

  const events = nodes.filter((n) => n.data.category === "events");
  const actions = nodes.filter((n) => n.data.category === "actions");

  if (nodes.length === 0) {
    return {
      code:
        language === "typescript"
          ? `// Drop nodes from the left palette onto the canvas to generate strategy code.`
          : `# Drop nodes from the left palette onto the canvas to generate strategy code.`,
      warnings: ["Canvas is empty. Drag an Event node to begin."],
      eventCount: 0,
      actionCount: 0,
    };
  }

  if (events.length === 0) {
    warnings.push("No Event entrypoint node found (e.g. On Candle Close).");
  }

  // Track generated data variable declarations to avoid duplicate computations
  const dataVars = new Map<string, string>();
  const dataDecls: string[] = [];

  function resolveDataPin(
    nodeId: string,
    handleId: string,
    fallback: string
  ): string {
    const edge = findIncomingEdge(edges, nodeId, handleId);
    if (!edge || !edge.sourceHandle) return fallback;
    return emitDataExpr(edge.source, edge.sourceHandle);
  }

  function emitDataExpr(sourceId: string, sourceHandle: string): string {
    const cacheKey = `${sourceId}::${sourceHandle}`;
    const cached = dataVars.get(cacheKey);
    if (cached) return cached;

    const node = nodeMap.get(sourceId);
    if (!node) return "undefined";

    const d = node.data;
    const varName = `${sanitizeVar(d.definitionId)}_${sanitizeVar(sourceId.slice(-4))}_${sanitizeVar(sourceHandle)}`;

    // Event outputs map directly to event context
    if (d.category === "events") {
      if (language === "typescript") {
        const expr = `ctx.${sourceHandle}`;
        dataVars.set(cacheKey, expr);
        return expr;
      } else {
        const expr = `ctx.${sourceHandle}`;
        dataVars.set(cacheKey, expr);
        return expr;
      }
    }

    let rhs = "";
    if (d.definitionId === "rsi") {
      const series = resolveDataPin(sourceId, "candles", "ctx.candles");
      rhs =
        language === "typescript"
          ? `indicators.rsi(${series}, { period: ${d.params.period}, source: "${d.params.source}" })`
          : `indicators.rsi(${series}, period=${d.params.period}, source="${d.params.source}")`;
    } else if (d.definitionId === "ema") {
      const series = resolveDataPin(sourceId, "candles", "ctx.candles");
      rhs =
        language === "typescript"
          ? `indicators.ema(${series}, { period: ${d.params.period}, source: "${d.params.source}" })`
          : `indicators.ema(${series}, period=${d.params.period}, source="${d.params.source}")`;
    } else if (d.definitionId === "macd") {
      const series = resolveDataPin(sourceId, "candles", "ctx.candles");
      rhs =
        language === "typescript"
          ? `indicators.macd(${series}, { fast: ${d.params.fast}, slow: ${d.params.slow}, signal: ${d.params.signal} }).${sourceHandle}`
          : `indicators.macd(${series}, fast=${d.params.fast}, slow=${d.params.slow}, signal=${d.params.signal})["${sourceHandle}"]`;
    } else if (d.definitionId === "bollinger") {
      const series = resolveDataPin(sourceId, "candles", "ctx.candles");
      rhs =
        language === "typescript"
          ? `indicators.bollinger(${series}, { period: ${d.params.period}, stdDev: ${d.params.stdDev} }).${sourceHandle}`
          : `indicators.bollinger(${series}, period=${d.params.period}, std_dev=${d.params.stdDev})["${sourceHandle}"]`;
    } else if (d.definitionId === "atr") {
      const series = resolveDataPin(sourceId, "candles", "ctx.candles");
      rhs =
        language === "typescript"
          ? `indicators.atr(${series}, { period: ${d.params.period} })`
          : `indicators.atr(${series}, period=${d.params.period})`;
    } else if (d.definitionId === "threshold") {
      const val = resolveDataPin(sourceId, "value", "0");
      rhs = `${val} ${d.params.operator} ${d.params.threshold}`;
    } else if (d.definitionId === "compare") {
      const a = resolveDataPin(sourceId, "a", "0");
      const b = resolveDataPin(sourceId, "b", "0");
      rhs = `${a} ${d.params.operator} ${b}`;
    } else if (d.definitionId === "crossover") {
      const fast = resolveDataPin(sourceId, "fast", "0");
      const slow = resolveDataPin(sourceId, "slow", "0");
      const fn =
        d.params.direction === "CROSS_ABOVE"
          ? language === "typescript"
            ? "crossAbove"
            : "cross_above"
          : language === "typescript"
            ? "crossBelow"
            : "cross_below";
      rhs = `${fn}(${fast}, ${slow})`;
    } else if (d.definitionId === "logic-gate") {
      const a = resolveDataPin(sourceId, "a", "false");
      const b = resolveDataPin(sourceId, "b", "false");
      if (d.params.gate === "AND") {
        rhs = language === "typescript" ? `(${a} && ${b})` : `(${a} and ${b})`;
      } else if (d.params.gate === "OR") {
        rhs = language === "typescript" ? `(${a} || ${b})` : `(${a} or ${b})`;
      } else {
        rhs = language === "typescript" ? `Boolean(${a} !== ${b})` : `(${a} != ${b})`;
      }
    } else {
      rhs = `/* ${d.label} */ null`;
    }

    dataVars.set(cacheKey, varName);
    if (language === "typescript") {
      dataDecls.push(`const ${varName} = ${rhs};`);
    } else {
      dataDecls.push(`${varName} = ${rhs}`);
    }
    return varName;
  }

  function emitExecChain(
    nodeId: string,
    indent: string,
    visited: Set<string>
  ): string[] {
    if (visited.has(nodeId)) {
      return [`${indent}${language === "typescript" ? "//" : "#"} Cycle detected at ${nodeId}`];
    }
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return [];
    const d = node.data;
    const lines: string[] = [];

    if (d.definitionId === "branch") {
      const condExpr = resolveDataPin(
        nodeId,
        "condition",
        language === "typescript" ? "false" : "False"
      );
      const trueEdges = findOutgoingExecEdges(edges, nodeId, "true");
      const falseEdges = findOutgoingExecEdges(edges, nodeId, "false");

      if (language === "typescript") {
        lines.push(`${indent}if (${condExpr}) {`);
        if (trueEdges.length === 0) {
          lines.push(`${indent}  // True branch unconnected`);
        } else {
          for (const e of trueEdges) {
            lines.push(...emitExecChain(e.target, `${indent}  `, new Set(visited)));
          }
        }
        if (falseEdges.length > 0) {
          lines.push(`${indent}} else {`);
          for (const e of falseEdges) {
            lines.push(...emitExecChain(e.target, `${indent}  `, new Set(visited)));
          }
        }
        lines.push(`${indent}}`);
      } else {
        lines.push(`${indent}if ${condExpr}:`);
        if (trueEdges.length === 0) {
          lines.push(`${indent}    pass  # True branch unconnected`);
        } else {
          for (const e of trueEdges) {
            lines.push(...emitExecChain(e.target, `${indent}    `, new Set(visited)));
          }
        }
        if (falseEdges.length > 0) {
          lines.push(`${indent}else:`);
          for (const e of falseEdges) {
            lines.push(...emitExecChain(e.target, `${indent}    `, new Set(visited)));
          }
        }
      }
      return lines;
    }

    // Action nodes
    if (d.definitionId === "market-buy") {
      const qtyOverride = findIncomingEdge(edges, nodeId, "qtyOverride")
        ? resolveDataPin(nodeId, "qtyOverride", "undefined")
        : null;
      if (language === "typescript") {
        lines.push(
          `${indent}await broker.marketBuy({ sizePct: ${d.params.sizePct}, tag: "${d.params.tag}"${qtyOverride ? `, qty: ${qtyOverride}` : ""} });`
        );
      } else {
        lines.push(
          `${indent}await broker.market_buy(size_pct=${d.params.sizePct}, tag="${d.params.tag}"${qtyOverride ? `, qty=${qtyOverride}` : ""})`
        );
      }
    } else if (d.definitionId === "market-sell") {
      const qtyOverride = findIncomingEdge(edges, nodeId, "qtyOverride")
        ? resolveDataPin(nodeId, "qtyOverride", "undefined")
        : null;
      if (language === "typescript") {
        lines.push(
          `${indent}await broker.marketSell({ sizePct: ${d.params.sizePct}, tag: "${d.params.tag}"${qtyOverride ? `, qty: ${qtyOverride}` : ""} });`
        );
      } else {
        lines.push(
          `${indent}await broker.market_sell(size_pct=${d.params.sizePct}, tag="${d.params.tag}"${qtyOverride ? `, qty=${qtyOverride}` : ""})`
        );
      }
    } else if (d.definitionId === "set-stop-loss") {
      const pricePin = findIncomingEdge(edges, nodeId, "price")
        ? resolveDataPin(nodeId, "price", "undefined")
        : null;
      if (language === "typescript") {
        lines.push(
          `${indent}await broker.setStopLoss({ stopPct: ${d.params.stopPct}, mode: "${d.params.mode}"${pricePin ? `, price: ${pricePin}` : ""} });`
        );
      } else {
        lines.push(
          `${indent}await broker.set_stop_loss(stop_pct=${d.params.stopPct}, mode="${d.params.mode}"${pricePin ? `, price=${pricePin}` : ""})`
        );
      }
    } else if (d.definitionId === "set-take-profit") {
      const pricePin = findIncomingEdge(edges, nodeId, "price")
        ? resolveDataPin(nodeId, "price", "undefined")
        : null;
      if (language === "typescript") {
        lines.push(
          `${indent}await broker.setTakeProfit({ targetPct: ${d.params.targetPct}${pricePin ? `, price: ${pricePin}` : ""} });`
        );
      } else {
        lines.push(
          `${indent}await broker.set_take_profit(target_pct=${d.params.targetPct}${pricePin ? `, price=${pricePin}` : ""})`
        );
      }
    } else if (d.definitionId === "close-position") {
      if (language === "typescript") {
        lines.push(`${indent}await broker.closePosition({ reason: "${d.params.reason}" });`);
      } else {
        lines.push(`${indent}await broker.close_position(reason="${d.params.reason}")`);
      }
    }

    const nextEdges = findOutgoingExecEdges(edges, nodeId, "exec-out");
    for (const next of nextEdges) {
      lines.push(...emitExecChain(next.target, indent, new Set(visited)));
    }
    return lines;
  }

  const handlerBlocks: string[] = [];

  for (const evt of events) {
    dataDecls.length = 0;
    dataVars.clear();
    const execEdges = findOutgoingExecEdges(edges, evt.id, "exec-out");
    const bodyLines: string[] = [];

    for (const edge of execEdges) {
      bodyLines.push(
        ...emitExecChain(
          edge.target,
          language === "typescript" ? "    " : "        ",
          new Set([evt.id])
        )
      );
    }

    if (execEdges.length === 0) {
      warnings.push(`Event "${evt.data.label}" has no outgoing Exec connection.`);
    }

    const evtName =
      evt.data.definitionId === "on-candle-close"
        ? `onCandleClose("${evt.data.params.symbol}", "${evt.data.params.timeframe}")`
        : evt.data.definitionId === "on-tick"
          ? `onTick("${evt.data.params.symbol}")`
          : `onOrderFill("${evt.data.params.filterSide}")`;

    if (language === "typescript") {
      const declBlock = dataDecls.map((l) => `    ${l}`).join("\n");
      const execBlock = bodyLines.join("\n") || `    // Connect an Action or Branch node`;
      handlerBlocks.push(
        `  strategy.${evtName.replace("(", "(\n    ").replace(")", "")}, async (ctx, broker) => {\n${declBlock ? declBlock + "\n\n" : ""}${execBlock}\n  });`
          .replace(`onCandleClose(\n    "`, `onCandleClose("`)
          .replace(`onTick(\n    "`, `onTick("`)
          .replace(`onOrderFill(\n    "`, `onOrderFill("`)
      );
    } else {
      const declBlock = dataDecls.map((l) => `        ${l}`).join("\n");
      const execBlock = bodyLines.join("\n") || `        pass  # Connect an Action or Branch node`;
      const pyDecorator =
        evt.data.definitionId === "on-candle-close"
          ? `@strategy.on_candle_close("${evt.data.params.symbol}", timeframe="${evt.data.params.timeframe}")`
          : evt.data.definitionId === "on-tick"
            ? `@strategy.on_tick("${evt.data.params.symbol}")`
            : `@strategy.on_order_fill(side="${evt.data.params.filterSide}")`;
      handlerBlocks.push(
        `    ${pyDecorator}\n    async def handle_${sanitizeVar(evt.id)}(ctx, broker):\n${declBlock ? declBlock + "\n\n" : ""}${execBlock}`
      );
    }
  }

  // Check for disconnected actions
  for (const act of actions) {
    const hasExecIn = findIncomingEdge(edges, act.id, "exec-in");
    if (!hasExecIn) {
      warnings.push(`Action "${act.data.label}" is not wired to an Exec flow.`);
    }
  }

  const safeClass = strategyName.replace(/[^a-zA-Z0-9]/g, "") || "CustomStrategy";

  if (language === "typescript") {
    const code = `// Auto-generated by TradingEdge Blueprint Compiler
import { defineStrategy, indicators, crossAbove, crossBelow } from "@trading-edge/sdk";

export const ${safeClass} = defineStrategy("${strategyName}", (strategy) => {
${handlerBlocks.join("\n\n")}
});
`;
    return {
      code,
      warnings,
      eventCount: events.length,
      actionCount: actions.length,
    };
  } else {
    const code = `# Auto-generated by TradingEdge Blueprint Compiler
from trading_edge import Strategy, indicators, cross_above, cross_below

strategy = Strategy("${strategyName}")

class ${safeClass}:
${handlerBlocks.join("\n\n")}
`;
    return {
      code,
      warnings,
      eventCount: events.length,
      actionCount: actions.length,
    };
  }
}
