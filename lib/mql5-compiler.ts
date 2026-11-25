import type { Edge, Node } from "@xyflow/react";
import { BlueprintNodeData } from "./blueprint/types";

export interface Mql5CompileResult {
  code: string;
  warnings: string[];
  nodeErrors: Record<string, string[]>;
  topologicalOrder: string[];
  eventCount: number;
  actionCount: number;
}

interface IndicatorHandleSpec {
  nodeId: string;
  handleVar: string;
  bufferVar: string;
  maMethod: "MODE_EMA" | "MODE_SMA";
  periodParamVar: string;
  periodDefault: number;
  appliedPrice: string;
}

function sanitizeIdent(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "_");
}

function mapAppliedPrice(source: unknown): string {
  switch (source) {
    case "open":
      return "PRICE_OPEN";
    case "high":
      return "PRICE_HIGH";
    case "low":
      return "PRICE_LOW";
    default:
      return "PRICE_CLOSE";
  }
}

/**
 * Performs a topological sort of all reachable nodes starting from the OnTick
 * event node (Kahn's algorithm over the reachable subgraph).
 */
export function topologicalSortFromOnTick(
  nodes: Node<BlueprintNodeData>[],
  edges: Edge[]
): { order: string[]; entryNodeId: string | null; hasCycle: boolean } {
  const onTickNode =
    nodes.find((n) => n.data.definitionId === "on-tick") ??
    nodes.find((n) => n.data.category === "events") ??
    null;

  if (!onTickNode) {
    return { order: [], entryNodeId: null, hasCycle: false };
  }

  // Build adjacency for both execution edges (forward) and data dependencies
  // so every node in the active graph is ordered cleanly.
  const outgoing = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    outgoing.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    if (!outgoing.has(e.source) || !inDegree.has(e.target)) continue;
    outgoing.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  // Kahn's algorithm prioritizing OnTick first
  const queue: string[] = [];
  if ((inDegree.get(onTickNode.id) ?? 0) === 0) {
    queue.push(onTickNode.id);
  }
  for (const n of nodes) {
    if (n.id !== onTickNode.id && (inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const next of outgoing.get(current) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) {
        queue.push(next);
      }
    }
  }

  return {
    order,
    entryNodeId: onTickNode.id,
    hasCycle: order.length < nodes.length,
  };
}

/**
 * Compiles React Flow nodes & edges into a complete MetaTrader 5 (.mq5)
 * Expert Advisor source file.
 */
