import { Suspense } from "react";

import { CheckoutPanel } from "@/components/checkout-panel";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="surface loading-surface">
          <p>Loading checkout…</p>
        </div>
      }
    >
      <CheckoutPanel />
    </Suspense>
  );
}
