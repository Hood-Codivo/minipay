import { NextResponse } from "next/server";

import { parseCheckoutPayload } from "@/lib/checkout-codec";
import {
  buildSignedCheckoutLink,
  hasCheckoutSigningSecret,
} from "@/lib/checkout-signing";

export async function POST(request: Request) {
  if (!hasCheckoutSigningSecret()) {
    return NextResponse.json(
      {
        error:
          "Set CHECKOUT_SIGNING_SECRET before generating signed checkout links.",
      },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Checkout payload must be valid JSON." },
      { status: 400 },
    );
  }

  const payload = parseCheckoutPayload(body);
  if (!payload) {
    return NextResponse.json(
      { error: "Checkout payload is missing required fields." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json(buildSignedCheckoutLink(origin, payload));
}