export function compileToMql5(
  strategyName: string,
  nodes: Node<BlueprintNodeData>[],
  edges: Edge[]
): Mql5CompileResult {
  const warnings: string[] = [];
  const nodeErrors: Record<string, string[]> = {};
  const addNodeError = (nodeId: string, msg: string) => {
    if (!nodeErrors[nodeId]) nodeErrors[nodeId] = [];
    nodeErrors[nodeId].push(msg);
  };
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const events = nodes.filter((n) => n.data.category === "events");
  const actions = nodes.filter((n) => n.data.category === "actions");

  const { order, entryNodeId, hasCycle } = topologicalSortFromOnTick(
    nodes,
    edges
  );

  if (nodes.length === 0) {
    return {
      code: [
        "//+------------------------------------------------------------------+",
        `//| ${strategyName}.mq5`,
        "//| Drop nodes onto the canvas to generate an MQL5 Expert Advisor",
        "//+------------------------------------------------------------------+",
        "#property strict",
        "",
        "int OnInit() { return(INIT_SUCCEEDED); }",
        "void OnTick() {}",
      ].join("\n"),
      warnings: ["Canvas is empty. Drag an On Price Tick node to begin."],
      nodeErrors,
      topologicalOrder: [],
      eventCount: 0,
      actionCount: 0,
    };
  }

  const onTickNode = nodes.find((n) => n.data.definitionId === "on-tick");
  if (!onTickNode) {
    warnings.push(
      "No 'On Price Tick' node found. Using available event node as OnTick() entry."
    );
  }
  if (hasCycle) {
    warnings.push("Cycle detected in Blueprint graph; check feedback wires.");
  }

  const findIncoming = (targetId: string, handleId: string): Edge | undefined =>
    edges.find((e) => e.target === targetId && e.targetHandle === handleId);

  const findOutgoingExec = (sourceId: string, handleId: string): Edge[] =>
    edges.filter((e) => e.source === sourceId && e.sourceHandle === handleId);

  // Collect SMA / EMA indicator handles in topological order
  const indicatorSpecs = new Map<string, IndicatorHandleSpec>();
  let maIndex = 1;
  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const defId = node.data.definitionId;
    if (defId === "sma" || defId === "ema") {
      const idx = maIndex++;
      const prefix = defId === "sma" ? "SMA" : "EMA";
      indicatorSpecs.set(nodeId, {
        nodeId,
        handleVar: `g_handle_${defId}_${idx}`,
        bufferVar: `buf_${defId}_${idx}`,
        maMethod: defId === "sma" ? "MODE_SMA" : "MODE_EMA",
        periodParamVar: `Inp${prefix}Period_${idx}`,
        periodDefault: Number(node.data.params.period ?? (defId === "sma" ? 50 : 20)),
        appliedPrice: mapAppliedPrice(node.data.params.source),
      });
    }
  }

  // Collect Time Filter inputs
  const timeFilterParams: Array<{
    nodeId: string;
    startVar: string;
    endVar: string;
    startDefault: number;
    endDefault: number;
  }> = [];
  let tfIndex = 1;
  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (node?.data.definitionId === "time-filter") {
      const idx = tfIndex++;
      timeFilterParams.push({
        nodeId,
        startVar: `InpSessionStartHour_${idx}`,
        endVar: `InpSessionEndHour_${idx}`,
        startDefault: Number(node.data.params.startHour ?? 8),
        endDefault: Number(node.data.params.endHour ?? 17),
      });
    }
  }

  // Collect Order Execution inputs (Lot Size, SL, TP)
  const firstOrderNode = actions.find(
    (a) =>
      a.data.definitionId === "market-buy" ||
      a.data.definitionId === "market-sell"
  );
  const defaultLots = Number(firstOrderNode?.data.params.lotSize ?? 0.1);
  const defaultSL = Number(firstOrderNode?.data.params.stopLoss ?? 300);
  const defaultTP = Number(firstOrderNode?.data.params.takeProfit ?? 600);

  // Resolve data expressions in MQL5
  const dataExprCache = new Map<string, string>();
  const localDecls: string[] = [];

  const resolveDataPin = (
    targetId: string,
    handleId: string,
    fallback: string
  ): string => {
    const edge = findIncoming(targetId, handleId);
    if (!edge || !edge.sourceHandle) return fallback;
    return emitDataExpr(edge.source, edge.sourceHandle);
  };

  const resolveSeriesBuffer = (
    targetId: string,
    handleId: string
  ): string | null => {
    const edge = findIncoming(targetId, handleId);
    if (!edge) return null;
    const spec = indicatorSpecs.get(edge.source);
    return spec ? spec.bufferVar : null;
  };

  const emitDataExpr = (sourceId: string, sourceHandle: string): string => {
    const cacheKey = `${sourceId}::${sourceHandle}`;
    const cached = dataExprCache.get(cacheKey);
    if (cached) return cached;

    const node = nodeMap.get(sourceId);
    if (!node) return "0.0";
    const d = node.data;

    if (d.category === "events") {
      if (sourceHandle === "bid") return "last_tick.bid";
      if (sourceHandle === "ask") return "last_tick.ask";
      if (sourceHandle === "spread") return "(last_tick.ask - last_tick.bid)";
      if (sourceHandle === "close") return "iClose(_Symbol, PERIOD_CURRENT, 1)";
      if (sourceHandle === "volume") return "(double)iVolume(_Symbol, PERIOD_CURRENT, 1)";
      return "0.0";
    }

    const spec = indicatorSpecs.get(sourceId);
    if (spec) {
      const expr = `${spec.bufferVar}[1]`;
      dataExprCache.set(cacheKey, expr);
      return expr;
    }

    const varName = `v_${sanitizeIdent(d.definitionId)}_${sanitizeIdent(sourceId.slice(-4))}`;

    if (d.definitionId === "time-filter") {
      const tf = timeFilterParams.find((t) => t.nodeId === sourceId);
      const sVar = tf ? tf.startVar : String(d.params.startHour ?? 8);
      const eVar = tf ? tf.endVar : String(d.params.endHour ?? 17);
      const expr = `IsWithinSession(${sVar}, ${eVar})`;
      dataExprCache.set(cacheKey, varName);
      localDecls.push(`   bool ${varName} = ${expr};`);
      return varName;
    }

    if (d.definitionId === "crossover") {
      const fastBuf = resolveSeriesBuffer(sourceId, "fast");
      const slowBuf = resolveSeriesBuffer(sourceId, "slow");
      let rhs = "false";
      if (fastBuf && slowBuf) {
        rhs =
          d.params.direction === "CROSS_BELOW"
            ? `(${fastBuf}[1] < ${slowBuf}[1] && ${fastBuf}[2] >= ${slowBuf}[2])`
            : `(${fastBuf}[1] > ${slowBuf}[1] && ${fastBuf}[2] <= ${slowBuf}[2])`;
      } else {
        const fastVal = resolveDataPin(sourceId, "fast", "0.0");
        const slowVal = resolveDataPin(sourceId, "slow", "0.0");
        warnings.push(
          `Crossover "${d.label}" works best when wired to SMA/EMA buffers.`
        );
        rhs =
          d.params.direction === "CROSS_BELOW"
            ? `(${fastVal} < ${slowVal})`
            : `(${fastVal} > ${slowVal})`;
      }
      dataExprCache.set(cacheKey, varName);
      localDecls.push(`   bool ${varName} = ${rhs};`);
      return varName;
    }

    if (d.definitionId === "threshold") {
      const val = resolveDataPin(sourceId, "value", "0.0");
      const op = String(d.params.operator ?? "<");
      const thresh = Number(d.params.threshold ?? 30);
      dataExprCache.set(cacheKey, varName);
      localDecls.push(`   bool ${varName} = (${val} ${op} ${thresh});`);
      return varName;
    }

    if (d.definitionId === "compare") {
      const a = resolveDataPin(sourceId, "a", "0.0");
      const b = resolveDataPin(sourceId, "b", "0.0");
      const op = String(d.params.operator ?? ">");
      dataExprCache.set(cacheKey, varName);
      localDecls.push(`   bool ${varName} = (${a} ${op} ${b});`);
      return varName;
    }

    if (d.definitionId === "logic-gate") {
      const a = resolveDataPin(sourceId, "a", "false");
      const b = resolveDataPin(sourceId, "b", "false");
      const gate = String(d.params.gate ?? "AND");
      const rhs =
        gate === "OR"
          ? `(${a} || ${b})`
          : gate === "XOR"
            ? `(${a} != ${b})`
            : `(${a} && ${b})`;
      dataExprCache.set(cacheKey, varName);
      localDecls.push(`   bool ${varName} = ${rhs};`);
      return varName;
    }

    return "0.0";
  };

  // Traverse execution chain starting from entryNodeId
  const emitExecChain = (
    nodeId: string,
    indent: string,
    visited: Set<string>
  ): string[] => {
    if (visited.has(nodeId)) {
      return [`${indent}// Cycle detected at node ${nodeId}`];
    }
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return [];
    const d = node.data;
    const out: string[] = [];

    if (d.definitionId === "branch") {
      const cond = resolveDataPin(nodeId, "condition", "false");
      const trueEdges = findOutgoingExec(nodeId, "true");
      const falseEdges = findOutgoingExec(nodeId, "false");

      out.push(`${indent}if(${cond})`);
      out.push(`${indent}{`);
      if (trueEdges.length === 0) {
        out.push(`${indent}   // True branch unconnected`);
      } else {
        for (const e of trueEdges) {
          out.push(...emitExecChain(e.target, `${indent}   `, new Set(visited)));
        }
      }
      out.push(`${indent}}`);
      if (falseEdges.length > 0) {
        out.push(`${indent}else`);
        out.push(`${indent}{`);
        for (const e of falseEdges) {
          out.push(
            ...emitExecChain(e.target, `${indent}   `, new Set(visited))
          );
        }
        out.push(`${indent}}`);
      }
      return out;
    }

    if (d.definitionId === "market-buy") {
      const lotExpr = findIncoming(nodeId, "qtyOverride")
        ? resolveDataPin(nodeId, "qtyOverride", "InpLotSize")
        : String(Number(d.params.lotSize ?? defaultLots));
      const slPts = Number(d.params.stopLoss ?? defaultSL);
      const tpPts = Number(d.params.takeProfit ?? defaultTP);
      const tag = String(d.params.tag ?? "BP_Buy");

      out.push(`${indent}if(PositionsTotal() == 0)`);
      out.push(`${indent}{`);
      out.push(
        `${indent}   double sl = (${slPts} > 0) ? NormalizeDouble(last_tick.ask - ${slPts} * _Point, _Digits) : 0.0;`
      );
      out.push(
        `${indent}   double tp = (${tpPts} > 0) ? NormalizeDouble(last_tick.ask + ${tpPts} * _Point, _Digits) : 0.0;`
      );
      out.push(
        `${indent}   trade.Buy(${lotExpr}, _Symbol, last_tick.ask, sl, tp, "${tag}");`
      );
      out.push(`${indent}}`);
    } else if (d.definitionId === "market-sell") {
      const lotExpr = findIncoming(nodeId, "qtyOverride")
        ? resolveDataPin(nodeId, "qtyOverride", "InpLotSize")
        : String(Number(d.params.lotSize ?? defaultLots));
      const slPts = Number(d.params.stopLoss ?? defaultSL);
      const tpPts = Number(d.params.takeProfit ?? defaultTP);
      const tag = String(d.params.tag ?? "BP_Sell");

      out.push(`${indent}if(PositionsTotal() == 0)`);
      out.push(`${indent}{`);
      out.push(
        `${indent}   double sl = (${slPts} > 0) ? NormalizeDouble(last_tick.bid + ${slPts} * _Point, _Digits) : 0.0;`
      );
      out.push(
        `${indent}   double tp = (${tpPts} > 0) ? NormalizeDouble(last_tick.bid - ${tpPts} * _Point, _Digits) : 0.0;`
      );
      out.push(
        `${indent}   trade.Sell(${lotExpr}, _Symbol, last_tick.bid, sl, tp, "${tag}");`
      );
      out.push(`${indent}}`);
    } else if (d.definitionId === "close-position") {
      out.push(`${indent}trade.PositionClose(_Symbol);`);
    }

    const nextEdges = findOutgoingExec(nodeId, "exec-out");
    for (const next of nextEdges) {
      out.push(...emitExecChain(next.target, indent, new Set(visited)));
    }
    return out;
  };

  const execLines: string[] = [];
  if (entryNodeId) {
    const startEdges = findOutgoingExec(entryNodeId, "exec-out");
    if (startEdges.length === 0) {
      warnings.push("Event node has no outgoing Exec wire.");
      addNodeError(
        entryNodeId,
        "Connect Exec output to a Branch or Action node."
      );
    }
    for (const e of startEdges) {
      execLines.push(...emitExecChain(e.target, "   ", new Set([entryNodeId])));
    }
  }

  for (const act of actions) {
    if (!findIncoming(act.id, "exec-in")) {
      warnings.push(`Action "${act.data.label}" is not wired to an Exec flow.`);
      addNodeError(act.id, "Missing Exec input trigger.");
    }
    if (
      act.data.definitionId === "market-buy" ||
      act.data.definitionId === "market-sell"
    ) {
      const lots = Number(act.data.params.lotSize ?? 0);
      const sl = Number(act.data.params.stopLoss ?? 0);
      if (lots <= 0) {
        const msg = `${act.data.label}: Lot Size must be > 0.`;
        warnings.push(msg);
        addNodeError(act.id, "Set Lot Size > 0 (e.g. 0.10).");
      }
      if (sl <= 0) {
        const msg = `${act.data.label}: Stop Loss (pts) should be > 0.`;
        warnings.push(msg);
        addNodeError(act.id, "Set Stop Loss > 0 pts for risk protection.");
      }
    }
  }

  // Validate Condition node required inputs
  for (const n of nodes) {
    const defId = n.data.definitionId;
    if (defId === "branch") {
      if (!findIncoming(n.id, "exec-in")) {
        addNodeError(n.id, "Missing Exec input trigger.");
      }
      if (!findIncoming(n.id, "condition")) {
        addNodeError(n.id, "Connect a Condition (Bool) input.");
      }
    } else if (defId === "crossover") {
      if (!findIncoming(n.id, "fast") || !findIncoming(n.id, "slow")) {
        addNodeError(n.id, "Connect both Fast and Slow numeric inputs.");
      }
    } else if (defId === "compare") {
      if (!findIncoming(n.id, "a") || !findIncoming(n.id, "b")) {
        addNodeError(n.id, "Connect both A and B numeric inputs.");
      }
    } else if (defId === "threshold") {
      if (!findIncoming(n.id, "value")) {
        addNodeError(n.id, "Connect a Value (Float) input.");
      }
    } else if (defId === "logic-gate") {
      if (!findIncoming(n.id, "a") || !findIncoming(n.id, "b")) {
        addNodeError(n.id, "Connect both A and B boolean inputs.");
      }
    }
  }

  const specs = Array.from(indicatorSpecs.values());
  const lines: string[] = [
    "//+------------------------------------------------------------------+",
    `//| ${strategyName}.mq5`,
    "//| Auto-generated by TradingEdge Blueprint MQL5 Compiler",
    `//| Topological Order: ${order.join(" -> ") || "None"}`,
    "//+------------------------------------------------------------------+",
    `#property copyright "TradingEdge Automation"`,
    `#property version   "1.00"`,
    `#property strict`,
    "",
    "#include <Trade\\Trade.mqh>",
    "CTrade trade;",
    "",
    "//--- Input Parameters",
    `input ulong  InpMagicNumber = 202611;       // EA Magic Number`,
    `input double InpLotSize     = ${defaultLots.toFixed(2)};         // Default Lot Size`,
    `input int    InpStopLoss    = ${defaultSL};          // Stop Loss (points)`,
    `input int    InpTakeProfit  = ${defaultTP};          // Take Profit (points)`,
  ];

  for (const s of specs) {
    lines.push(
      `input int    ${s.periodParamVar.padEnd(14)} = ${s.periodDefault};           // ${s.maMethod === "MODE_SMA" ? "SMA" : "EMA"} Period`
    );
  }
  for (const tf of timeFilterParams) {
    lines.push(
      `input int    ${tf.startVar.padEnd(14)} = ${tf.startDefault};            // Session Start Hour (0-23)`
    );
    lines.push(
      `input int    ${tf.endVar.padEnd(14)} = ${tf.endDefault};           // Session End Hour (0-23)`
    );
  }

  if (specs.length > 0) {
    lines.push("", "//--- Indicator Handles");
    for (const s of specs) {
      lines.push(`int ${s.handleVar} = INVALID_HANDLE;`);
    }
  }

  lines.push(
    "",
    "//+------------------------------------------------------------------+",
    "//| Expert initialization function                                   |",
    "//+------------------------------------------------------------------+",
    "int OnInit()",
    "{",
    "   trade.SetExpertMagicNumber(InpMagicNumber);"
  );

  for (const s of specs) {
    lines.push(
      `   ${s.handleVar} = iMA(_Symbol, PERIOD_CURRENT, ${s.periodParamVar}, 0, ${s.maMethod}, ${s.appliedPrice});`,
      `   if(${s.handleVar} == INVALID_HANDLE)`,
      "   {",
      `      Print("Failed to create ${s.maMethod} handle: ", GetLastError());`,
      "      return(INIT_FAILED);",
      "   }"
    );
  }

  lines.push("   return(INIT_SUCCEEDED);", "}");

  lines.push(
    "",
    "//+------------------------------------------------------------------+",
    "//| Expert deinitialization function                                 |",
    "//+------------------------------------------------------------------+",
    "void OnDeinit(const int reason)",
    "{"
  );
  for (const s of specs) {
    lines.push(
      `   if(${s.handleVar} != INVALID_HANDLE) IndicatorRelease(${s.handleVar});`
    );
  }
  lines.push("}");

  if (timeFilterParams.length > 0) {
    lines.push(
      "",
      "//+------------------------------------------------------------------+",
      "//| Session Time Filter Helper                                       |",
      "//+------------------------------------------------------------------+",
      "bool IsWithinSession(const int startHour, const int endHour)",
      "{",
      "   MqlDateTime dt;",
      "   TimeToStruct(TimeCurrent(), dt);",
      "   if(startHour <= endHour)",
      "      return(dt.hour >= startHour && dt.hour < endHour);",
      "   return(dt.hour >= startHour || dt.hour < endHour);",
      "}"
    );
  }

  lines.push(
    "",
    "//+------------------------------------------------------------------+",
    "//| Expert tick function                                             |",
    "//+------------------------------------------------------------------+",
    "void OnTick()",
    "{",
    "   MqlTick last_tick;",
    "   if(!SymbolInfoTick(_Symbol, last_tick)) return;"
  );

  if (specs.length > 0) {
    lines.push("", "   //--- Copy Indicator Buffers");
    for (const s of specs) {
      lines.push(
        `   double ${s.bufferVar}[];`,
        `   ArraySetAsSeries(${s.bufferVar}, true);`,
        `   if(CopyBuffer(${s.handleVar}, 0, 0, 3, ${s.bufferVar}) < 3) return;`
      );
    }
  }

  if (localDecls.length > 0) {
    lines.push("", "   //--- Evaluate Conditions", ...localDecls);
  }

  if (execLines.length > 0) {
    lines.push("", "   //--- Execution Flow", ...execLines);
  } else {
    lines.push("", "   //--- Connect nodes to OnTick Exec pin to execute trades");
  }

  lines.push("}", "");

  return {
    code: lines.join("\n"),
    warnings,
    nodeErrors,
    topologicalOrder: order,
    eventCount: events.length,
    actionCount: actions.length,
  };
}
