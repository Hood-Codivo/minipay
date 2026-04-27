import { LandingHeroSection } from "@/components/landing-hero-section";
import { LandingSocialProofSection } from "@/components/landing-social-proof-section";
import {
  buildSignedCheckoutHref,
  hasCheckoutSigningSecret,
} from "@/lib/checkout-signing";
import { getActiveNetwork, getTokenByKey } from "@/lib/celo";
import type { LocalCheckoutPayload } from "@/lib/checkout-types";

const usdTokenAddress = getTokenByKey("USDm")?.address ?? "";

const demoPayload: LocalCheckoutPayload = {
  version: 1,
  mode: "local",
  localInvoiceId: "linkrail-demo-checkout",
  chain: getActiveNetwork(),
  merchant: "0x1111111111111111111111111111111111111111",
  tokenKey: "USDm",
  tokenAddress: usdTokenAddress,
  amount: "18",
  decimals: 18,
  createdAt: "2026-04-26T00:00:00.000Z",
  expiresAt: "2026-05-03T00:00:00.000Z",
  title: "LinkRail demo invoice",
  reference: "LINKRAIL-001",
  note: "Open this inside MiniPay to preview the LinkRail payment flow.",
};

export default function LandingPage() {
  const demoHref = hasCheckoutSigningSecret()
    ? buildSignedCheckoutHref(demoPayload)
    : "/create";

  return (
    <div className="landing-page">
      <LandingHeroSection demoHref={demoHref} />
      <LandingSocialProofSection />
    </div>
  );
}
