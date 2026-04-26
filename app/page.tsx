import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Link2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";

import { buildCheckoutHref } from "@/lib/checkout-codec";
import { getActiveNetwork, getTokenByKey } from "@/lib/celo";
import type { LocalCheckoutPayload } from "@/lib/checkout-types";

const usdTokenAddress = getTokenByKey("USDm")?.address ?? "";
const activeNetwork = getActiveNetwork();

const demoPayload: LocalCheckoutPayload = {
  version: 1,
  mode: "local",
  localInvoiceId: "demo-checkout",
  chain: activeNetwork,
  merchant: "0x1111111111111111111111111111111111111111",
  tokenKey: "USDm",
  tokenAddress: usdTokenAddress,
  amount: "18",
  decimals: 18,
  createdAt: "2026-04-26T00:00:00.000Z",
  expiresAt: "2026-05-03T00:00:00.000Z",
  title: "Demo merchant invoice",
  reference: "CELO-POS-001",
  note: "Open this inside MiniPay to try the one-tap transfer flow.",
};

const heroSignals = [
  {
    icon: Smartphone,
    title: "Wallet-native pay flow",
    body: "Open the link in MiniPay and go straight into a stablecoin transfer instead of a generic web checkout.",
  },
  {
    icon: Coins,
    title: "Three stablecoin rails",
    body: "Support USDm, USDC, and USDT with the exact amount embedded in every checkout link.",
  },
  {
    icon: ShieldCheck,
    title: "Optional registry proof",
    body: "Publish the invoice to Celo when you want a cleaner audit trail for demos, submissions, or ops handoff.",
  },
];

const operatingPoints = [
  {
    icon: ReceiptText,
    label: "Merchant builder",
    body: "Create a shareable invoice, add references, and decide whether to keep it link-only or publish onchain.",
  },
  {
    icon: Wallet,
    label: "Customer checkout",
    body: "Let the payer complete a direct wallet-to-wallet stablecoin transfer in a flow designed for MiniPay.",
  },
  {
    icon: BadgeCheck,
    label: "Receipt capture",
    body: "Track payment hashes locally, then attach a settlement reference when you record the outcome on Celo.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Create the invoice surface",
    body: "Define amount, token, title, expiry, and a merchant note in a single mobile-first form.",
  },
  {
    step: "02",
    title: "Send the customer into MiniPay",
    body: "Share the checkout link directly, or preview it in-browser for desktop demos before you ship.",
  },
  {
    step: "03",
    title: "Close the loop with proof",
    body: "Save the payment receipt locally and optionally mirror the settlement path in the Celo registry.",
  },
];

