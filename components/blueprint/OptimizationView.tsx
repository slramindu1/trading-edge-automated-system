"use client";

import React, { useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Folder,
  Play,
  Search,
} from "lucide-react";
import { BlueprintNodeData } from "@/lib/blueprint/types";
import {
  extractTunableParams,
  OptimizationRow,
  runGridOptimization,
} from "@/lib/backtest/optimizer";
import { generateSampleEurUsd1H } from "@/lib/backtest/sample-data";

interface OptimizationViewProps {
  strategyName: string;
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
  onApplyParams: (
    updates: Array<{ nodeId: string; paramKey: string; value: number }>
  ) => void;
}

type MetricKey =
  | "totalReturn"
  | "returnPct"
  | "profitFactor"
  | "winRate"
  | "drawdownPct";

type SortKey = keyof OptimizationRow;

const SCATTER_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#EF4444",
  "#84CC16",
];

function getMetricValue(row: OptimizationRow, key: MetricKey): number {
  return row[key];
}

function greenHeatColor(val: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
  // White-mint -> rich emerald -> deep forest green (matching Voren heatmap)
  const r = Math.round(235 - t * 225);
  const g = Math.round(252 - t * 145);
  const b = Math.round(240 - t * 205);
  return `rgb(${r}, ${g}, ${b})`;
}

function surfaceGradientColor(t: number): string {
  // Red -> Orange -> Yellow -> Bright Green (matching Voren 3D surface)
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.35) {
    const u = clamped / 0.35;
    return `rgb(239, ${Math.round(68 + u * 110)}, 45)`;
  }
  if (clamped < 0.68) {
    const u = (clamped - 0.35) / 0.33;
    return `rgb(${Math.round(239 - u * 40)}, ${Math.round(178 + u * 55)}, 35)`;
  }
  const u = (clamped - 0.68) / 0.32;
  return `rgb(${Math.round(199 - u * 165)}, ${Math.round(233 - u * 20)}, ${Math.round(35 + u * 65)})`;
}

