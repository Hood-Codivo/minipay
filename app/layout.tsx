import type { Metadata } from "next";
import Script from "next/script";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkRail",
  description:
    "LinkRail is a MiniPay-ready stablecoin checkout for shareable payment links, direct Celo settlement, and lightweight onchain proof.",
  other: {
    "talentapp:project_verification":
      "353c0c8404b78500210833d26076cf51e790e7a12768e8aa959ea0d7fb2367bc96e607b17db9613a661c4021067a3b877b6425801b1a37a29d78e809a7ca8351",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stripInjectedHydrationAttributes = `
    (() => {
      const attributeName = "bis_skin_checked";
      const clean = (root = document) => {
        root.querySelectorAll?.("[" + attributeName + "]").forEach((element) => {
          element.removeAttribute(attributeName);
        });
      };

      clean();

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === attributeName
          ) {
            mutation.target.removeAttribute(attributeName);
          }

          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.removeAttribute?.(attributeName);
              clean(node);
            }
          }
        }
      });

      observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      window.addEventListener("load", () => observer.disconnect(), {
        once: true,
      });
    })();
  `;

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <Script
          id="strip-injected-hydration-attributes"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: stripInjectedHydrationAttributes }}
        />
      </head>
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
