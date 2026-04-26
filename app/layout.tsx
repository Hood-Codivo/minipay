import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkRail",
  description:
    "LinkRail is a MiniPay-ready stablecoin checkout for shareable payment links, direct Celo settlement, and lightweight onchain proof.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning className="app-body">
        <Providers>
          <div className="app-frame">
            <div className="ambient ambient-a" />
            <div className="ambient ambient-b" />
            <div className="ambient ambient-c" />
            <SiteHeader />
            <main className="page-shell">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
