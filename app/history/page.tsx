import { ActivityFeed } from "@/components/activity-feed";

export default function HistoryPage() {
  return (
    <div className="page-stack">
      <section className="page-banner">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Keep a visible receipt log for demos and submissions</h1>
          <p className="banner-copy">
            Each completed checkout stores its transfer hash locally, and
            registry receipts show up beside the payment when they are recorded
            onchain.
          </p>
        </div>
      </section>

      <ActivityFeed />
    </div>
  );
}
