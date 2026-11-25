"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileCode2,
  X,
} from "lucide-react";
import { CompileResult, TargetLanguage } from "@/lib/blueprint/compiler";

export type PreviewLanguage = TargetLanguage | "mql5";

interface CodePreviewPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  fullWidth?: boolean;
  compileResult: CompileResult;
  language: PreviewLanguage;
  onLanguageChange: (lang: PreviewLanguage) => void;
  strategyName: string;
}

const KEYWORDS = new Set([
  "import",
  "from",
  "export",
  "const",
  "let",
  "async",
  "await",
  "if",
  "else",
  "class",
  "def",
  "and",
  "or",
  "pass",
  "True",
  "False",
  "true",
  "false",
  "input",
  "int",
  "ulong",
  "double",
  "bool",
  "void",
  "return",
  "#property",
  "#include",
  "strict",
]);

function highlightLine(line: string): React.ReactNode {
  const commentIdx = line.indexOf("//");
  const hashIdx =
    line.startsWith("#property") || line.startsWith("#include")
      ? -1
      : line.indexOf("#");
  const splitIdx =
    commentIdx !== -1 && (hashIdx === -1 || commentIdx < hashIdx)
      ? commentIdx
      : hashIdx;

  const codePart = splitIdx !== -1 ? line.slice(0, splitIdx) : line;
  const commentPart = splitIdx !== -1 ? line.slice(splitIdx) : "";

  const tokens = codePart.split(
    /(#property|#include|"[^"]*"|<[^>]*>|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*\b)/g
  );

  return (
    <>
      {tokens.map((tok, i) => {
        if (!tok) return null;
        if (
          (tok.startsWith('"') && tok.endsWith('"')) ||
          (tok.startsWith("<") && tok.endsWith(">"))
        ) {
          return (
            <span key={i} className="text-amber-300/90">
              {tok}
            </span>
          );
        }
        if (/^\d+(?:\.\d+)?$/.test(tok)) {
          return (
            <span key={i} className="text-emerald-400">
              {tok}
            </span>
          );
        }
        if (KEYWORDS.has(tok)) {
          return (
            <span key={i} className="text-blue-400 font-semibold">
              {tok}
            </span>
          );
        }
        if (
          tok === "defineStrategy" ||
          tok === "Strategy" ||
          tok === "indicators" ||
          tok === "broker" ||
          tok === "CTrade" ||
          tok === "trade" ||
          tok === "OnInit" ||
          tok === "OnDeinit" ||
          tok === "OnTick" ||
          tok === "iMA" ||
          tok === "CopyBuffer" ||
          tok === "ArraySetAsSeries" ||
          tok === "IndicatorRelease" ||
          tok === "SymbolInfoTick" ||
          tok === "MODE_SMA" ||
          tok === "MODE_EMA" ||
          tok === "PRICE_CLOSE" ||
          tok === "INIT_SUCCEEDED" ||
          tok === "INIT_FAILED" ||
          tok === "INVALID_HANDLE" ||
          tok === "crossAbove" ||
          tok === "crossBelow" ||
          tok === "cross_above" ||
          tok === "cross_below"
        ) {
          return (
            <span key={i} className="text-cyan-300">
              {tok}
            </span>
          );
        }
        return (
          <span key={i} className="text-slate-200">
            {tok}
          </span>
        );
      })}
      {commentPart && (
        <span className="text-slate-500 italic">{commentPart}</span>
      )}
    </>
  );
}

export function CodePreviewPanel({
  isOpen = true,
  onClose,
  fullWidth = false,
  compileResult,
  language,
  onLanguageChange,
  strategyName,
}: CodePreviewPanelProps) {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(
    () => compileResult.code.split("\n"),
    [compileResult.code]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compileResult.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard might be blocked in non-HTTPS contexts
    }
  };

  const handleDownload = () => {
    const ext =
      language === "mql5" ? "mq5" : language === "typescript" ? "ts" : "py";
    const slug =
      strategyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "strategy";
    const blob = new Blob([compileResult.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileName =
    language === "mql5"
      ? "ExpertAdvisor.mq5"
      : language === "typescript"
        ? "strategy.ts"
        : "strategy.py";

  return (
    <aside
      aria-hidden={!isOpen}
      className={
        fullWidth
          ? "flex-1 flex flex-col bg-[#080A0F] p-6 min-h-0 overflow-hidden"
          : `shrink-0 flex flex-col bg-[#0B0E14] transition-all duration-200 ease-out overflow-hidden ${
              isOpen
                ? "w-[380px] border-l border-white/[0.07] opacity-100"
                : "w-0 border-l-0 opacity-0 pointer-events-none"
            }`
      }
    >
      <div
        className={
          fullWidth
            ? "mx-auto w-full max-w-5xl h-full flex flex-col rounded-2xl border border-white/[0.08] bg-[#0D1117] overflow-hidden shadow-2xl"
            : "w-[380px] h-full flex flex-col"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <Code2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              Code & Export
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded-md bg-[#07090E] p-0.5 border border-white/[0.07]">
              <button
                type="button"
                onClick={() => onLanguageChange("mql5")}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  language === "mql5"
                    ? "bg-[#3B82F6] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                MQL5
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange("typescript")}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  language === "typescript"
                    ? "bg-[#3B82F6] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                TS
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange("python")}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  language === "python"
                    ? "bg-[#3B82F6] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Py
              </button>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Collapse drawer"
                className="rounded p-1 text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.07] bg-[#07090E]/50">
          <span className="text-[11px] font-mono text-slate-400">
            {fileName} · {lines.length}L
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-300 bg-[#0E1219] hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-white bg-[#3B82F6] hover:bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-colors"
            >
              <Download className="h-3 w-3" />
              <span>
                {language === "mql5"
                  ? "Download .mq5"
                  : language === "typescript"
                    ? "Download .ts"
                    : "Download .py"}
              </span>
            </button>
          </div>
        </div>

        {/* MT5 Export Readiness Card (Image 1) */}
        {language === "mql5" && (
          <div className="p-3 border-b border-[#24262C] bg-[#16171A] space-y-2.5">
            <div className="rounded-xl border border-[#2C2F36] bg-[#1B1D22] p-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2C2F36] bg-[#131417] text-blue-400">
                  <FileCode2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-100">
                    {strategyName.replace(/\s+/g, "") || "ExpertAdvisor"}.mq5
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {(compileResult.code.length / 1024).toFixed(1)} KB · Expert
                    Advisor
                  </div>
                </div>
              </div>
              <div className="h-0.5 w-full rounded-full bg-emerald-500/80" />
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <Check className="h-3 w-3" />
                  Exported · full source included
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  MT5 Ready
                </span>
              </div>
            </div>

            <div className="px-1 space-y-1 text-[11px] text-slate-400">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Trading On Its Own
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Never miss an entry — runs 24/7 on MT5</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Works with any standard MT5 broker</span>
              </div>
            </div>
          </div>
        )}

        {/* Code Viewport */}
        <div className="flex-1 overflow-auto bg-[#07090E] p-3 font-mono text-[11.5px] leading-5">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="w-7 pr-3 text-right select-none text-[10px] text-slate-600 align-top">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre text-slate-200">
                    {highlightLine(line)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Diagnostics Footer */}
        <div className="border-t border-white/[0.07] bg-[#0B0E14] px-3.5 py-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="uppercase tracking-wider text-slate-500">
              Diagnostics
            </span>
            <span className="text-slate-400">
              {compileResult.eventCount} Events · {compileResult.actionCount} Actions
            </span>
          </div>

          {compileResult.warnings.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1.5 text-[11px] text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>Compiled cleanly. Ready to export.</span>
            </div>
          ) : (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {compileResult.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-2.5 py-1.5 text-[11px] text-amber-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
