import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentPay Gateway | AI-Native Commerce & Deterministic Policy Gate",
  description: "AI-native commerce gateway that makes merchants transactable by AI buyers with strict deterministic server-side financial gates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
