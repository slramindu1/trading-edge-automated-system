"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { SavedStrategy } from "@/lib/blueprint/storage";

interface StrategySwitcherProps {
  strategies: SavedStrategy[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreateBlank: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
}

export function StrategySwitcher({
  strategies,
  activeId,
  onSelect,
  onCreateBlank,
  onDuplicate,
  onDelete,
  onExportJson,
  onImportJson,
}: StrategySwitcherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return strategies;
    return strategies.filter((s) => s.name.toLowerCase().includes(q));
  }, [strategies, query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          open
            ? "bg-[#24262C] text-slate-100"
            : "text-slate-400 hover:bg-[#222429] hover:text-slate-200"
        }`}
      >
        <span>Strategies</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-500 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportJson(file);
            e.target.value = "";
            setOpen(false);
          }
        }}
      />

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 z-50 rounded-xl border border-[#2C2F36] bg-[#18191D] shadow-[0_20px_50px_rgba(0,0,0,0.75)] overflow-hidden">
          {/* Search + New Strategy Row */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#24262C]">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find strategy..."
                className="w-full rounded-md bg-[#131417] border border-[#26282E] pl-6 pr-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onCreateBlank();
                setOpen(false);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[#2C2F36] bg-[#22242A] hover:bg-[#2A2D35] px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors shrink-0"
            >
              <Plus className="h-3 w-3 text-slate-300" />
              <span>New</span>
            </button>
          </div>

          {/* Saved Strategies List */}
          <div className="p-1.5">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Workspace ({filtered.length})
            </div>

            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filtered.length === 0 ? (
                <div className="px-2 py-4 text-center text-[11px] text-slate-500">
                  No matching strategies
                </div>
              ) : (
                filtered.map((s) => {
                  const isActive = s.id === activeId;
                  return (
                    <div
                      key={s.id}
                      className={`group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        isActive
                          ? "bg-[#23262E] text-slate-100"
                          : "text-slate-300 hover:bg-[#1E2027]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(s.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <span
                          className={`h-3.5 w-1 rounded-full shrink-0 transition-colors ${
                            isActive ? "bg-[#3B82F6]" : "bg-transparent"
                          }`}
                        />
                        <span className="truncate text-[12px] font-medium">
                          {s.name}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[10px] text-slate-500 group-hover:hidden">
                          {s.nodes.length}n · {s.edges.length}w
                        </span>

                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(s.id);
                            }}
                            title="Duplicate"
                            className="rounded p-1 text-slate-400 hover:bg-[#2C2F38] hover:text-slate-100"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {strategies.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(s.id);
                              }}
                              title="Delete"
                              className="rounded p-1 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Clean Footer Menu Actions */}
          <div className="border-t border-[#24262C] bg-[#15161A] p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onExportJson();
                setOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-[#22242A] hover:text-white transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-slate-400" />
                <span>Export Blueprint</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">.json</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-[#22242A] hover:text-white transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <Upload className="h-3.5 w-3.5 text-slate-400" />
                <span>Import Blueprint</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">.json</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
