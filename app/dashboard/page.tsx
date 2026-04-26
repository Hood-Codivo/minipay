import { MerchantDashboard } from "@/components/merchant-dashboard";

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="page-banner">
        <div>
          <p className="eyebrow">Merchant Dashboard</p>
          <h1>Review created invoices, open links, and paid receipts</h1>
          <p className="banner-copy">
            This dashboard combines locally generated links with invoices pulled
            from the onchain Celo registry when a contract address is
            configured.
          </p>
        </div>
      </section>

      <MerchantDashboard />
    </div>
  );
}
