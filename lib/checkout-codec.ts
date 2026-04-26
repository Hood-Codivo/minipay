import { Buffer } from "buffer";

import type { CheckoutLinkPayload } from "@/lib/checkout-types";

export function encodeCheckoutPayload(payload: CheckoutLinkPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCheckoutPayload(
  encoded: string,
): CheckoutLinkPayload | null {
  try {
    const parsed = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(parsed) as CheckoutLinkPayload;
  } catch {
    return null;
  }
}

export function buildCheckoutHref(payload: CheckoutLinkPayload): string {
  return `/checkout?data=${encodeURIComponent(encodeCheckoutPayload(payload))}`;
}

export function buildCheckoutUrl(
  origin: string,
  payload: CheckoutLinkPayload,
): string {
  return `${origin}${buildCheckoutHref(payload)}`;
}

export function resolveAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
