"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import {
  Camera,
  Crosshair,
  Database,
  Download,
  Lock,
  Magnet,
  Maximize2,
  PenLine,
  Play,
  Ruler,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Type,
  Upload,
  ZoomIn,
} from "lucide-react";
import { BlueprintNodeData } from "@/lib/blueprint/types";
import {
  generateSampleEurUsd1H,
  parseOhlcvCsv,
} from "@/lib/backtest/sample-data";
import {
  BacktestConfig,
  BacktestResult,
  OhlcvBar,
} from "@/lib/backtest/types";

interface BacktestViewProps {
  strategyName?: string;
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
  runTrigger?: number;
}

function formatUtcTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}, ${hh}:${min}`;
}

function computeAtr14(bars: OhlcvBar[], period = 14): { time: Time; value: number }[] {
  if (bars.length === 0) return [];
  const trs: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (i === 0) {
      trs.push(b.high - b.low);
    } else {
      const prevClose = bars[i - 1].close;
      trs.push(
        Math.max(
          b.high - b.low,
          Math.abs(b.high - prevClose),
          Math.abs(b.low - prevClose)
        )
      );
    }
  }
  const out: { time: Time; value: number }[] = [];
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, trs.length);
  for (let i = 0; i < bars.length; i++) {
    if (i >= period) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }
    out.push({ time: bars[i].time as Time, value: Number(atr.toFixed(5)) });
  }
  return out;
}

const DRAWING_TOOLS = [
  { icon: Crosshair, label: "Crosshair" },
  { icon: TrendingUp, label: "Trend Line" },
  { icon: PenLine, label: "Brush" },
  { icon: Type, label: "Text" },
  { icon: Ruler, label: "Measure" },
  { icon: ZoomIn, label: "Zoom In" },
  { icon: Magnet, label: "Magnet Mode" },
  { icon: Lock, label: "Lock Drawings" },
  { icon: Trash2, label: "Clear Drawings" },
];

export function BacktestView({
  strategyName = "Strategy",
  nodes,
  edges,
  runTrigger = 0,
}: BacktestViewProps) {
  const [bars, setBars] = useState<OhlcvBar[]>(() => generateSampleEurUsd1H(500));
  const [dataLabel, setDataLabel] = useState("EURUSD · 1h");
  const [csvError, setCsvError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"overview" | "analytics" | "tradelog">(
    "tradelog"
  );
  const [activeTool, setActiveTool] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [initialBalance, setInitialBalance] = useState(10000);
  const [spreadPips, setSpreadPips] = useState(1.2);
  const [commissionPerLot, setCommissionPerLot] = useState(7.0);

  const [isRunning, setIsRunning] = useState(true);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [hoveredBar, setHoveredBar] = useState<OhlcvBar | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const equityContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const launchWorker = useCallback(
    (
      simBars: OhlcvBar[],
      simBalance: number,
      simSpread: number,
      simComm: number
    ) => {
      const config: BacktestConfig = {
        initialBalance: simBalance,
        spreadPips: simSpread,
        commissionPerLot: simComm,
        pipSize: 0.0001,
        contractSize: 100000,
      };

      const worker = new Worker(
        new URL("../../lib/backtest/backtest.worker.ts", import.meta.url)
      );

      worker.onmessage = (
        event: MessageEvent<
          | { type: "RESULT"; result: BacktestResult }
          | { type: "ERROR"; error: string }
        >
      ) => {
        if (event.data.type === "RESULT") {
          setResult(event.data.result);
        } else {
          setCsvError(event.data.error);
        }
        setIsRunning(false);
        worker.terminate();
      };

      worker.onerror = (err) => {
        setCsvError(err.message || "Web Worker execution failed.");
        setIsRunning(false);
        worker.terminate();
      };

      worker.postMessage({ nodes, edges, bars: simBars, config });
      return worker;
    },
    [nodes, edges]
  );

  const runSimulation = useCallback(() => {
    setIsRunning(true);
    setCsvError(null);
    launchWorker(bars, initialBalance, spreadPips, commissionPerLot);
  }, [launchWorker, bars, initialBalance, spreadPips, commissionPerLot]);

  useEffect(() => {
    const worker = launchWorker(
      bars,
      initialBalance,
      spreadPips,
      commissionPerLot
    );
    return () => worker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runTrigger]);

  // Render TradingView-style Candlestick + ATR 14 Sub-pane + TP/SL Overlay
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !result || subTab === "overview") return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#131417" },
        textColor: "#787B86",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1B1D23" },
        horzLines: { color: "#1B1D23" },
      },
      crosshair: {
        vertLine: { color: "#475569", labelBackgroundColor: "#1E222D" },
        horzLine: { color: "#475569", labelBackgroundColor: "#1E222D" },
      },
      rightPriceScale: {
        borderColor: "#22252C",
        scaleMargins: { top: 0.06, bottom: 0.24 },
      },
      timeScale: {
        borderColor: "#22252C",
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    // TradingView blue/red candles matching reference screenshot
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#2196F3",
      downColor: "#EF5350",
      borderUpColor: "#2196F3",
      borderDownColor: "#EF5350",
      wickUpColor: "#2196F3",
      wickDownColor: "#EF5350",
    });

    candleSeries.setData(
      result.bars.map((b) => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
    );

    // ATR 14 lower sub-pane
    const atrSeries = chart.addSeries(LineSeries, {
      color: "#3B82F6",
      lineWidth: 1,
      priceScaleId: "atr",
      lastValueVisible: true,
      priceLineVisible: false,
    });
    chart.priceScale("atr").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0.02 },
    });
    atrSeries.setData(computeAtr14(result.bars));

    const markers: SeriesMarker<Time>[] = [];
    for (const t of result.trades) {
      markers.push({
        time: t.entryTime as Time,
        position: t.side === "BUY" ? "belowBar" : "aboveBar",
        color: t.side === "BUY" ? "#22C55E" : "#EF4444",
        shape: t.side === "BUY" ? "arrowUp" : "arrowDown",
        text: "",
      });
    }
    markers.sort((a, b) => Number(a.time) - Number(b.time));
    createSeriesMarkers(candleSeries, markers);

    const barLookup = new Map(result.bars.map((b) => [b.time, b]));
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const b = barLookup.get(Number(param.time));
        if (b) setHoveredBar(b);
      }
    });

    const drawBoxes = () => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ts = chart.timeScale();
      for (const t of result.trades) {
        const x1 = ts.timeToCoordinate(t.entryTime as Time);
        const x2 = ts.timeToCoordinate(t.exitTime as Time);
        const yEntry = candleSeries.priceToCoordinate(t.entryPrice);
        const yExit = candleSeries.priceToCoordinate(t.exitPrice);

        if (x1 === null || x2 === null || yEntry === null) continue;
        const left = Math.min(x1, x2);
        const width = Math.max(8, Math.abs(x2 - x1));

        if (t.tp !== null) {
          const yTp = candleSeries.priceToCoordinate(t.tp);
          if (yTp !== null) {
            ctx.fillStyle = "rgba(16, 185, 129, 0.16)";
            ctx.fillRect(
              left,
              Math.min(yEntry, yTp),
              width,
              Math.abs(yTp - yEntry)
            );
          }
        }

        if (t.sl !== null) {
          const ySl = candleSeries.priceToCoordinate(t.sl);
          if (ySl !== null) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.16)";
            ctx.fillRect(
              left,
              Math.min(yEntry, ySl),
              width,
              Math.abs(ySl - yEntry)
            );
          }
        }

        if (yExit !== null) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle =
            t.netPnl >= 0 ? "rgba(34, 197, 94, 0.65)" : "rgba(239, 68, 68, 0.65)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x1, yEntry);
          ctx.lineTo(x2, yExit);
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    chart.timeScale().fitContent();
    requestAnimationFrame(drawBoxes);
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      requestAnimationFrame(drawBoxes);
    });
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
        requestAnimationFrame(drawBoxes);
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [result, subTab]);

  // Render Equity Curve for Overview tab
  useEffect(() => {
    const container = equityContainerRef.current;
    if (!container || !result || subTab !== "overview") return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#131417" },
        textColor: "#787B86",
      },
      grid: {
        vertLines: { color: "#1B1D23" },
        horzLines: { color: "#1B1D23" },
      },
      rightPriceScale: { borderColor: "#22252C" },
      timeScale: { borderColor: "#22252C", timeVisible: true },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: "#3B82F6",
      topColor: "rgba(59, 130, 246, 0.25)",
      bottomColor: "rgba(59, 130, 246, 0.02)",
      lineWidth: 2,
    });
    area.setData(
      result.equityCurve.map((pt) => ({
        time: pt.time as Time,
        value: pt.value,
      }))
    );
    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        chart.applyOptions({
          width: e.contentRect.width,
          height: e.contentRect.height,
        });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [result, subTab]);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseOhlcvCsv(text);
      setBars(parsed);
      setDataLabel(`${file.name}`);
      setCsvError(null);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Failed to parse CSV.");
    }
  };

  const handleLoadSample = () => {
    const sample = generateSampleEurUsd1H(500);
    setBars(sample);
    setDataLabel("EURUSD · 1h");
    setCsvError(null);
  };

  const handleExportTradesCsv = () => {
    if (!result) return;
    const header =
      "OrderOpen,PositionClosed,Side,Qty,SL,TP,OpenPrice,ClosePrice,Commission,GrossProfit,NetProfit\n";
    const body = result.trades
      .map(
        (t) =>
          `${formatUtcTime(t.entryTime)},${formatUtcTime(t.exitTime)},${t.side},${t.lots},${t.sl ?? ""},${t.tp ?? ""},${t.entryPrice},${t.exitPrice},${t.commission},${t.grossPnl},${t.netPnl}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${strategyName.toLowerCase().replace(/\s+/g, "-")}-trades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const m = result?.metrics;
  const activeBar = hoveredBar ?? bars[bars.length - 1];
  const buyTrades = result?.trades.filter((t) => t.side === "BUY") ?? [];
  const sellTrades = result?.trades.filter((t) => t.side === "SELL") ?? [];

  // Running balance per trade row (matching screenshot)
  const tradesWithBalance = useMemo(() => {
    if (!result) return [];
    let running = initialBalance;
    return result.trades.map((t) => {
      running += t.netPnl;
      return { ...t, balanceAfter: running };
    });
  }, [result, initialBalance]);

  return (
    <div className="flex-1 flex flex-col bg-[#131417] text-slate-200 min-h-0 overflow-hidden">
      {/* Window Sub-Header: Strategy Title + Export */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[#22242A] bg-[#141519]">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-100">{strategyName}</span>
          <span className="text-slate-600">-</span>
          <span className="text-blue-400 font-medium">{dataLabel}</span>
          {isRunning && (
            <span className="ml-2 font-mono text-[10px] text-blue-400 animate-pulse">
              Simulating...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportTradesCsv}
            title="Export Trade Log CSV"
            className="rounded p-1 text-slate-400 hover:bg-[#22242A] hover:text-slate-100 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={runSimulation}
            disabled={isRunning}
            className="inline-flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors"
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            <span>Re-run</span>
          </button>
        </div>
      </div>

      {/* Full-Width 3-Tab Underline Bar: Overview | Analytics | Trade Log */}
      <div className="shrink-0 grid grid-cols-3 border-b border-[#22242A] bg-[#141519]">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "analytics", label: "Analytics" },
            { id: "tradelog", label: "Trade Log" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`py-2 text-xs font-medium text-center border-b-2 transition-colors ${
              subTab === tab.id
                ? "border-[#3B82F6] text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {csvError && (
        <div className="mx-4 mt-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {csvError}
        </div>
      )}

      {/* Overview Tab */}
      {subTab === "overview" ? (
        <div className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-hidden">
          <div className="grid grid-cols-5 gap-3 shrink-0">
            <div className="rounded-lg border border-[#24262C] bg-[#18191D] px-3.5 py-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Net Profit
              </div>
              <div
                className={`mt-1 text-lg font-bold font-mono ${
                  (m?.netProfit ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {(m?.netProfit ?? 0) >= 0 ? "+" : ""}$
                {(m?.netProfit ?? 0).toFixed(2)}{" "}
                <span className="text-xs font-normal">
                  ({m?.returnPct ?? 0}%)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[#24262C] bg-[#18191D] px-3.5 py-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Win Rate
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-blue-400">
                {m?.winRate ?? 0}%{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({m?.winningTrades ?? 0}W/{m?.losingTrades ?? 0}L)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[#24262C] bg-[#18191D] px-3.5 py-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Profit Factor
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-slate-100">
                {m?.profitFactor ?? 0}
              </div>
            </div>

            <div className="rounded-lg border border-[#24262C] bg-[#18191D] px-3.5 py-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Max Drawdown
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-amber-400">
                -${m?.maxDrawdown ?? 0}{" "}
                <span className="text-xs font-normal">
                  ({m?.maxDrawdownPct ?? 0}%)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[#24262C] bg-[#18191D] px-3.5 py-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Total Trades
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-slate-200">
                {m?.totalTrades ?? 0}
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-lg border border-[#24262C] overflow-hidden">
            <div ref={equityContainerRef} className="w-full h-full" />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* TradingView-Style Chart Top Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-[#22242A] bg-[#131417] text-[11px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-medium text-slate-200">
                <Search className="h-3 w-3 text-slate-400" />
                <span>{dataLabel}</span>
              </div>

              <div className="h-3.5 w-px bg-[#24262C]" />

              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
              >
                <Database className="h-3 w-3" />
                <span>Sample 1H</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
              >
                <Upload className="h-3 w-3" />
                <span>Upload CSV</span>
              </button>
            </div>

            <div className="relative flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-slate-400 hover:bg-[#1E2026] hover:text-slate-200"
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Sim Settings</span>
              </button>
              <button
                type="button"
                onClick={() => chartRef.current?.timeScale().fitContent()}
                title="Fit Chart"
                className="rounded p-1 text-slate-400 hover:bg-[#1E2026] hover:text-slate-200"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <Camera className="h-3.5 w-3.5 text-slate-500" />

              {showSettings && (
                <div className="absolute right-0 top-full mt-2 z-40 w-60 rounded-lg border border-[#2C2F36] bg-[#18191D] p-3 shadow-2xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Simulation Parameters
                  </div>
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Balance ($)</span>
                    <input
                      type="number"
                      value={initialBalance}
                      onChange={(e) =>
                        setInitialBalance(Number(e.target.value) || 10000)
                      }
                      className="w-20 rounded bg-[#131417] border border-[#2C2F36] px-2 py-0.5 text-right font-mono"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Spread (pips)</span>
                    <input
                      type="number"
                      step={0.1}
                      value={spreadPips}
                      onChange={(e) => setSpreadPips(Number(e.target.value) || 0)}
                      className="w-20 rounded bg-[#131417] border border-[#2C2F36] px-2 py-0.5 text-right font-mono"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Comm ($/lot)</span>
                    <input
                      type="number"
                      step={0.5}
                      value={commissionPerLot}
                      onChange={(e) =>
                        setCommissionPerLot(Number(e.target.value) || 0)
                      }
                      className="w-20 rounded bg-[#131417] border border-[#2C2F36] px-2 py-0.5 text-right font-mono"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettings(false);
                      runSimulation();
                    }}
                    className="w-full rounded bg-blue-600 hover:bg-blue-500 py-1 text-xs font-medium text-white"
                  >
                    Apply &amp; Run
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chart Body with Left Drawing Tool Rail */}
          <div className="flex-[3] min-h-[260px] flex border-b border-[#22242A]">
            {/* Left Vertical Drawing Tools (w-9) */}
            <div className="w-9 shrink-0 flex flex-col items-center py-2 gap-1 border-r border-[#22242A] bg-[#131417]">
              {DRAWING_TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    title={tool.label}
                    onClick={() => setActiveTool(i)}
                    className={`rounded p-1.5 transition-colors ${
                      activeTool === i
                        ? "bg-[#22252D] text-blue-400"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Candlestick Chart + Overlay */}
            <div className="relative flex-1 min-w-0">
              <div ref={chartContainerRef} className="w-full h-full" />
              <canvas
                ref={overlayCanvasRef}
                className="pointer-events-none absolute inset-0 z-10"
              />

              {/* OHLCV Live Legend Overlay */}
              {activeBar && (
                <div className="pointer-events-none absolute top-2 left-3 z-20 flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-slate-300 font-semibold">
                    EURUSD · 1h
                  </span>
                  <span className="text-emerald-400">
                    O {activeBar.open.toFixed(5)}
                  </span>
                  <span className="text-emerald-400">
                    H {activeBar.high.toFixed(5)}
                  </span>
                  <span className="text-rose-400">
                    L {activeBar.low.toFixed(5)}
                  </span>
                  <span className="text-slate-200">
                    C {activeBar.close.toFixed(5)}
                  </span>
                </div>
              )}

              {/* ATR 14 Sub-pane label */}
              <div className="pointer-events-none absolute bottom-[21%] left-3 z-20 text-[10px] font-mono text-blue-400">
                ATR 14
              </div>
            </div>
          </div>

          {/* Bottom Section: Analytics or Trade Log */}
          {subTab === "analytics" ? (
            <div className="flex-[2] min-h-[180px] p-4 grid grid-cols-3 gap-3 bg-[#141519] overflow-auto">
              <div className="rounded-lg border border-[#24262C] bg-[#18191D] p-3.5 space-y-1.5">
                <div className="text-xs font-semibold text-slate-200">
                  Long Trades
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Count: {buyTrades.length}
                </div>
                <div className="text-xs font-mono text-emerald-400">
                  Net: $
                  {buyTrades.reduce((a, b) => a + b.netPnl, 0).toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg border border-[#24262C] bg-[#18191D] p-3.5 space-y-1.5">
                <div className="text-xs font-semibold text-slate-200">
                  Short Trades
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Count: {sellTrades.length}
                </div>
                <div className="text-xs font-mono text-rose-400">
                  Net: $
                  {sellTrades.reduce((a, b) => a + b.netPnl, 0).toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg border border-[#24262C] bg-[#18191D] p-3.5 space-y-1.5">
                <div className="text-xs font-semibold text-slate-200">
                  Performance
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Win Rate: {m?.winRate ?? 0}% · PF: {m?.profitFactor ?? 0}
                </div>
                <div className="text-xs font-mono text-slate-200">
                  Final Balance: ${(m?.finalBalance ?? initialBalance).toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-[2] min-h-[180px] flex flex-col bg-[#131417] overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-[11px] font-mono tabular-nums">
                  <thead className="sticky top-0 bg-[#16171B] text-[10px] text-slate-400 border-b border-[#22242A]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Order Open</th>
                      <th className="px-3 py-2 font-medium">Position Closed</th>
                      <th className="px-3 py-2 font-medium">Symbol</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Spread
                      </th>
                      <th className="px-3 py-2 font-medium">Order Type</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Balance
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Quantity
                      </th>
                      <th className="px-3 py-2 font-medium text-right">SL</th>
                      <th className="px-3 py-2 font-medium text-right">TP</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Open Price
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Close Price
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Commission
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Gross Profit
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Net Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D1F25]">
                    {tradesWithBalance.length === 0 ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="px-4 py-8 text-center text-slate-500 font-sans"
                        >
                          No trades executed on this dataset.
                        </td>
                      </tr>
                    ) : (
                      tradesWithBalance.map((t) => (
                        <tr key={t.id} className="hover:bg-[#1A1C22]">
                          <td className="px-3 py-1.5 text-slate-300">
                            {formatUtcTime(t.entryTime)}
                          </td>
                          <td className="px-3 py-1.5 text-slate-300">
                            {formatUtcTime(t.exitTime)}
                          </td>
                          <td className="px-3 py-1.5 text-slate-300">EURUSD</td>
                          <td className="px-3 py-1.5 text-right text-slate-400">
                            {spreadPips.toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5 text-slate-400">Market</td>
                          <td
                            className={`px-3 py-1.5 font-medium ${
                              t.side === "BUY"
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {t.side === "BUY" ? "Buy" : "Sell"}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-200">
                            {t.balanceAfter.toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-300">
                            {t.lots.toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-400">
                            {t.sl !== null ? t.sl.toFixed(5) : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-400">
                            {t.tp !== null ? t.tp.toFixed(5) : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-200">
                            {t.entryPrice.toFixed(5)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-200">
                            {t.exitPrice.toFixed(5)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-400">
                            -{t.commission.toFixed(2)}
                          </td>
                          <td
                            className={`px-3 py-1.5 text-right ${
                              t.grossPnl >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {t.grossPnl.toFixed(2)}
                          </td>
                          <td
                            className={`px-3 py-1.5 text-right font-semibold ${
                              t.netPnl >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {t.netPnl.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