export default function LandingPage() {
  const demoHref = buildCheckoutHref(demoPayload);

  return (
    <div className="page-stack">
      <section className="hero-shell">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-badge-row">
              <span className="hero-badge">MiniPay compatible</span>
              <span className="hero-badge">Celo stablecoins</span>
              <span className="hero-badge">Merchant-ready flow</span>
            </div>
            <p className="eyebrow">MiniPay Commerce Layer</p>
            <h1>Accept stablecoin payments with a checkout flow built for MiniPay.</h1>
            <p className="hero-text">
              Turn a merchant invoice into a polished mobile checkout page,
              direct wallet transfer, and optional onchain proof layer without
              slowing the payment path down.
            </p>

            <div className="hero-actions">
              <Link href="/create" className="button-primary">
                <Link2 size={18} aria-hidden="true" />
                <span>Create a checkout link</span>
              </Link>
              <a href={demoHref} className="button-secondary">
                <Smartphone size={18} aria-hidden="true" />
                <span>Open demo checkout</span>
              </a>
              <Link href="/dashboard" className="button-ghost">
                <ArrowRight size={18} aria-hidden="true" />
                <span>View merchant dashboard</span>
              </Link>
            </div>

            <div className="hero-features">
              {heroSignals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <article key={signal.title} className="hero-feature-card">
                    <div className="hero-feature-icon">
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div className="stack-sm">
                      <strong>{signal.title}</strong>
                      <p>{signal.body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-preview-shell">
              <div className="hero-preview-head">
                <div>
                  <p className="eyebrow">Checkout preview</p>
                  <h2>One invoice, two proof modes, zero backend dependency.</h2>
                </div>
                <span className="status-pill open">{activeNetwork}</span>
              </div>

              <div className="preview-ledger">
                <div className="preview-ledger-main">
                  <div className="preview-chip-row">
                    <span className="preview-chip">Ready to share</span>
                    <span className="preview-chip preview-chip-quiet">
                      MiniPay transfer
                    </span>
                  </div>
                  <p className="eyebrow">Demo invoice</p>
                  <strong>April design sprint</strong>
                  <div className="preview-amount-row">
                    <span>18.00 USDm</span>
                    <span>CELO-POS-001</span>
                  </div>
                  <div className="preview-progress" aria-hidden="true">
                    <span />
                  </div>
                  <div className="preview-detail-list">
                    <div>
                      <span>Merchant</span>
                      <strong>0x1111...1111</strong>
                    </div>
                    <div>
                      <span>Settlement</span>
                      <strong>Direct pay, optional registry receipt</strong>
                    </div>
                  </div>
                </div>

                <div className="preview-ledger-side">
                  <article className="preview-side-card">
                    <p className="eyebrow">Link mode</p>
                    <strong>Generate instantly</strong>
                    <span>Preview the checkout before it ever touches Celo.</span>
                  </article>
                  <article className="preview-side-card accent">
                    <p className="eyebrow">Registry mode</p>
                    <strong>Publish for proof</strong>
                    <span>Attach invoice metadata and settlement references onchain.</span>
                  </article>
                </div>
              </div>

              <div className="preview-stat-grid">
                <article className="preview-stat">
                  <span>3 rails</span>
                  <strong>USDm, USDC, USDT</strong>
                </article>
                <article className="preview-stat">
                  <span>1 flow</span>
                  <strong>Create, pay, record</strong>
                </article>
                <article className="preview-stat">
                  <span>2 modes</span>
                  <strong>Link-only or onchain</strong>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Product Story</p>
            <h2>Design the merchant flow around trust, speed, and visible handoff.</h2>
          </div>
          <Link href="/registry" className="button-ghost">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>See the registry path</span>
          </Link>
        </div>

        <div className="story-grid">
          <article className="story-card story-card-primary">
            <div className="story-copy">
              <p className="eyebrow">Builder surface</p>
              <h3>Shape the invoice before you ever send the customer into a wallet.</h3>
              <p>
                The create flow is structured around the exact fields a merchant
                needs for a calm payment handoff: amount, token, expiry,
                invoice label, and a reference that survives reconciliation.
              </p>
            </div>
            <div className="story-panel">
              <div className="story-panel-row">
                <span>Amount</span>
                <strong>25.00 USDm</strong>
              </div>
              <div className="story-panel-row">
                <span>Checkout label</span>
                <strong>April sprint retainer</strong>
              </div>
              <div className="story-panel-row">
                <span>Destination</span>
                <strong>Merchant wallet ready</strong>
              </div>
              <div className="story-panel-row">
                <span>Output</span>
                <strong>Shareable MiniPay checkout</strong>
              </div>
            </div>
          </article>

          <article className="story-card">
            <div className="story-copy">
              <p className="eyebrow">Payment surface</p>
              <h3>Keep the checkout compact enough for MiniPay, not a desktop cart.</h3>
              <p>
                The pay screen centers the essentials: amount, merchant,
                reference, expiry, and the direct transfer action without
                burying the customer in extra settings.
              </p>
            </div>
            <div className="mini-list">
              <div>
                <span>Wallet state</span>
                <strong>Disconnected, connecting, connected</strong>
              </div>
              <div>
                <span>Primary action</span>
                <strong>Pay exact stablecoin amount</strong>
              </div>
              <div>
                <span>Fallback</span>
                <strong>Browser wallet for desktop demos</strong>
              </div>
            </div>
          </article>

          <article className="story-card">
            <div className="story-copy">
              <p className="eyebrow">Proof surface</p>
              <h3>Give operators a clean receipt trail after the transfer lands.</h3>
              <p>
                Dashboard and activity views keep the link, payment hash, and
                registry settlement path visible so the product feels shippable,
                not just hackathon-deep.
              </p>
            </div>
            <div className="mini-list">
              <div>
                <span>Receipt log</span>
                <strong>Captured payment hashes</strong>
              </div>
              <div>
                <span>Registry support</span>
                <strong>Optional invoice publishing</strong>
              </div>
              <div>
                <span>Merchant ops</span>
                <strong>Status, amount, source, explorer links</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Core Value</p>
            <h2>Everything the merchant needs, with none of the checkout clutter.</h2>
          </div>
        </div>

        <div className="value-grid">
          {operatingPoints.map((point) => {
            const Icon = point.icon;

            return (
              <article key={point.label} className="value-card">
                <div className="value-icon">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div className="stack-sm">
                  <strong>{point.label}</strong>
                  <p>{point.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>Three steps to a complete MiniPay merchant loop.</h2>
          </div>
        </div>

        <div className="steps-grid">
          {workflow.map((item) => (
            <article key={item.step} className="step-card">
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-copy">
          <p className="eyebrow">Start Shipping</p>
          <h2>Launch the merchant builder, then open the checkout inside MiniPay.</h2>
          <p>
            This pass keeps the existing payment logic intact while bringing the
            product shell closer to the premium fintech direction from the
            Axora reference.
          </p>
        </div>
        <div className="final-cta-actions">
          <Link href="/create" className="button-primary">
            <Link2 size={18} aria-hidden="true" />
            <span>Build your first invoice</span>
          </Link>
          <a href={demoHref} className="button-secondary">
            <Smartphone size={18} aria-hidden="true" />
            <span>Try the payment preview</span>
          </a>
        </div>
      </section>
    </div>
  );
}
