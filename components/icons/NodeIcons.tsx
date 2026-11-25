import React from "react";

interface IconProps {
  className?: string;
}

export function BrandMarkIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 11.5L6.5 6.5L9.5 9L13 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 3.5H13V6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="3" cy="11.5" r="1.25" fill="currentColor" />
      <circle cx="9.5" cy="9" r="1.25" fill="currentColor" />
    </svg>
  );
}

export function OnCandleCloseIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M6 2.5V4.5M6 11.5V13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="4.5"
        width="4"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M11.5 2.5V13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
      <path
        d="M9.5 11.5H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OnPriceTickIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M1.5 8H4L5.5 4.5L7.5 11.5L9.5 6L11 8H14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13.5" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}

export function OnOrderFillIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.25 8.25L7.25 10.25L11 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MovingAverageIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2 12C4.5 11.5 6 7 8.5 6C10.5 5.2 12.2 4 14 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 10C4.8 10.5 6.8 9.2 9 8.2C11 7.3 12.5 7 14 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
    </svg>
  );
}

export function RsiIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2 4H14M2 12H14"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.4"
        strokeDasharray="2 2"
      />
      <path
        d="M2 9.5L4.5 5.5L7.5 10.5L10.5 4.5L14 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MacdIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3 10V13M6 8V13M9 6V13M12 9V13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <path
        d="M2.5 7.5C5 5.5 7.5 3.5 10 4.5C11.8 5.2 12.8 4 14 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BollingerBandsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2 4.5C5 2.5 10.5 5.5 14 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <path
        d="M2 8C5.5 6.5 10 9.5 14 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 11.5C5 10.5 10.5 13.5 14 12.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
    </svg>
  );
}

export function AtrIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M8 2.5V13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5.5 5L8 2.5L10.5 5M5.5 11L8 13.5L10.5 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8H13"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
    </svg>
  );
}

export function CrossoverIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2.5 12.5L13.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2.5 5.5L13.5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <circle cx="8" cy="8" r="1.75" fill="currentColor" />
    </svg>
  );
}

export function TimeFilterIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M8 2.5A5.5 5.5 0 0 1 13.5 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8 5V8L10.25 9.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThresholdIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2 8H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2.5 2.5"
      />
      <path
        d="M3 12.5C5.5 12.5 6.5 4 10 4C11.5 4 12.5 5.5 13.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CompareIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3.5 5.5L6.5 3.5V12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 10.5L9.5 12.5V3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

export function LogicGateIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2 5.5H5M2 10.5H5M12 8H14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 3.5H8.5C10.5 3.5 12 5.5 12 8C12 10.5 10.5 12.5 8.5 12.5H5V3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BranchIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="3.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 8H7.5C8.5 8 9 7 9.5 6L10.5 4.5H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 8C8.5 8 9 9 9.5 10L10.5 11.5H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

export function MarketBuyIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3.5 10.5L8 6L12.5 10.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 12.5L8 10L10.5 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
      <path
        d="M4 3.5H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MarketSellIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3.5 5.5L8 10L12.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 3.5L8 6L10.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
      <path
        d="M4 12.5H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RiskTargetIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.5V3.5M8 12.5V14.5M1.5 8H3.5M12.5 8H14.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClosePositionIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.75 5.75L10.25 10.25M10.25 5.75L5.75 10.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NodeTypeIcon({
  definitionId,
  className = "h-4 w-4",
}: {
  definitionId: string;
  className?: string;
}) {
  switch (definitionId) {
    case "on-candle-close":
      return <OnCandleCloseIcon className={className} />;
    case "on-tick":
      return <OnPriceTickIcon className={className} />;
    case "on-order-fill":
      return <OnOrderFillIcon className={className} />;
    case "sma":
    case "ema":
      return <MovingAverageIcon className={className} />;
    case "rsi":
      return <RsiIcon className={className} />;
    case "macd":
      return <MacdIcon className={className} />;
    case "bollinger":
      return <BollingerBandsIcon className={className} />;
    case "atr":
      return <AtrIcon className={className} />;
    case "crossover":
      return <CrossoverIcon className={className} />;
    case "time-filter":
      return <TimeFilterIcon className={className} />;
    case "threshold":
      return <ThresholdIcon className={className} />;
    case "compare":
      return <CompareIcon className={className} />;
    case "logic-gate":
      return <LogicGateIcon className={className} />;
    case "branch":
      return <BranchIcon className={className} />;
    case "market-buy":
      return <MarketBuyIcon className={className} />;
    case "market-sell":
      return <MarketSellIcon className={className} />;
    case "set-stop-loss":
    case "set-take-profit":
      return <RiskTargetIcon className={className} />;
    case "close-position":
      return <ClosePositionIcon className={className} />;
    default:
      return <MovingAverageIcon className={className} />;
  }
}
