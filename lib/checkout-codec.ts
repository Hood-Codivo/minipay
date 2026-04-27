import { Buffer } from "buffer";

import type {
  CheckoutLinkPayload,
  CheckoutNetwork,
  TokenKey,
} from "@/lib/checkout-types";

interface SignedCheckoutLocation {
  data: string;
  sig: string;
}

export function encodeCheckoutPayload(payload: CheckoutLinkPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTokenKey(value: unknown): value is TokenKey {
  return value === "USDm" || value === "USDC" || value === "USDT";
}

function isCheckoutNetwork(value: unknown): value is CheckoutNetwork {
  return value === "mainnet" || value === "sepolia";
}

function isOptionalIsoString(value: unknown): value is string | null {
  if (value === null) {
    return true;
  }

  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function hasSharedMeta(value: Record<string, unknown>): boolean {
  return (
    typeof value.title === "string" &&
    typeof value.reference === "string" &&
    typeof value.note === "string" &&
    value.version === 1 &&
    isCheckoutNetwork(value.chain) &&
    isTokenKey(value.tokenKey) &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    isOptionalIsoString(value.expiresAt)
  );
}

export function parseCheckoutPayload(
  value: unknown,
): CheckoutLinkPayload | null {
  if (!isRecord(value) || !hasSharedMeta(value)) {
    return null;
  }

  if (value.mode === "local") {
    if (
      typeof value.localInvoiceId !== "string" ||
      typeof value.merchant !== "string" ||
      typeof value.tokenAddress !== "string" ||
      typeof value.amount !== "string" ||
      typeof value.decimals !== "number"
    ) {
      return null;
    }

    return value as unknown as CheckoutLinkPayload;
  }

  if (value.mode === "registry") {
    if (typeof value.registryInvoiceId !== "number") {
      return null;
    }

    return value as unknown as CheckoutLinkPayload;
  }

  return null;
}

export function decodeCheckoutPayload(
  encoded: string,
): CheckoutLinkPayload | null {
  try {
    const parsed = Buffer.from(encoded, "base64url").toString("utf8");
    return parseCheckoutPayload(JSON.parse(parsed));
  } catch {
    return null;
  }
}

export function buildCheckoutHref({
  data,
  sig,
}: SignedCheckoutLocation): string {
  return `/checkout?data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}`;
}

export function buildCheckoutUrl(
  origin: string,
  location: SignedCheckoutLocation,
): string {
  return `${origin}${buildCheckoutHref(location)}`;
}

export function resolveAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
