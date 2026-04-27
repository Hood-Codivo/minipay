import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  buildCheckoutHref,
  buildCheckoutUrl,
  encodeCheckoutPayload,
} from "@/lib/checkout-codec";
import type { CheckoutLinkPayload } from "@/lib/checkout-types";

function getCheckoutSigningSecret(): string {
  const configured = process.env.CHECKOUT_SIGNING_SECRET?.trim();
  if (!configured) {
    throw new Error(
      "Set CHECKOUT_SIGNING_SECRET to generate and verify signed checkout links.",
    );
  }

  return configured;
}

export function hasCheckoutSigningSecret(): boolean {
  return Boolean(process.env.CHECKOUT_SIGNING_SECRET?.trim());
}

export function signEncodedCheckoutPayload(encoded: string): string {
  return createHmac("sha256", getCheckoutSigningSecret())
    .update(encoded)
    .digest("base64url");
}

export function verifyEncodedCheckoutPayload(
  encoded: string,
  signature: string,
): boolean {
  if (!hasCheckoutSigningSecret()) {
    return false;
  }

  const expected = Buffer.from(signEncodedCheckoutPayload(encoded));
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function buildSignedCheckoutLink(
  origin: string,
  payload: CheckoutLinkPayload,
) {
  const data = encodeCheckoutPayload(payload);
  const sig = signEncodedCheckoutPayload(data);

  return {
    data,
    sig,
    previewHref: buildCheckoutHref({ data, sig }),
    shareUrl: buildCheckoutUrl(origin, { data, sig }),
  };
}

export function buildSignedCheckoutHref(payload: CheckoutLinkPayload): string {
  const data = encodeCheckoutPayload(payload);
  const sig = signEncodedCheckoutPayload(data);
  return buildCheckoutHref({ data, sig });
}
