"use client";

import { createContext, useContext } from "react";

export type NodeErrorMap = Record<string, string[]>;

export const DiagnosticsContext = createContext<NodeErrorMap>({});

export function useNodeErrors(nodeId: string): string[] {
  const map = useContext(DiagnosticsContext);
  return map[nodeId] ?? [];
}
