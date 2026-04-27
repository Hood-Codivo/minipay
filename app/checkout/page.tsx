import { CheckoutPanel } from "@/components/checkout-panel";
import { decodeCheckoutPayload } from "@/lib/checkout-codec";
import { verifyEncodedCheckoutPayload } from "@/lib/checkout-signing";

interface CheckoutPageProps {
  searchParams: Promise<{
    data?: string | string[];
    sig?: string | string[];
  }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams;
  const data = Array.isArray(params.data) ? params.data[0] : params.data;
  const sig = Array.isArray(params.sig) ? params.sig[0] : params.sig;

  let initialPayload = null;
  let initialError: string | null = null;

  if (!data || !sig) {
    initialError = "This checkout link is missing its signed payload.";
  } else if (!verifyEncodedCheckoutPayload(data, sig)) {
    initialError = "This checkout link is invalid or has been modified.";
  } else {
    initialPayload = decodeCheckoutPayload(data);
    if (!initialPayload) {
      initialError = "This checkout link could not be decoded.";
    }
  }

  return (
    <CheckoutPanel initialError={initialError} initialPayload={initialPayload} />
  );
}