export function OptimizationView({
  strategyName,
  nodes,
  edges,
  onApplyParams,
}: OptimizationViewProps) {
  const tunable = useMemo(() => extractTunableParams(nodes), [nodes]);
  const bars = useMemo(() => generateSampleEurUsd1H(500), []);

  const [paramAIdx, setParamAIdx] = useState(0);
  const [paramBIdx, setParamBIdx] = useState(Math.min(1, tunable.length - 1));

  const paramA = tunable[paramAIdx] ?? tunable[0];
  const paramB = tunable[paramBIdx] ?? tunable[1] ?? tunable[0];

  const [minA, setMinA] = useState(() =>
    paramA ? Math.max(1, Math.round(paramA.currentValue * 0.5)) : 5
  );
  const [maxA, setMaxA] = useState(() =>
    paramA ? Math.max(2, Math.round(paramA.currentValue * 1.5)) : 25
  );
  const [stepA, setStepA] = useState(() =>
    paramA && paramA.currentValue < 2 ? 0.05 : 5
  );

  const [minB, setMinB] = useState(() =>
    paramB ? Math.max(1, Math.round(paramB.currentValue * 0.5)) : 10
  );
  const [maxB, setMaxB] = useState(() =>
    paramB ? Math.max(2, Math.round(paramB.currentValue * 1.5)) : 50
  );
  const [stepB, setStepB] = useState(() =>
    paramB && paramB.currentValue < 2 ? 0.05 : 10
  );

  const [zMetric, setZMetric] = useState<MetricKey>("totalReturn");
  const [sortKey, setSortKey] = useState<SortKey>("totalReturn");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [appliedId, setAppliedId] = useState<number | null>(null);
  const [runSeed, setRunSeed] = useState(1);

  const rawRows: OptimizationRow[] = useMemo(() => {
    void runSeed;
    if (!paramA || !paramB) return [];
    return runGridOptimization(
      strategyName,
      nodes,
      edges,
      bars,
      {
        initialBalance: 10000,
        spreadPips: 1.2,
        commissionPerLot: 7.0,
        pipSize: 0.0001,
        contractSize: 100000,
      },
      {
        nodeId: paramA.nodeId,
        paramKey: paramA.paramKey,
        label: `${paramA.nodeLabel}.${paramA.paramLabel}`,
        min: minA,
        max: maxA,
        step: stepA,
      },
      {
        nodeId: paramB.nodeId,
        paramKey: paramB.paramKey,
        label: `${paramB.nodeLabel}.${paramB.paramLabel}`,
        min: minB,
        max: maxB,
        step: stepB,
      }
    );
  }, [
    runSeed,
    strategyName,
    nodes,
    edges,
    bars,
    paramA,
    paramB,
    minA,
    maxA,
    stepA,
    minB,
    maxB,
    stepB,
  ]);

  const sortedRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const list = q
      ? rawRows.filter((r) => r.name.toLowerCase().includes(q))
      : [...rawRows];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return list;
  }, [rawRows, filterText, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const uniqueA = useMemo(
    () =>
      Array.from(new Set(rawRows.map((r) => r.paramAValue))).sort(
        (a, b) => a - b
      ),
    [rawRows]
  );
  const uniqueB = useMemo(
    () =>
      Array.from(new Set(rawRows.map((r) => r.paramBValue))).sort(
        (a, b) => a - b
      ),
    [rawRows]
  );

  const metricVals = rawRows.map((r) => getMetricValue(r, zMetric));
  const minZ = metricVals.length ? Math.min(...metricVals) : 0;
  const maxZ = metricVals.length ? Math.max(...metricVals) : 1;

  const lookupZ = (a: number, b: number): number => {
    const found = rawRows.find(
      (r) => r.paramAValue === a && r.paramBValue === b
    );
    return found ? getMetricValue(found, zMetric) : 0;
  };

  const gridA = uniqueA.slice(0, 8);
  const gridB = uniqueB.slice(0, 8);

  return (
    <div className="flex-1 flex bg-[#111215] text-slate-200 min-h-0 overflow-hidden">
      {/* Left Optimization Runs & Sweep Config Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-[#22242A] bg-[#141519] p-3.5 space-y-4 overflow-y-auto">
        <div>
          <div className="text-[13px] font-semibold text-slate-100">
            Optimizations
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Run parameter sweeps
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search runs..."
            className="w-full rounded-md bg-[#111215] border border-[#24262C] pl-7 pr-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Folder Tree */}
        <div className="space-y-1 text-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            Folders
          </div>
          <div className="flex items-center gap-2 rounded-md bg-[#1D1F25] px-2 py-1.5 text-slate-200">
            <Folder className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{strategyName}</span>
          </div>
        </div>

        {/* Sweep Axes */}
        <div className="space-y-3 pt-2 border-t border-[#22242A]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Sweep Parameters
          </div>

          {paramA && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400">X-Axis Parameter</div>
              <select
                value={paramAIdx}
                onChange={(e) => setParamAIdx(Number(e.target.value))}
                className="w-full rounded bg-[#111215] border border-[#26282E] px-2 py-1 text-[11px] text-slate-200"
              >
                {tunable.map((p, idx) => (
                  <option key={`${p.nodeId}-${p.paramKey}`} value={idx}>
                    {p.nodeLabel} · {p.paramLabel}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  value={minA}
                  onChange={(e) => setMinA(Number(e.target.value))}
                  title="Min"
                  className="rounded bg-[#111215] border border-[#26282E] px-1.5 py-1 text-right font-mono text-[11px]"
                />
                <input
                  type="number"
                  value={maxA}
                  onChange={(e) => setMaxA(Number(e.target.value))}
                  title="Max"
                  className="rounded bg-[#111215] border border-[#26282E] px-1.5 py-1 text-right font-mono text-[11px]"
                />
                <input
                  type="number"
                  value={stepA}
                  onChange={(e) => setStepA(Number(e.target.value) || 1)}
                  title="Step"
                  className="rounded bg-[#111215] border border-[#26282E] px-1.5 py-1 text-right font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {paramB && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400">Y-Axis Parameter</div>
              <select
                value={paramBIdx}
                onChange={(e) => setParamBIdx(Number(e.target.value))}
                className="w-full rounded bg-[#111215] border border-[#26282E] px-2 py-1 text-[11px] text-slate-200"
              >
                {tunable.map((p, idx) => (
                  <option key={`${p.nodeId}-${p.paramKey}`} value={idx}>
                    {p.nodeLabel} · {p.paramLabel}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  value={minB}
                  onChange={(e) => setMinB(Number(e.target.value))}
                  title="Min"
                  className="rounded bg-[#111215] border border-[#26282E] px-1.5 py-1 text-right font-mono text-[11px]"
                />
                <input
                  type="number"
                  value={maxB}
                  onChange={(e) => setMaxB(Number(e.target.value))}
                  title="Max"
                  className="rounded bg-[#111215] border border-[#26282E] px-1.5 py-1 text-right font-mono text-[11px]"
                />
                <input
                  type="number"
                  value={stepB}
                  onChange={(e) => setStepB(Number(e.target.value) || 1)}
                  title="Step"
                  className="rounded bg-[#111215] border border-[#26282E] px-1.5 py-1 text-right font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setRunSeed((s) => s + 1)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-500 py-1.5 text-xs font-medium text-white transition-colors"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>New Optimization</span>
          </button>
        </div>
      </aside>

      {/* Main Results & Correlation Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-3 min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col rounded-xl border border-[#26282E] bg-[#16171B] shadow-2xl min-h-0 overflow-hidden">
          {/* Card Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#22242A]">
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {strategyName} — Backtest Results
              </div>
              <div className="text-[11px] text-slate-500">
                Showing all backtest results for this optimization run. Click a
                row to apply parameters.
              </div>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {sortedRows.length} runs
            </span>
          </div>

          {/* Sortable Results Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-left border-collapse text-[11px] font-mono tabular-nums">
              <thead className="sticky top-0 bg-[#1B1D22] text-[10px] text-slate-400 border-b border-[#26282E]">
                <tr>
                  {(
                    [
                      { key: "name", label: "Name", align: "left" },
                      { key: "id", label: "Status", align: "left" },
                      {
                        key: "totalReturn",
                        label: "Total Return ($)",
                        align: "right",
                      },
                      {
                        key: "returnPct",
                        label: "Total Return (%)",
                        align: "right",
                      },
                      {
                        key: "drawdownPct",
                        label: "Drawdown (%)",
                        align: "right",
                      },
                      {
                        key: "profitFactor",
                        label: "Profit Factor",
                        align: "right",
                      },
                      { key: "cagrPct", label: "CAGR (%)", align: "right" },
                      { key: "winRate", label: "Win Rate %", align: "right" },
                      {
                        key: "startBalance",
                        label: "Start Balance",
                        align: "right",
                      },
                      {
                        key: "endBalance",
                        label: "End Balance",
                        align: "right",
                      },
                      { key: "trades", label: "Trades", align: "right" },
                      {
                        key: "recoveryFactor",
                        label: "Recovery Factor",
                        align: "right",
                      },
                      {
                        key: "expectancy",
                        label: "Expectancy",
                        align: "right",
                      },
                    ] as const
                  ).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={`px-3 py-2 font-medium cursor-pointer select-none hover:text-slate-200 ${
                        col.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key &&
                          (sortAsc ? (
                            <ArrowUp className="h-2.5 w-2.5 text-blue-400" />
                          ) : (
                            <ArrowDown className="h-2.5 w-2.5 text-blue-400" />
                          ))}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202228]">
                {sortedRows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      if (!paramA || !paramB) return;
                      onApplyParams([
                        {
                          nodeId: paramA.nodeId,
                          paramKey: paramA.paramKey,
                          value: r.paramAValue,
                        },
                        {
                          nodeId: paramB.nodeId,
                          paramKey: paramB.paramKey,
                          value: r.paramBValue,
                        },
                      ]);
                      setAppliedId(r.id);
                    }}
                    className={`cursor-pointer transition-colors ${
                      appliedId === r.id
                        ? "bg-blue-500/15"
                        : "hover:bg-[#1E2026]"
                    }`}
                  >
                    <td className="px-3 py-1.5 text-slate-200 flex items-center gap-1.5">
                      {appliedId === r.id && (
                        <Check className="h-3 w-3 text-blue-400 shrink-0" />
                      )}
                      <span>{r.name}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        Completed
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-200">
                      {r.totalReturn.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-200">
                      {r.returnPct.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-300">
                      {r.drawdownPct.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-200">
                      {r.profitFactor.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-300">
                      {r.cagrPct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-200">
                      {r.winRate.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-400">
                      {r.startBalance}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-200">
                      {r.endBalance.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-300">
                      {r.trades}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-300">
                      {r.recoveryFactor.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-300">
                      {r.expectancy.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="shrink-0 flex items-center justify-end gap-4 px-4 py-1.5 border-t border-[#22242A] bg-[#141519] text-[11px] font-mono text-slate-400">
            <span>Page Size: 50</span>
            <span>
              1 to {sortedRows.length} of {sortedRows.length}
            </span>
            <span>Page 1 of 1</span>
          </div>

          {/* Parameter Correlation 3-Panel Section */}
          <div className="shrink-0 border-t border-[#24262C] bg-[#141519] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Parameter Correlation
              </span>
              <select
                value={zMetric}
                onChange={(e) => setZMetric(e.target.value as MetricKey)}
                className="rounded bg-[#1B1D22] border border-[#2C2F36] px-2 py-0.5 text-[11px] text-slate-300"
              >
                <option value="totalReturn">Metric: Total Return ($)</option>
                <option value="returnPct">Metric: Return (%)</option>
                <option value="profitFactor">Metric: Profit Factor</option>
                <option value="winRate">Metric: Win Rate (%)</option>
                <option value="drawdownPct">Metric: Drawdown (%)</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 h-[210px]">
              {/* 1. Heatmap */}
              <div className="rounded-lg border border-[#24262C] bg-[#16171B] p-2.5 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span className="font-medium text-slate-200">Heatmap</span>
                  <span className="font-mono">
                    {paramA?.paramLabel} × {paramB?.paramLabel}
                  </span>
                </div>

                <div className="flex-1 flex gap-2 min-h-0">
                  <div className="flex-1 flex flex-col gap-0.5">
                    {gridB.map((bVal) => (
                      <div key={bVal} className="flex-1 flex items-center gap-0.5">
                        <span className="w-7 text-[9px] font-mono text-slate-500 text-right pr-1">
                          {bVal}
                        </span>
                        {gridA.map((aVal) => {
                          const z = lookupZ(aVal, bVal);
                          return (
                            <div
                              key={`${aVal}-${bVal}`}
                              title={`${aVal} × ${bVal} → ${z.toFixed(2)}`}
                              className="flex-1 h-full rounded-[1px]"
                              style={{
                                backgroundColor: greenHeatColor(z, minZ, maxZ),
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                    <div className="flex pl-7 pt-1">
                      {gridA.map((aVal) => (
                        <span
                          key={aVal}
                          className="flex-1 text-center text-[9px] font-mono text-slate-500"
                        >
                          {aVal}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Color Scale Legend */}
                  <div className="w-3 rounded-sm bg-gradient-to-b from-emerald-950 via-emerald-500 to-emerald-50" />
                </div>
              </div>

              {/* 2. Isometric 3D Surface Mesh */}
              <div className="rounded-lg border border-[#24262C] bg-[#16171B] p-2.5 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-medium text-slate-200">Surface</span>
                  <span className="font-mono">{zMetric}</span>
                </div>

                <div className="flex-1 flex gap-2 min-h-0">
                  <svg viewBox="0 0 260 155" className="flex-1 h-full">
                    {gridB.slice(0, -1).map((bVal, bi) =>
                      gridA.slice(0, -1).map((aVal, ai) => {
                        const bNext = gridB[bi + 1];
                        const aNext = gridA[ai + 1];
                        const z00 = lookupZ(aVal, bVal);
                        const z10 = lookupZ(aNext, bVal);
                        const z11 = lookupZ(aNext, bNext);
                        const z01 = lookupZ(aVal, bNext);
                        const avgNorm =
                          ((z00 + z10 + z11 + z01) / 4 - minZ) /
                          (maxZ - minZ || 1);

                        const project = (ix: number, iy: number, val: number) => {
                          const norm = (val - minZ) / (maxZ - minZ || 1);
                          const px = 42 + ix * 20 + iy * 12;
                          const py = 122 - iy * 9 - norm * 56;
                          return `${px},${py}`;
                        };

                        const pts = [
                          project(ai, bi, z00),
                          project(ai + 1, bi, z10),
                          project(ai + 1, bi + 1, z11),
                          project(ai, bi + 1, z01),
                        ].join(" ");

                        return (
                          <polygon
                            key={`q-${ai}-${bi}`}
                            points={pts}
                            fill={surfaceGradientColor(avgNorm)}
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth="0.6"
                          />
                        );
                      })
                    )}
                  </svg>
                  <div className="w-3 rounded-sm bg-gradient-to-b from-emerald-500 via-yellow-400 to-red-500" />
                </div>
              </div>

              {/* 3. Multi-Series Scatter Plot */}
              <div className="rounded-lg border border-[#24262C] bg-[#16171B] p-2.5 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-medium text-slate-200">Scatter</span>
                  <span className="font-mono">
                    Group: {paramB?.paramLabel}
                  </span>
                </div>

                <div className="flex-1 flex gap-2 min-h-0">
                  <svg viewBox="0 0 230 155" className="flex-1 h-full">
                    <line
                      x1="24"
                      y1="10"
                      x2="24"
                      y2="132"
                      stroke="#26282E"
                      strokeWidth="1"
                    />
                    <line
                      x1="24"
                      y1="132"
                      x2="222"
                      y2="132"
                      stroke="#26282E"
                      strokeWidth="1"
                    />
                    {rawRows.slice(0, 64).map((r) => {
                      const xNorm =
                        (r.paramAValue - (uniqueA[0] ?? 0)) /
                        ((uniqueA[uniqueA.length - 1] ?? 1) -
                          (uniqueA[0] ?? 0) || 1);
                      const zVal = getMetricValue(r, zMetric);
                      const yNorm = (zVal - minZ) / (maxZ - minZ || 1);
                      const cx = 32 + xNorm * 182;
                      const cy = 124 - yNorm * 104;
                      const colorIdx =
                        Math.max(0, uniqueB.indexOf(r.paramBValue)) %
                        SCATTER_PALETTE.length;

                      return (
                        <circle
                          key={r.id}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill={SCATTER_PALETTE[colorIdx]}
                          fillOpacity={0.9}
                        >
                          <title>{`${r.name}: ${zVal.toFixed(2)}`}</title>
                        </circle>
                      );
                    })}
                  </svg>

                  {/* Group Legend */}
                  <div className="w-14 overflow-y-auto space-y-1 text-[9px] font-mono text-slate-400">
                    {uniqueB.slice(0, 6).map((bVal, idx) => (
                      <div key={bVal} className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              SCATTER_PALETTE[idx % SCATTER_PALETTE.length],
                          }}
                        />
                        <span className="truncate">{bVal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
