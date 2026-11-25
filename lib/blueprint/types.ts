export type NodeCategory = "events" | "indicators" | "conditions" | "actions";

export type PinDataType = "exec" | "number" | "boolean" | "string" | "series";

export interface PinDefinition {
  id: string;
  label: string;
  type: PinDataType;
  direction: "input" | "output";
}

export interface ParamField {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  options?: string[];
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}

export interface BlueprintNodeDefinition {
  id: string;
  label: string;
  subtitle: string;
  category: NodeCategory;
  description: string;
  defaultParams: Record<string, string | number>;
  paramFields: ParamField[];
  inputs: PinDefinition[];
  outputs: PinDefinition[];
}

export interface BlueprintNodeData extends Record<string, unknown> {
  definitionId: string;
  label: string;
  subtitle: string;
  category: NodeCategory;
  params: Record<string, string | number>;
  paramFields: ParamField[];
  inputs: PinDefinition[];
  outputs: PinDefinition[];
}

export const PIN_COLORS: Record<
  PinDataType,
  { color: string; glow: string; label: string; badgeClass: string }
> = {
  exec: {
    color: "#F8FAFC",
    glow: "rgba(248, 250, 252, 0.55)",
    label: "Exec",
    badgeClass: "text-slate-100 border-slate-400/40 bg-slate-200/10",
  },
  number: {
    color: "#10B981",
    glow: "rgba(16, 185, 129, 0.55)",
    label: "Float",
    badgeClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  boolean: {
    color: "#F43F5E",
    glow: "rgba(244, 63, 94, 0.55)",
    label: "Bool",
    badgeClass: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
  string: {
    color: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.55)",
    label: "String",
    badgeClass: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  series: {
    color: "#3B82F6",
    glow: "rgba(59, 130, 246, 0.6)",
    label: "Series",
    badgeClass: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
};

export const CATEGORY_THEME: Record<
  NodeCategory,
  {
    label: string;
    accentHex: string;
    headerGradient: string;
    borderHover: string;
    badge: string;
    dot: string;
  }
> = {
  events: {
    label: "Events",
    accentHex: "#EF4444",
    headerGradient: "from-red-600/35 via-red-900/20 to-transparent",
    borderHover: "hover:border-red-500/50",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    dot: "bg-red-500",
  },
  indicators: {
    label: "Indicators",
    accentHex: "#3B82F6",
    headerGradient: "from-blue-600/35 via-blue-900/20 to-transparent",
    borderHover: "hover:border-blue-500/50",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    dot: "bg-blue-500",
  },
  conditions: {
    label: "Conditions",
    accentHex: "#8B5CF6",
    headerGradient: "from-violet-600/35 via-violet-900/20 to-transparent",
    borderHover: "hover:border-violet-500/50",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    dot: "bg-violet-500",
  },
  actions: {
    label: "Actions",
    accentHex: "#10B981",
    headerGradient: "from-emerald-600/35 via-emerald-900/20 to-transparent",
    borderHover: "hover:border-emerald-500/50",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
};
