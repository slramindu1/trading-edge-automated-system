"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type OnConnectStartParams,
} from "@xyflow/react";
import {
  ChevronRight,
  Download,
  Hand,
  LayoutGrid,
  Maximize2,
  Minus,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { BacktestView } from "./BacktestView";
import { BlueprintNode } from "./BlueprintNode";
import { CodePreviewPanel, PreviewLanguage } from "./CodePreviewPanel";
import { DeployView } from "./DeployView";
import { DiagnosticsContext } from "./DiagnosticsContext";
import { NodePalette } from "./NodePalette";
import { OptimizationView } from "./OptimizationView";
import { QuickAddPalette } from "./QuickAddPalette";
import { StrategySwitcher } from "./StrategySwitcher";
import { ActiveConnection, WiringContext } from "./WiringContext";
import { compileBlueprintGraph } from "@/lib/blueprint/compiler";
import {
  createBlueprintNode,
  STRATEGY_PRESETS,
} from "@/lib/blueprint/presets";
import {
  createBlankStrategy,
  createDefaultStrategy,
  exportBlueprintJson,
  loadWorkspace,
  parseBlueprintJson,
  SavedStrategy,
  saveWorkspace,
} from "@/lib/blueprint/storage";
import {
  BlueprintNodeData,
  CATEGORY_THEME,
  PinDataType,
} from "@/lib/blueprint/types";
import { compileToMql5 } from "@/lib/mql5-compiler";

const nodeTypes = {
  blueprintNode: BlueprintNode,
};

interface GraphSnapshot {
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
}

function getWireColor(pinType: PinDataType): string {
  switch (pinType) {
    case "exec":
      return "#E2E8F0";
    case "number":
      return "#22C55E";
    case "boolean":
      return "#EF4444";
    case "series":
      return "#3B82F6";
    case "string":
      return "#F59E0B";
  }
}

function autoLayoutGraph(
  nodes: Node<BlueprintNodeData>[],
  edges: Edge[]
): Node<BlueprintNodeData>[] {
  if (nodes.length === 0) return nodes;

  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }
  for (const e of edges) {
    if (outgoing.has(e.source) && inDegree.has(e.target)) {
      outgoing.get(e.source)!.push(e.target);
      incoming.get(e.target)!.push(e.source);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
  }

  const layer = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
      layer.set(n.id, 0);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLayer = layer.get(curr) ?? 0;
    for (const next of outgoing.get(curr) ?? []) {
      layer.set(next, Math.max(layer.get(next) ?? 0, currLayer + 1));
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  for (const n of nodes) {
    if (!layer.has(n.id)) layer.set(n.id, 0);
  }

  const columns = new Map<number, Node<BlueprintNodeData>[]>();
  let maxLayer = 0;
  for (const n of nodes) {
    const col = layer.get(n.id) ?? 0;
    maxLayer = Math.max(maxLayer, col);
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col)!.push(n);
  }

  const COL_GAP = 310;
  const ROW_GAP = 190;
  const positioned = new Map<string, { x: number; y: number }>();

  for (let colIdx = 0; colIdx <= maxLayer; colIdx++) {
    const colNodes = columns.get(colIdx) ?? [];
    colNodes.sort((a, b) => {
      const parentsA = incoming.get(a.id) ?? [];
      const parentsB = incoming.get(b.id) ?? [];
      const avgA =
        parentsA.length > 0
          ? parentsA.reduce(
              (acc, pid) => acc + (positioned.get(pid)?.y ?? a.position.y),
              0
            ) / parentsA.length
          : a.position.y;
      const avgB =
        parentsB.length > 0
          ? parentsB.reduce(
              (acc, pid) => acc + (positioned.get(pid)?.y ?? b.position.y),
              0
            ) / parentsB.length
          : b.position.y;
      return avgA - avgB;
    });

    const totalHeight = (colNodes.length - 1) * ROW_GAP;
    const startY = 200 - totalHeight / 2;
    colNodes.forEach((n, rowIdx) => {
      positioned.set(n.id, {
        x: 320 + colIdx * COL_GAP,
        y: Math.round(startY + rowIdx * ROW_GAP),
      });
    });
  }

  return nodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) ?? n.position,
  }));
}

