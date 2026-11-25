"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
} from "lucide-react";
import { Mql5CompileResult } from "@/lib/mql5-compiler";

interface DeployViewProps {
  strategyName: string;
  mql5Result: Mql5CompileResult;
}

const SAMPLE_EXECUTIONS = [
  {
    time: "03:14",
    side: "Buy" as const,
    qty: "0.20",
    symbol: "EURUSD",
    fill: "1.0842",
    isPnl: false,
  },
  {
    time: "07:52",
    side: "Close" as const,
    qty: "0.20",
    symbol: "EURUSD",
    fill: "+18.4",
    isPnl: true,
  },
  {
    time: "11:05",
    side: "Sell" as const,
    qty: "0.20",
    symbol: "GBPUSD",
    fill: "1.2716",
    isPnl: false,
  },
  {
    time: "14:40",
    side: "Buy" as const,
    qty: "0.20",
    symbol: "XAUUSD",
    fill: "2318.6",
    isPnl: false,
  },
];

export function DeployView({ strategyName, mql5Result }: DeployViewProps) {
  const [copied, setCopied] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const safeSlug =
    strategyName.replace(/[^a-zA-Z0-9_-]+/g, "").trim() || "ExpertAdvisor";
  const fileName = `${safeSlug}.mq5`;
  const fileSizeKb = Math.max(1.2, mql5Result.code.length / 1024).toFixed(1);
  const lines = useMemo(() => mql5Result.code.split("\n"), [mql5Result.code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mql5Result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard errors in restricted contexts
    }
  };

  const handleDownload = () => {
    const blob = new Blob([mql5Result.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#111215] text-slate-200 flex flex-col items-center justify-center p-8"
      style={{
        backgroundImage: "radial-gradient(#22242A 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="w-full max-w-4xl space-y-8">
        {/* Main 2-Column Voren-Style Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          {/* Left Column: Connected .mq5 Card + MetaTrader 5 Card */}
          <div className="flex flex-col">
            {/* Top Card: Exported .mq5 File */}
            <div className="rounded-xl border border-[#26282E] bg-[#16171B] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Custom MQ5 File Badge */}
                  <div className="relative flex h-11 w-9 shrink-0 flex-col items-center justify-end rounded-md border border-[#2C2F36] bg-[#121317] pb-1.5">
                    <span className="absolute top-0 right-0 h-2.5 w-2.5 border-b border-l border-[#2C2F36] bg-[#1A1C22] rounded-bl-sm" />
                    <span className="font-mono text-[9px] font-bold tracking-wider text-blue-400">
                      MQ5
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-slate-100">
                      {fileName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {fileSizeKb} KB · Expert Advisor
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy MQL5 Source"
                    className="inline-flex items-center gap-1 rounded-md border border-[#2C2F36] bg-[#1B1D22] hover:bg-[#24262D] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download .mq5</span>
                  </button>
                </div>
              </div>

              {/* Emerald Ready Progress Line */}
              <div className="mt-4 mb-3 h-[2px] w-full rounded-full bg-emerald-500" />

              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  <span>Exported · full source included</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {mql5Result.warnings.length === 0
                    ? `${lines.length} lines · 0 errors`
                    : `${mql5Result.warnings.length} warning(s)`}
                </span>
              </div>
            </div>

            {/* Subtle Vertical Connector */}
            <div className="ml-8 h-6 w-px bg-[#2A2D35]" />

            {/* Bottom Card: MetaTrader 5 Execution Preview */}
            <div className="rounded-xl border border-[#26282E] bg-[#16171B] shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#22242A]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2C2F36] bg-[#121317] font-mono text-[11px] font-bold text-emerald-400">
                    MT5
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-100 leading-tight">
                      MetaTrader 5
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Your broker · your account
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Ready to run</span>
                </div>
              </div>

              <div className="px-5 py-3">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="pb-2 font-normal w-14">TIME</th>
                      <th className="pb-2 font-normal w-14">SIDE</th>
                      <th className="pb-2 font-normal">SYMBOL</th>
                      <th className="pb-2 font-normal text-right">FILL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2026]">
                    {SAMPLE_EXECUTIONS.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 text-slate-500">{row.time}</td>
                        <td
                          className={`py-1.5 font-medium ${
                            row.side === "Buy"
                              ? "text-emerald-400"
                              : row.side === "Sell"
                                ? "text-rose-400"
                                : "text-slate-400"
                          }`}
                        >
                          {row.side}
                        </td>
                        <td className="py-1.5 text-slate-300">
                          <span className="text-slate-500 mr-1.5">
                            {row.qty}
                          </span>
                          {row.symbol}
                        </td>
                        <td
                          className={`py-1.5 text-right ${
                            row.isPnl ? "text-emerald-400" : "text-slate-200"
                          }`}
                        >
                          {row.fill}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: TRADING ON ITS OWN */}
          <div className="space-y-6">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
              TRADING ON ITS OWN
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[13px] font-medium text-slate-100">
                    Never miss an entry
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Your setup fires whether you&apos;re at the screen or not.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[13px] font-medium text-slate-100">
                    Runs without TradingEdge
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Your EA keeps trading independently in MetaTrader 5.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[13px] font-medium text-slate-100">
                    Works with any MT5 broker
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Standard Expert Advisor, nothing proprietary.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSource((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#26282E] bg-[#16171B] hover:bg-[#1E2026] px-3 py-1.5 text-xs text-slate-300 transition-colors"
              >
                <Code2 className="h-3.5 w-3.5 text-slate-400" />
                <span>{showSource ? "Hide" : "Inspect"} MQL5 Source</span>
                {showSource ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Optional Collapsible Full MQL5 Source */}
        {showSource && (
          <div className="rounded-xl border border-[#26282E] bg-[#16171B] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#22242A]">
              <span className="font-mono text-xs text-slate-300">
                {fileName} · {lines.length} lines
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-mono text-slate-400 hover:text-white"
              >
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
            <div className="max-h-80 overflow-auto bg-[#111215] p-4 font-mono text-[11.5px] leading-5">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="w-8 pr-4 text-right select-none text-[10px] text-slate-600 align-top">
                        {idx + 1}
                      </td>
                      <td className="whitespace-pre text-slate-200">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
