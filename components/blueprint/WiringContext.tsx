"use client";

import React, { createContext, useContext } from "react";
import { PinDataType } from "@/lib/blueprint/types";

export interface ActiveConnection {
  nodeId: string;
  handleId: string;
  direction: "input" | "output";
  pinType: PinDataType;
}

export const WiringContext = createContext<ActiveConnection | null>(null);

export function useActiveConnection() {
  return useContext(WiringContext);
}