function BlueprintWorkspace() {
  const [initialSeed] = useState<SavedStrategy>(() => createDefaultStrategy());
  const [strategies, setStrategies] = useState<SavedStrategy[]>([initialSeed]);
  const [activeStrategyId, setActiveStrategyId] = useState<string>(
    initialSeed.id
  );
  const [strategyName, setStrategyName] = useState(initialSeed.name);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BlueprintNodeData>>(
    initialSeed.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialSeed.edges
  );
  const [savedLabel, setSavedLabel] = useState<string>("Save");
  const isHydratedRef = useRef(false);

  const [past, setPast] = useState<GraphSnapshot[]>([]);
  const [future, setFuture] = useState<GraphSnapshot[]>([]);

  const [language, setLanguage] = useState<PreviewLanguage>("mql5");
  const [activeTab, setActiveTab] = useState<
    "build" | "backtest" | "optimise" | "deploy"
  >("build");
  const [backtestRunTrigger, setBacktestRunTrigger] = useState(0);
  const [showExportDrawer, setShowExportDrawer] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">(
    "select"
  );

  const [activeConnection, setActiveConnection] =
    useState<ActiveConnection | null>(null);
  const [quickAddPos, setQuickAddPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 540, y: 260 });

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    screenToFlowPosition,
    fitView,
    zoomIn,
    zoomOut,
    getViewport,
    setViewport,
  } = useReactFlow();
  const { zoom } = useViewport();

  const fitViewOffsetForMenu = useCallback(
    (duration = 250) => {
      fitView({ padding: 0.22, duration: 0 });
      requestAnimationFrame(() => {
        const vp = getViewport();
        // Offset right so the leftmost On Price Tick node sits clear of the 268px Menu
        setViewport(
          {
            x: vp.x + 135,
            y: vp.y,
            zoom: Math.min(vp.zoom, 0.88),
          },
          { duration }
        );
      });
    },
    [fitView, getViewport, setViewport]
  );

  // Hydrate workspace from localStorage
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const ws = loadWorkspace();
      const active =
        ws.strategies.find((s) => s.id === ws.activeId) ?? ws.strategies[0];
      setStrategies(ws.strategies);
      setActiveStrategyId(active.id);
      setStrategyName(active.name);
      setNodes(active.nodes);
      setEdges(active.edges);
      if (active.viewport && active.viewport.zoom && active.viewport.x !== 0) {
        setViewport(active.viewport, { duration: 0 });
      } else {
        fitViewOffsetForMenu(0);
      }
      isHydratedRef.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [setNodes, setEdges, setViewport, fitViewOffsetForMenu]);

  const persistNow = useCallback(
    (
      nextNodes: Node<BlueprintNodeData>[],
      nextEdges: Edge[],
      nextName: string
    ) => {
      const vp = getViewport();
      setStrategies((prev) => {
        const updated = prev.map((s) =>
          s.id === activeStrategyId
            ? {
                ...s,
                name: nextName,
                nodes: nextNodes,
                edges: nextEdges,
                viewport: vp,
                updatedAt: Date.now(),
              }
            : s
        );
        saveWorkspace(updated, activeStrategyId);
        return updated;
      });
      setSavedLabel("Saved");
    },
    [activeStrategyId, getViewport]
  );

  useEffect(() => {
    if (!isHydratedRef.current) return;
    const timer = setTimeout(() => {
      persistNow(nodes, edges, strategyName);
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes, edges, strategyName, persistNow]);

  const pushHistory = useCallback(
    (snapshotNodes: Node<BlueprintNodeData>[], snapshotEdges: Edge[]) => {
      setPast((prev) => [
        ...prev.slice(-24),
        { nodes: snapshotNodes, edges: snapshotEdges },
      ]);
      setFuture([]);
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [{ nodes, edges }, ...prev]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [past, nodes, edges, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  const handleDuplicateSelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    pushHistory(nodes, edges);
    const copies = selectedNodes.map((n) => ({
      ...n,
      id: `${n.data.definitionId}-${Math.random().toString(36).slice(2, 8)}`,
      position: { x: n.position.x + 36, y: n.position.y + 36 },
      selected: true,
      data: {
        ...n.data,
        params: { ...n.data.params },
      },
    }));
    setNodes((nds) =>
      nds.map((n) => ({ ...n, selected: false })).concat(copies)
    );
  }, [nodes, edges, pushHistory, setNodes]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isEditing) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (activeTab === "build") handleDuplicateSelected();
        return;
      }
      if ((mod && e.key.toLowerCase() === "k") || e.key === "Tab") {
        if (activeTab === "build") {
          e.preventDefault();
          setQuickAddPos(lastMouseRef.current);
        }
        return;
      }
      if (e.key.toLowerCase() === "f" && !mod) {
        if (activeTab === "build") {
          e.preventDefault();
          fitView({ padding: 0.25, duration: 250 });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, fitView, handleDuplicateSelected, handleRedo, handleUndo]);

  const getPinType = useCallback(
    (
      nodeId: string,
      handleId: string | null | undefined,
      direction: "input" | "output"
    ): PinDataType | undefined => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !handleId) return undefined;
      const list = direction === "input" ? node.data.inputs : node.data.outputs;
      return list.find((p) => p.id === handleId)?.type;
    },
    [nodes]
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (connection.source === connection.target) return false;
      const sourceType = getPinType(
        connection.source,
        connection.sourceHandle,
        "output"
      );
      const targetType = getPinType(
        connection.target,
        connection.targetHandle,
        "input"
      );
      if (!sourceType || !targetType) return false;
      return sourceType === targetType;
    },
    [getPinType]
  );

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      if (!params.nodeId || !params.handleId || !params.handleType) return;
      const direction = params.handleType === "source" ? "output" : "input";
      const pinType = getPinType(params.nodeId, params.handleId, direction);
      if (!pinType) return;
      setActiveConnection({
        nodeId: params.nodeId,
        handleId: params.handleId,
        direction,
        pinType,
      });
    },
    [getPinType]
  );

  const onConnectEnd = useCallback(() => {
    setActiveConnection(null);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory(nodes, edges);
      const sourceType =
        getPinType(connection.source, connection.sourceHandle, "output") ??
        "number";
      const color = getWireColor(sourceType);
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: false,
            style: {
              stroke: color,
              strokeWidth: 1.5,
            },
          },
          eds
        )
      );
      setActiveConnection(null);
    },
    [getPinType, setEdges, pushHistory, nodes, edges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const definitionId = event.dataTransfer.getData(
        "application/blueprint-node"
      );
      if (!definitionId) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      pushHistory(nodes, edges);
      const newNode = createBlueprintNode(definitionId, position);
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, pushHistory, nodes, edges]
  );

  const handleAddNodeClick = useCallback(
    (definitionId: string) => {
      const wrapper = reactFlowWrapper.current;
      const rect = wrapper?.getBoundingClientRect();
      const center = rect
        ? screenToFlowPosition({
            x: rect.left + rect.width / 2 + 120 + (Math.random() - 0.5) * 90,
            y: rect.top + rect.height / 2 + (Math.random() - 0.5) * 90,
          })
        : { x: 420, y: 200 };
      pushHistory(nodes, edges);
      const newNode = createBlueprintNode(definitionId, center);
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, pushHistory, nodes, edges]
  );

  const handleQuickAddSelect = useCallback(
    (definitionId: string) => {
      if (!quickAddPos) return;
      const position = screenToFlowPosition(quickAddPos);
      pushHistory(nodes, edges);
      const newNode = createBlueprintNode(definitionId, position);
      setNodes((nds) => nds.concat(newNode));
      setQuickAddPos(null);
    },
    [quickAddPos, screenToFlowPosition, pushHistory, nodes, edges, setNodes]
  );

  const handlePresetChange = (presetId: string) => {
    const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    pushHistory(nodes, edges);
    setStrategyName(preset.name);
    setNodes(preset.nodes);
    setEdges(preset.edges);
    setTimeout(() => fitView({ padding: 0.25, duration: 280 }), 50);
  };

  const handleSelectStrategy = useCallback(
    (id: string) => {
      const target = strategies.find((s) => s.id === id);
      if (!target) return;
      setActiveStrategyId(target.id);
      setStrategyName(target.name);
      setNodes(target.nodes);
      setEdges(target.edges);
      setPast([]);
      setFuture([]);
      saveWorkspace(strategies, target.id);
      setTimeout(() => {
        if (target.viewport && target.viewport.zoom) {
          setViewport(target.viewport, { duration: 200 });
        } else {
          fitView({ padding: 0.25, duration: 200 });
        }
      }, 30);
    },
    [strategies, setNodes, setEdges, setViewport, fitView]
  );

  const handleCreateBlankStrategy = useCallback(() => {
    const blank = createBlankStrategy(strategies.length + 1);
    const next = [...strategies, blank];
    setStrategies(next);
    setActiveStrategyId(blank.id);
    setStrategyName(blank.name);
    setNodes([]);
    setEdges([]);
    setPast([]);
    setFuture([]);
    saveWorkspace(next, blank.id);
  }, [strategies, setNodes, setEdges]);

  const handleDuplicateStrategy = useCallback(
    (id: string) => {
      const source = strategies.find((s) => s.id === id);
      if (!source) return;
      const dup: SavedStrategy = {
        ...source,
        id: `strat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        name: `${source.name} (Copy)`,
        updatedAt: Date.now(),
      };
      const next = [...strategies, dup];
      setStrategies(next);
      setActiveStrategyId(dup.id);
      setStrategyName(dup.name);
      setNodes(dup.nodes);
      setEdges(dup.edges);
      saveWorkspace(next, dup.id);
    },
    [strategies, setNodes, setEdges]
  );

  const handleDeleteStrategy = useCallback(
    (id: string) => {
      if (strategies.length <= 1) return;
      const next = strategies.filter((s) => s.id !== id);
      setStrategies(next);
      if (id === activeStrategyId) {
        const fallback = next[0];
        setActiveStrategyId(fallback.id);
        setStrategyName(fallback.name);
        setNodes(fallback.nodes);
        setEdges(fallback.edges);
        saveWorkspace(next, fallback.id);
      } else {
        saveWorkspace(next, activeStrategyId);
      }
    },
    [strategies, activeStrategyId, setNodes, setEdges]
  );

  const handleExportBlueprintJson = useCallback(() => {
    exportBlueprintJson({
      name: strategyName,
      nodes,
      edges,
      viewport: getViewport(),
    });
  }, [strategyName, nodes, edges, getViewport]);

  const handleImportBlueprintJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const imported = parseBlueprintJson(text);
        const next = [...strategies, imported];
        setStrategies(next);
        setActiveStrategyId(imported.id);
        setStrategyName(imported.name);
        setNodes(imported.nodes);
        setEdges(imported.edges);
        setPast([]);
        setFuture([]);
        saveWorkspace(next, imported.id);
        setTimeout(() => fitView({ padding: 0.25, duration: 250 }), 40);
      } catch {
        // Ignore invalid JSON
      }
    },
    [strategies, setNodes, setEdges, fitView]
  );

  const handleAutoLayout = () => {
    pushHistory(nodes, edges);
    setNodes((nds) => autoLayoutGraph(nds, edges));
    setTimeout(() => fitView({ padding: 0.25, duration: 280 }), 40);
  };

  const mql5Result = useMemo(
    () => compileToMql5(strategyName, nodes, edges),
    [strategyName, nodes, edges]
  );

  const compileResult = useMemo(() => {
    if (language === "mql5") {
      return mql5Result;
    }
    return compileBlueprintGraph(strategyName, nodes, edges, language);
  }, [mql5Result, strategyName, nodes, edges, language]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#131417] text-slate-200 overflow-hidden">
      {/* Clean Minimal Top Bar with Centered 4-Step Switcher */}
      <header className="h-12 shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-4 border-b border-[#24262C] bg-[#16171A] z-20">
        {/* Left: Breadcrumb + Draft pill */}
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <StrategySwitcher
            strategies={strategies}
            activeId={activeStrategyId}
            onSelect={handleSelectStrategy}
            onCreateBlank={handleCreateBlankStrategy}
            onDuplicate={handleDuplicateStrategy}
            onDelete={handleDeleteStrategy}
            onExportJson={handleExportBlueprintJson}
            onImportJson={handleImportBlueprintJson}
          />
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            aria-label="Strategy Name"
            className="bg-transparent border border-transparent hover:border-[#2C2F36] focus:border-[#3B82F6] focus:bg-[#131417] focus:outline-none rounded px-1.5 py-0.5 text-xs font-medium text-slate-100 w-40 truncate transition-colors"
          />
          <span className="rounded bg-[#222429] px-2 py-0.5 text-[11px] font-medium text-slate-400 shrink-0">
            Draft
          </span>
        </div>

        {/* Center: 4-Stage Segmented Switcher */}
        <nav className="bg-[#0B0E14] border border-white/[0.07] p-1 rounded-lg flex items-center gap-1">
          {(
            [
              { id: "build", step: "01", label: "Build" },
              { id: "backtest", step: "02", label: "Backtest" },
              { id: "optimise", step: "03", label: "Optimise" },
              { id: "deploy", step: "04", label: "Deploy" },
            ] as const
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#141923] text-white border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                    : "border border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="font-mono text-[10px] text-zinc-500">
                  {item.step}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Run Backtest | Export | Save */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("backtest");
              setBacktestRunTrigger((n) => n + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2C2F36] bg-[#1B1D22] text-slate-300 hover:bg-[#23262D] hover:text-white px-2.5 py-1 text-xs font-medium transition-colors"
          >
            <Play className="h-3 w-3" />
            <span>Run Backtest</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportDrawer((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              showExportDrawer
                ? "border-[#3B82F6]/50 bg-[#3B82F6]/15 text-blue-300"
                : "border-[#2C2F36] bg-[#1B1D22] text-slate-300 hover:bg-[#23262D] hover:text-white"
            }`}
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => persistNow(nodes, edges, strategyName)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2C2F36] bg-[#1B1D22] hover:bg-[#23262D] px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Save className="h-3 w-3" />
            <span>{savedLabel}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      {activeTab === "backtest" ? (
        <BacktestView
          strategyName={strategyName}
          nodes={nodes}
          edges={edges}
          runTrigger={backtestRunTrigger}
        />
      ) : activeTab === "deploy" ? (
        <DeployView strategyName={strategyName} mql5Result={mql5Result} />
      ) : activeTab === "optimise" ? (
        <OptimizationView
          strategyName={strategyName}
          nodes={nodes}
          edges={edges}
          onApplyParams={(updates) => {
            pushHistory(nodes, edges);
            setNodes((nds) =>
              nds.map((n) => {
                const matching = updates.filter((u) => u.nodeId === n.id);
                if (matching.length === 0) return n;
                const nextParams = { ...n.data.params };
                for (const u of matching) nextParams[u.paramKey] = u.value;
                return { ...n, data: { ...n.data, params: nextParams } };
              })
            );
          }}
        />
      ) : (
        <div className="flex-1 flex min-h-0">
          <DiagnosticsContext.Provider value={mql5Result.nodeErrors}>
            <WiringContext.Provider value={activeConnection}>
              <main
                ref={reactFlowWrapper}
                onMouseMove={(e) => {
                  lastMouseRef.current = { x: e.clientX, y: e.clientY };
                }}
                onDoubleClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.classList.contains("react-flow__pane")) {
                    setQuickAddPos({ x: e.clientX, y: e.clientY });
                  }
                }}
                className="flex-1 relative bg-[#131417]"
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnectStart={onConnectStart}
                  onConnectEnd={onConnectEnd}
                  onConnect={onConnect}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  isValidConnection={isValidConnection}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.25 }}
                  snapToGrid
                  snapGrid={[16, 16]}
                  panOnDrag={interactionMode === "pan" ? true : [1, 2]}
                  selectionOnDrag={interactionMode === "select"}
                  panActivationKeyCode="Space"
                  deleteKeyCode={["Backspace", "Delete"]}
                  zoomOnDoubleClick={false}
                  defaultEdgeOptions={{
                    type: "smoothstep",
                    animated: false,
                    style: { stroke: "#E2E8F0", strokeWidth: 1.5 },
                  }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#25272C"
                  />
                  <MiniMap
                    position="bottom-right"
                    pannable
                    zoomable
                    style={{ width: 176, height: 112 }}
                    bgColor="#16171B"
                    maskColor="rgba(13, 14, 17, 0.72)"
                    maskStrokeColor="rgba(59, 130, 246, 0.5)"
                    maskStrokeWidth={1.5}
                    nodeBorderRadius={4}
                    nodeStrokeWidth={1.5}
                    nodeStrokeColor={(node) =>
                      node.selected ? "#3B82F6" : "#3A3E48"
                    }
                    nodeColor={(node) => {
                      if (node.selected) return "rgba(59, 130, 246, 0.35)";
                      const cat = (node.data as BlueprintNodeData)?.category;
                      switch (cat) {
                        case "events":
                          return "rgba(239, 68, 68, 0.25)";
                        case "indicators":
                          return "rgba(59, 130, 246, 0.25)";
                        case "conditions":
                          return "rgba(139, 92, 246, 0.25)";
                        case "actions":
                          return "rgba(16, 185, 129, 0.25)";
                        default:
                          return "#262932";
                      }
                    }}
                  />
                </ReactFlow>

                {/* Left Docked 'Menu' Panel (Overview / Nodes / Library) */}
                <NodePalette
                  onAddNode={handleAddNodeClick}
                  onSelectPreset={handlePresetChange}
                  nodeCount={nodes.length}
                  edgeCount={edges.length}
                  warnings={compileResult.warnings}
                  executionSteps={mql5Result.topologicalOrder
                    .map((id) => {
                      const n = nodes.find((node) => node.id === id);
                      return n
                        ? {
                            id: n.id,
                            definitionId: n.data.definitionId,
                            label: n.data.label,
                            category: n.data.category,
                          }
                        : null;
                    })
                    .filter(
                      (
                        s
                      ): s is {
                        id: string;
                        definitionId: string;
                        label: string;
                        category: BlueprintNodeData["category"];
                      } => s !== null
                    )}
                />

                {/* Bottom-Center Floating Toolbar (Matches Screenshot) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-lg border border-[#2C2F36] bg-[#1B1D22]/95 px-2 py-1 backdrop-blur-md shadow-xl">
                  <button
                    type="button"
                    onClick={() => zoomOut({ duration: 150 })}
                    title="Zoom Out"
                    className="rounded p-1 text-slate-400 hover:bg-[#26282E] hover:text-slate-100 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>

                  <span className="px-1.5 font-mono tabular-nums text-[11px] text-slate-200 min-w-[40px] text-center select-none">
                    {Math.round(zoom * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={() => zoomIn({ duration: 150 })}
                    title="Zoom In"
                    className="rounded p-1 text-slate-400 hover:bg-[#26282E] hover:text-slate-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-[#2C2F36] mx-1" />

                  <button
                    type="button"
                    onClick={() => setInteractionMode("select")}
                    title="Select Mode"
                    className={`rounded p-1 transition-colors ${
                      interactionMode === "select"
                        ? "bg-[#26282E] text-white"
                        : "text-slate-400 hover:bg-[#26282E] hover:text-slate-100"
                    }`}
                  >
                    <MousePointer2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setInteractionMode("pan")}
                    title="Hand / Pan Mode (or hold Space)"
                    className={`rounded p-1 transition-colors ${
                      interactionMode === "pan"
                        ? "bg-[#26282E] text-white"
                        : "text-slate-400 hover:bg-[#26282E] hover:text-slate-100"
                    }`}
                  >
                    <Hand className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-[#2C2F36] mx-1" />

                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={past.length === 0}
                    title="Undo (Ctrl/Cmd+Z)"
                    className="rounded p-1 text-slate-400 hover:bg-[#26282E] hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={future.length === 0}
                    title="Redo (Ctrl/Cmd+Shift+Z)"
                    className="rounded p-1 text-slate-400 hover:bg-[#26282E] hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-[#2C2F36] mx-1" />

                  <button
                    type="button"
                    onClick={() => fitViewOffsetForMenu(250)}
                    title="Fit View (F)"
                    className="rounded p-1 text-slate-400 hover:bg-[#26282E] hover:text-slate-100 transition-colors"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoLayout}
                    title="Auto Layout"
                    className="rounded p-1 text-slate-400 hover:bg-[#26282E] hover:text-slate-100 transition-colors"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Quick-Add Spotlight Palette */}
                {quickAddPos && (
                  <QuickAddPalette
                    position={quickAddPos}
                    onSelect={handleQuickAddSelect}
                    onClose={() => setQuickAddPos(null)}
                  />
                )}
              </main>
            </WiringContext.Provider>
          </DiagnosticsContext.Provider>

          {/* Collapsible Right Export / Code Drawer */}
          <CodePreviewPanel
            isOpen={showExportDrawer}
            onClose={() => setShowExportDrawer(false)}
            compileResult={compileResult}
            language={language}
            onLanguageChange={setLanguage}
            strategyName={strategyName}
          />
        </div>
      )}
    </div>
  );
}

const emptySubscribe = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function StrategyBuilder() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#131417] text-slate-200 overflow-hidden">
        <header className="h-12 shrink-0 border-b border-[#24262C] bg-[#16171A]" />
        <div className="flex-1 bg-[#131417]" />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <BlueprintWorkspace />
    </ReactFlowProvider>
  );
}
