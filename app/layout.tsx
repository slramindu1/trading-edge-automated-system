import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradingEdge Blueprint — Visual Strategy Builder",
  description:
    "Dark-mode Unreal Engine Blueprint-inspired visual algorithmic trading strategy builder.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="h-full w-full flex flex-col bg-[#131417] text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}
