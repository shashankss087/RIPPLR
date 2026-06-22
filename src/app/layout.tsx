import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "RIPPLR Orchestrator",
  description:
    "Distribution-as-a-Service inventory orchestration for D2C & FMCG brands across Q-commerce, Modern Trade, General Trade and E-commerce.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar user={{ name: user.name, role: user.role, brandName: user.brandName }} />
            <main className="flex-1 overflow-x-hidden px-6 py-6 lg:px-10">{children}</main>
          </div>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}
