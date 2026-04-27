import { getActiveNetwork, getConfiguredRegistryAddress } from "@/lib/celo";

export default function RegistryPage() {
  const activeNetwork = getActiveNetwork();
  const registryAddress = getConfiguredRegistryAddress();

  return (
    <div className="page-stack">
      <section className="page-banner">
        <div>
          <p className="eyebrow">Deploy On Celo</p>
          <h1>Publish invoices to a lightweight Celo registry contract</h1>
          <p className="banner-copy">
            The contract stores invoice metadata hashes, amounts, merchant
            addresses, expiries, and settlement references. Customers still pay
            the merchant directly in stablecoins.
          </p>
        </div>
        <div className="banner-badges">
          <span
            className={`status-pill ${registryAddress ? "paid" : "expired"}`}
          >
            {registryAddress
              ? "Registry configured"
              : "Registry address missing"}
          </span>
          <span className="status-pill open">{activeNetwork}</span>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <p className="eyebrow">Why It Exists</p>
          <h2>Link generation stays fast while onchain state stays auditable</h2>
          <p>
            The product can generate link-only invoices instantly, but merchants
            who want stronger proof can also create a registry invoice on Celo
            and share that checkout instead.
          </p>
        </article>
        <article className="feature-card">
          <p className="eyebrow">Contract Methods</p>
          <h2>Create, confirm as merchant, or cancel</h2>
          <p>
            The registry supports <code>createInvoice</code>,{" "}
            <code>markInvoicePaid</code>, and <code>cancelInvoice</code>. The
            checkout UI sends the payment transfer first, then the merchant
            wallet records the settlement hash.
          </p>
        </article>
        <article className="feature-card">
          <p className="eyebrow">Current Mode</p>
          <h2>{registryAddress ? "Submission-ready" : "Waiting for deployment"}</h2>
          <p>
            {registryAddress
              ? `The frontend is configured to read and write the registry at ${registryAddress}.`
              : "Set NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS after deployment and the publish flow will go live immediately."}
          </p>
        </article>
      </section>

      <section className="surface stack-lg">
        <div className="surface-head">
          <div>
            <p className="eyebrow">Ship Checklist</p>
            <h2>What to run before you submit</h2>
          </div>
        </div>

        <div className="detail-list">
          <div className="detail-row">
            <span>1. Compile</span>
            <strong>
              <code>npm run compile:celo-contract</code>
            </strong>
          </div>
          <div className="detail-row">
            <span>2. Deploy</span>
            <strong>
              <code>npm run deploy:celo-contract</code>
            </strong>
          </div>
          <div className="detail-row">
            <span>3. Configure</span>
            <strong>
              Add the deployed address to{" "}
              <code>NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS</code>
            </strong>
          </div>
          <div className="detail-row">
            <span>4. Test</span>
            <strong>
              Open the app inside MiniPay and complete one invoice end to end
            </strong>
          </div>
        </div>

        <div className="keyline">
          <strong>MVP trust assumption</strong>
          <p>
            The registry records invoice and settlement references, but it does
            not verify token transfers at the contract level. Merchant-only
            settlement prevents third parties from forging invoice state, while
            keeping checkout friction low enough for a real Celo mainnet MVP.
          </p>
        </div>
      </section>
    </div>
  );
}
