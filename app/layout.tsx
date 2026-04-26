import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniPay Checkout",
  description:
    "Share MiniPay-friendly checkout links, publish invoices on Celo, and accept stablecoin payments in one tap.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
