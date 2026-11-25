"use client";

import React, { memo, useState } from "react";
import {
  Handle,
  Position,
  useNodeConnections,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { AlertTriangle, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { NodeTypeIcon } from "@/components/icons/NodeIcons";
import { useNodeErrors } from "./DiagnosticsContext";
import { useActiveConnection } from "./WiringContext";
import {
  BlueprintNodeData,
  PIN_COLORS,
  PinDataType,
  PinDefinition,
} from "@/lib/blueprint/types";

function getSocketColor(type: PinDataType): string {
  switch (type) {
    case "exec":
      return "#E2E8F0";
    case "number":
      return "#22C55E";
    case "boolean":
      return "#EF4444";
    case "series":
      return "#3B82F6";
    case "string":
      return "#F59E0B";
  }
}

function PinHandle({
  pin,
  nodeId,
  compact = false,
}: {
  pin: PinDefinition;
  nodeId: string;
  compact?: boolean;
}) {
  const isInput = pin.direction === "input";
  const isExec = pin.type === "exec";
  const socketColor = getSocketColor(pin.type);
  const activeConn = useActiveConnection();

  const connections = useNodeConnections({
    id: nodeId,
    handleType: isInput ? "target" : "source",
    handleId: pin.id,
  });
  const isConnected = connections.length > 0;

  let compatibilityState: "idle" | "compatible" | "incompatible" = "idle";
  if (activeConn) {
    const isSelfOrigin =
      activeConn.nodeId === nodeId && activeConn.handleId === pin.id;
    if (!isSelfOrigin) {
      const isCompatible =
        activeConn.nodeId !== nodeId &&
        activeConn.direction !== pin.direction &&
        activeConn.pinType === pin.type;
      compatibilityState = isCompatible ? "compatible" : "incompatible";
    }
  }

  return (
    <div
      className={`relative flex items-center gap-1.5 transition-opacity duration-150 ${
        compact ? "h-0 overflow-visible" : "py-0.5"
      } ${
        isInput ? "justify-start pl-3 pr-1.5" : "justify-end pr-3 pl-1.5"
      } ${compatibilityState === "incompatible" ? "opacity-25" : "opacity-100"}`}
    >
      <Handle
        id={pin.id}
        type={isInput ? "target" : "source"}
        position={isInput ? Position.Left : Position.Right}
        className="!bg-transparent !border-0 !w-3.5 !h-3.5 flex items-center justify-center group"
        style={{
          [isInput ? "left" : "right"]: -7,
          top: "50%",
          transform: "translateY(-50%)",
        }}
        title={`${pin.label} (${PIN_COLORS[pin.type].label})`}
      >
        {isExec ? (
          <span
            className={`pointer-events-none block h-2.5 w-2.5 rounded-r-full rounded-l-[2px] border-[1.5px] transition-transform duration-150 group-hover:scale-125 ${
              compatibilityState === "compatible"
                ? "scale-125 ring-2 ring-blue-400/75"
                : ""
            }`}
            style={{
              borderColor: socketColor,
              backgroundColor: isConnected ? socketColor : "#1B1D22",
            }}
          />
        ) : (
          <span
            className={`pointer-events-none block h-2.5 w-2.5 rounded-full border-[1.5px] transition-all duration-150 group-hover:scale-125 ${
              compatibilityState === "compatible"
                ? "scale-125 ring-2 ring-blue-400/75"
                : ""
            }`}
            style={{
              borderColor: socketColor,
              backgroundColor: isConnected ? socketColor : "#1B1D22",
            }}
          />
        )}
      </Handle>

      {!compact && (
        <span className="text-[11px] text-slate-300 select-none">
          {pin.label}
        </span>
      )}
    </div>
  );
}

function BlueprintNodeComponent({
  id,
  data,
  selected,
}: NodeProps<Node<BlueprintNodeData>>) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const errors = useNodeErrors(id);
  const hasError = errors.length > 0;
  const viewMode = (data.viewMode as "detail" | "outline" | undefined) ?? "detail";

  const handleParamChange = (key: string, value: string | number) => {
    updateNodeData(id, {
      params: {
        ...data.params,
        [key]: value,
      },
    });
  };

  const maxRows = Math.max(data.inputs.length, data.outputs.length);

  return (
    <div
      className={`group/node relative transition-all duration-150 bg-[#1B1D22] border ${
        isCollapsed
          ? "min-w-[175px] max-w-[220px] rounded-full px-3 py-1.5"
          : "min-w-[235px] max-w-[275px] rounded-lg"
      } ${
        hasError
          ? "border-red-500/70 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          : selected
            ? "border-[#2563EB] ring-1 ring-[#2563EB]/60 shadow-[0_8px_28px_rgba(37,99,235,0.2)]"
            : "border-[#2C2F36] hover:border-[#3D414A] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      }`}
    >
      {/* Clean Matte Header */}
      <div
        className={`flex items-center justify-between gap-2 ${
          isCollapsed ? "" : "px-3 py-2 border-b border-[#26282E]"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <NodeTypeIcon
            definitionId={data.definitionId}
            className="h-3.5 w-3.5 text-slate-400 shrink-0"
          />
          <span className="truncate text-[12px] font-medium text-slate-200">
            {data.label}
          </span>
        </div>

        <div className="nodrag flex items-center gap-0.5 shrink-0">
          {hasError && (
            <div className="relative group/err">
              <div className="rounded p-0.5 text-red-400 hover:bg-red-500/15 cursor-help">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <div className="pointer-events-none opacity-0 group-hover/err:opacity-100 transition-opacity duration-150 absolute right-0 bottom-full mb-2 w-52 z-50 rounded-md border border-red-500/40 bg-[#141518] p-2 shadow-2xl">
                <div className="text-[10px] font-mono uppercase text-red-400 mb-1">
                  Fix Required
                </div>
                <ul className="space-y-1 text-[11px] text-red-200 leading-snug">
                  {errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed((v) => !v);
            }}
            title={isCollapsed ? "Expand node" : "Collapse node"}
            className="opacity-0 group-hover/node:opacity-100 rounded p-0.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 transition-all"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
            title="Delete node"
            className="opacity-0 group-hover/node:opacity-100 rounded p-0.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Collapsed Handles */}
      {isCollapsed ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between">
          <div>
            {data.inputs.map((inPin) => (
              <PinHandle key={inPin.id} pin={inPin} nodeId={id} compact />
            ))}
          </div>
          <div>
            {data.outputs.map((outPin) => (
              <PinHandle key={outPin.id} pin={outPin} nodeId={id} compact />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-2 space-y-1.5">
          {/* Pins Matrix */}
          {maxRows > 0 && (
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: maxRows }).map((_, idx) => {
                const inPin = data.inputs[idx];
                const outPin = data.outputs[idx];
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between min-h-[22px]"
                  >
                    <div className="flex-1">
                      {inPin && <PinHandle pin={inPin} nodeId={id} />}
                    </div>
                    <div className="flex-1 flex justify-end">
                      {outPin && <PinHandle pin={outPin} nodeId={id} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline Parameters (like screenshot) */}
          {viewMode === "detail" && data.paramFields.length > 0 && (
            <div className="nodrag px-3 space-y-1.5 pt-0.5">
              {data.paramFields.map((field) => {
                const val = data.params[field.key] ?? "";
                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
                      <span className="h-2 w-2 rounded-full border border-amber-500/80 inline-block" />
                      <span>{field.label}</span>
                    </label>

                    {field.type === "select" && field.options ? (
                      <select
                        value={String(val)}
                        onChange={(e) =>
                          handleParamChange(field.key, e.target.value)
                        }
                        className="w-28 rounded bg-[#141518] border border-[#2C2F36] focus:border-[#2563EB] focus:outline-none px-2 py-1 text-[11px] text-slate-200"
                      >
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1 rounded bg-[#141518] border border-[#2C2F36] focus-within:border-[#2563EB] px-2 py-1">
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          value={val}
                          step={field.step}
                          min={field.min}
                          max={field.max}
                          onChange={(e) =>
                            handleParamChange(
                              field.key,
                              field.type === "number"
                                ? Number(e.target.value)
                                : e.target.value
                            )
                          }
                          className="w-16 bg-transparent text-right text-[11px] font-mono tabular-nums text-slate-200 focus:outline-none"
                        />
                        {field.unit && (
                          <span className="text-[10px] text-slate-500">
                            {field.unit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const BlueprintNode = memo(BlueprintNodeComponent);
