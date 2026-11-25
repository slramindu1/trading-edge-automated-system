"use client";

import React, { useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Workflow,
  Zap,
} from "lucide-react";
import {
  CrossoverIcon,
  MovingAverageIcon,
  NodeTypeIcon,
  RsiIcon,
} from "@/components/icons/NodeIcons";
import { NODE_CATALOG } from "@/lib/blueprint/catalog";
import { STRATEGY_PRESETS } from "@/lib/blueprint/presets";
import {
  BlueprintNodeDefinition,
  CATEGORY_THEME,
  NodeCategory,
} from "@/lib/blueprint/types";

interface ExecutionStep {
  id: string;
  definitionId: string;
  label: string;
  category: NodeCategory;
}

interface NodePaletteProps {
  onAddNode: (definitionId: string) => void;
  onSelectPreset: (presetId: string) => void;
  nodeCount: number;
  edgeCount: number;
  warnings: string[];
  executionSteps: ExecutionStep[];
}

const CATEGORIES: NodeCategory[] = [
  "events",
  "indicators",
  "conditions",
  "actions",
];

function CategoryIcon({ category }: { category: NodeCategory }) {
  switch (category) {
    case "events":
      return <Zap className="h-3.5 w-3.5 text-slate-400" />;
    case "indicators":
      return <Activity className="h-3.5 w-3.5 text-slate-400" />;
    case "conditions":
      return <GitBranch className="h-3.5 w-3.5 text-slate-400" />;
    case "actions":
      return <Play className="h-3.5 w-3.5 text-slate-400" />;
  }
}

