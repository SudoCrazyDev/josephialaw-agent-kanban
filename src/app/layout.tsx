import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Kanban",
  description: "Orchestration board for Claude Managed Agents"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
