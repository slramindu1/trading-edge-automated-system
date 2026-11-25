import type { Edge, Node, Viewport } from "@xyflow/react";
import { STRATEGY_PRESETS } from "./presets";
import { BlueprintNodeData } from "./types";

export interface SavedStrategy {
  id: string;
  name: string;
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
  viewport: Viewport;
  updatedAt: number;
}

const STRATEGIES_KEY = "trading-edge-strategies-v1";
const ACTIVE_ID_KEY = "trading-edge-active-strategy-v1";

export function createDefaultStrategy(): SavedStrategy {
  const preset = STRATEGY_PRESETS[0];
  return {
    id: "strat-default",
    name: preset.name,
    nodes: preset.nodes,
    edges: preset.edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    updatedAt: 0,
  };
}

export function createBlankStrategy(index = 1): SavedStrategy {
  return {
    id: `strat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    name: `Untitled Strategy ${index}`,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    updatedAt: Date.now(),
  };
}

export function loadWorkspace(): {
  strategies: SavedStrategy[];
  activeId: string;
} {
  if (typeof window === "undefined") {
    const def = createDefaultStrategy();
    return { strategies: [def], activeId: def.id };
  }

  try {
    const raw = window.localStorage.getItem(STRATEGIES_KEY);
    const savedActive = window.localStorage.getItem(ACTIVE_ID_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedStrategy[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeExists = parsed.some((s) => s.id === savedActive);
        return {
          strategies: parsed,
          activeId: activeExists && savedActive ? savedActive : parsed[0].id,
        };
      }
    }
  } catch {
    // Fallback to default strategy if localStorage is corrupted
  }

  const def = createDefaultStrategy();
  return { strategies: [def], activeId: def.id };
}

export function saveWorkspace(
  strategies: SavedStrategy[],
  activeId: string
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
    window.localStorage.setItem(ACTIVE_ID_KEY, activeId);
  } catch {
    // Ignore quota exceeded errors
  }
}

export interface BlueprintExportPayload {
  version: number;
  name: string;
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
  viewport?: Viewport;
}

export function exportBlueprintJson(strategy: {
  name: string;
  nodes: Node<BlueprintNodeData>[];
  edges: Edge[];
  viewport: Viewport;
}): void {
  const payload: BlueprintExportPayload = {
    version: 1,
    name: strategy.name,
    nodes: strategy.nodes,
    edges: strategy.edges,
    viewport: strategy.viewport,
  };
  const slug =
    strategy.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "blueprint";
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.blueprint.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBlueprintJson(rawText: string): SavedStrategy {
  const parsed = JSON.parse(rawText) as Partial<BlueprintExportPayload>;
  if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error(
      "Invalid Blueprint JSON: expected 'nodes' and 'edges' arrays."
    );
  }
  return {
    id: `strat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    name: typeof parsed.name === "string" && parsed.name.trim()
      ? parsed.name.trim()
      : "Imported Blueprint",
    nodes: parsed.nodes,
    edges: parsed.edges,
    viewport: parsed.viewport ?? { x: 0, y: 0, zoom: 1 },
    updatedAt: Date.now(),
  };
}
