"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { NodeTypeIcon } from "@/components/icons/NodeIcons";
import { NODE_CATALOG } from "@/lib/blueprint/catalog";
import { CATEGORY_THEME, NodeCategory } from "@/lib/blueprint/types";

interface QuickAddPaletteProps {
  position: { x: number; y: number };
  onSelect: (definitionId: string) => void;
  onClose: () => void;
}

function getCategoryTint(category: NodeCategory): string {
  switch (category) {
    case "events":
      return "text-rose-400 bg-rose-500/10";
    case "indicators":
      return "text-cyan-400 bg-cyan-500/10";
    case "conditions":
      return "text-violet-400 bg-violet-500/10";
    case "actions":
      return "text-emerald-400 bg-emerald-500/10";
  }
}

export function QuickAddPalette({
  position,
  onSelect,
  onClose,
}: QuickAddPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NODE_CATALOG;
    return NODE_CATALOG.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.subtitle.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const safeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filtered.length > 0 ? (prev + 1) % filtered.length : 0
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filtered.length > 0
          ? (prev - 1 + filtered.length) % filtered.length
          : 0
      );
      return;
    }
    if (e.key === "Enter" && filtered[safeIndex]) {
      e.preventDefault();
      onSelect(filtered[safeIndex].id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          left: Math.max(16, Math.min(position.x, window.innerWidth - 336)),
          top: Math.max(60, Math.min(position.y, window.innerHeight - 360)),
        }}
        className="fixed w-[320px] rounded-2xl bg-[#0D1117]/95 backdrop-blur-xl border border-white/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.07]">
          <Search className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Insert node... (↑↓ Enter)"
            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="font-mono text-[9px] text-slate-500 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="max-h-[280px] overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              No matching nodes found
            </div>
          ) : (
            filtered.map((node, idx) => {
              const isActive = idx === safeIndex;
              return (
                <button
                  key={node.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => onSelect(node.id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    isActive
                      ? "bg-[#3B82F6]/20 text-white"
                      : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${getCategoryTint(
                        node.category
                      )}`}
                    >
                      <NodeTypeIcon
                        definitionId={node.id}
                        className="h-3.5 w-3.5"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">
                        {node.label}
                      </div>
                      <div className="truncate text-[10px] text-slate-500">
                        {CATEGORY_THEME[node.category].label} · {node.subtitle}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <CornerDownLeft className="h-3 w-3 text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