export function NodePalette({
  onAddNode,
  onSelectPreset,
  nodeCount,
  edgeCount,
  warnings,
  executionSteps,
}: NodePaletteProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "nodes" | "library"
  >("nodes");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<NodeCategory, boolean>>({
    events: true,
    indicators: true,
    conditions: false,
    actions: false,
  });

  const grouped: Record<NodeCategory, BlueprintNodeDefinition[]> = {
    events: [],
    indicators: [],
    conditions: [],
    actions: [],
  };
  for (const item of NODE_CATALOG) {
    grouped[item.category].push(item);
  }

  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    definitionId: string
  ) => {
    event.dataTransfer.setData("application/blueprint-node", definitionId);
    event.dataTransfer.effectAllowed = "move";
  };

  if (isCollapsed) {
    return (
      <aside className="absolute top-3 left-3 z-10 rounded-xl bg-[#18191D] border border-[#26282E] p-1.5 shadow-xl">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title="Open Menu"
          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-[#24262C] hover:text-slate-100 transition-colors"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="absolute top-3 left-3 bottom-3 z-10 w-[268px] flex flex-col rounded-xl bg-[#18191D]/95 backdrop-blur-md border border-[#26282E] shadow-2xl select-none overflow-hidden">
      {/* Menu Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222429]">
        <span className="text-[13px] font-medium text-slate-200">Menu</span>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          title="Collapse Menu"
          className="cursor-pointer rounded p-1 text-slate-400 hover:bg-[#24262C] hover:text-slate-200 transition-colors"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 3-Tab Switcher: Overview | Nodes | Library */}
      <div className="px-3 py-2.5 border-b border-[#222429]">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#131417] p-1 border border-[#222429]">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`inline-flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              activeSubTab === "overview"
                ? "bg-[#26282E] text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="h-3 w-3" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("nodes")}
            className={`inline-flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              activeSubTab === "nodes"
                ? "bg-[#26282E] text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Workflow className="h-3 w-3" />
            <span>Nodes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("library")}
            className={`inline-flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              activeSubTab === "library"
                ? "bg-[#26282E] text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderOpen className="h-3 w-3" />
            <span>Library</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === "nodes" ? (
        <div className="flex-1 overflow-y-auto divide-y divide-[#222429]">
          {CATEGORIES.map((category) => {
            const items = grouped[category];
            const theme = CATEGORY_THEME[category];
            const isOpen = expanded[category];

            return (
              <div key={category}>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [category]: !prev[category],
                    }))
                  }
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon category={category} />
                    <span className="text-[12px] font-medium text-slate-200">
                      {theme.label}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-2 pb-2 space-y-0.5">
                    {items.map((node) => (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, node.id)}
                        onClick={() => onAddNode(node.id)}
                        title="Drag onto canvas or click to add"
                        className="group flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-slate-300 hover:bg-[#24262C] hover:text-white cursor-grab active:cursor-grabbing transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <NodeTypeIcon
                            definitionId={node.id}
                            className="h-3.5 w-3.5 text-slate-400 shrink-0"
                          />
                          <span className="truncate">{node.label}</span>
                        </div>
                        <Plus className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : activeSubTab === "overview" ? (
        <div className="flex-1 overflow-y-auto divide-y divide-[#222429] text-xs">
          {/* Status + Telemetry Summary */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    warnings.length === 0 ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span className="text-[12px] font-medium text-slate-200">
                  {warnings.length === 0
                    ? "Ready to compile"
                    : `${warnings.length} diagnostic${warnings.length > 1 ? "s" : ""}`}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {nodeCount}n · {edgeCount}w
              </span>
            </div>

            {/* Segmented Category Composition Bar */}
            {nodeCount > 0 && (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-[#131417] overflow-hidden flex gap-0.5">
                  {CATEGORIES.map((cat) => {
                    const count = executionSteps.filter(
                      (s) => s.category === cat
                    ).length;
                    if (count === 0) return null;
                    return (
                      <div
                        key={cat}
                        style={{
                          width: `${(count / Math.max(1, executionSteps.length)) * 100}%`,
                          backgroundColor: CATEGORY_THEME[cat].accentHex,
                        }}
                        className="h-full opacity-80"
                        title={`${CATEGORY_THEME[cat].label}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  {CATEGORIES.map((cat) => {
                    const count = executionSteps.filter(
                      (s) => s.category === cat
                    ).length;
                    return (
                      <span key={cat} className="inline-flex items-center gap-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: CATEGORY_THEME[cat].accentHex,
                          }}
                        />
                        <span className="font-mono">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clean Execution Flow Timeline */}
          <div className="px-4 py-3 space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Execution Flow
            </div>

            {executionSteps.length === 0 ? (
              <div className="py-3 text-[11px] text-slate-500">
                Drag nodes from the Nodes tab to start building.
              </div>
            ) : (
              <div className="relative pl-3 border-l border-[#282B33] space-y-1.5">
                {executionSteps.map((step) => (
                  <div
                    key={step.id}
                    className="relative flex items-center gap-2.5 rounded-md px-2 py-1 hover:bg-white/[0.03] transition-colors"
                  >
                    <span
                      className="absolute -left-[16.5px] h-2 w-2 rounded-full border-2 border-[#18191D]"
                      style={{
                        backgroundColor: CATEGORY_THEME[step.category].accentHex,
                      }}
                    />
                    <NodeTypeIcon
                      definitionId={step.definitionId}
                      className="h-3.5 w-3.5 text-slate-400 shrink-0"
                    />
                    <span className="truncate text-[12px] text-slate-200">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diagnostics (only when warnings exist) */}
          {warnings.length > 0 && (
            <div className="px-4 py-3 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                Attention Needed
              </div>
              <ul className="space-y-1 text-[11px] text-amber-200/85 leading-snug">
                {warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Strategy Templates
            </span>
            <span className="font-mono text-[10px] text-slate-600">
              {STRATEGY_PRESETS.length}
            </span>
          </div>

          <div className="space-y-2">
            {STRATEGY_PRESETS.map((preset) => {
              const isBlank = preset.id === "blank";
              const isRsi = preset.id === "rsi-mean-reversion";
              const isEmaCross = preset.id === "mql5-ema-sma-ea";
              const tag = isBlank
                ? "Scratch"
                : isRsi
                  ? "Mean Reversion"
                  : isEmaCross
                    ? "MQL5 Ready"
                    : "Momentum";

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className="group w-full text-left rounded-lg border border-[#24262C] bg-[#131417] hover:bg-[#1B1D23] hover:border-[#343842] p-3 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#2A2D35] bg-[#18191D] text-blue-400">
                        {isBlank ? (
                          <Plus className="h-3.5 w-3.5 text-slate-400" />
                        ) : isRsi ? (
                          <RsiIcon className="h-3.5 w-3.5 text-cyan-400" />
                        ) : isEmaCross ? (
                          <CrossoverIcon className="h-3.5 w-3.5 text-blue-400" />
                        ) : (
                          <MovingAverageIcon className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </div>
                      <span className="truncate text-[12px] font-medium text-slate-200 group-hover:text-white">
                        {preset.name}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Load →
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                    {preset.description}
                  </p>

                  <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono">
                    <span className="rounded bg-[#1B1D22] border border-[#26282E] px-1.5 py-0.5 text-slate-400">
                      {tag}
                    </span>
                    <span className="text-slate-600">
                      {preset.nodes.length === 0
                        ? "Empty"
                        : `${preset.nodes.length}n · ${preset.edges.length}w`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
