import { CreateInvoiceForm } from "@/components/create-invoice-form";

export default function CreatePage() {
  return (
    <div className="page-stack">
      <section className="page-banner">
        <div>
          <p className="eyebrow">Build For MiniPay</p>
          <h1>Create a checkout link that works inside MiniPay</h1>
          <p className="banner-copy">
            Start with a shareable link, then optionally publish the same
            invoice to the Celo registry for a stronger submission story.
          </p>
        </div>
      </section>

      <CreateInvoiceForm />
    </div>
  );
}
