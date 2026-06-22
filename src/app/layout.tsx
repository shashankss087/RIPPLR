import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "RIPPLR Orchestrator",
  description:
    "Distribution-as-a-Service inventory orchestration for D2C & FMCG brands across Q-commerce, Modern Trade, General Trade and E-commerce.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden px-6 py-6 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
