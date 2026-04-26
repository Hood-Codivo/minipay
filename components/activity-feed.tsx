"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Receipt, RefreshCw } from "lucide-react";

import { getExplorerTxUrl } from "@/lib/celo";
import {
  formatAddress,
  formatAmount,
  formatDateTime,
} from "@/lib/checkout-format";
import type { PaymentRecord } from "@/lib/checkout-types";
import { readPaymentRecords } from "@/lib/checkout-storage";

export function ActivityFeed() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    setPayments(readPaymentRecords());
  }, []);

  const settledPayments = payments.filter(
    (payment) => payment.settlementTxHash,
  ).length;
  const volume = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  return (
    <div className="stack-lg">
      <div className="metric-grid">
        <article className="metric-card">
          <p className="eyebrow">Payments</p>
          <strong>{payments.length}</strong>
          <span>Transfers this browser has recorded</span>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Settled</p>
          <strong>{settledPayments}</strong>
          <span>Payments that also wrote a registry receipt</span>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Volume</p>
          <strong>{formatAmount(String(volume || 0))}</strong>
          <span>Stablecoin amount processed across saved receipts</span>
        </article>
      </div>

      <div className="surface">
        <div className="surface-head">
          <div>
            <p className="eyebrow">Receipt Log</p>
            <h2>Every payment the checkout flow has captured locally</h2>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setPayments(readPaymentRecords())}
          >
            <RefreshCw size={18} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Receipt size={22} aria-hidden="true" />
            </div>
            <div>
              <h3>No payment receipts yet</h3>
              <p>
                Complete a checkout from the preview page and the payment hash
                will appear here with its explorer link.
              </p>
            </div>
            <Link href="/create" className="button-secondary">
              <span>Create a test invoice</span>
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Merchant</th>
                  <th>Payer</th>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.key}>
                    <td>
                      {formatAmount(payment.amount)} {payment.tokenKey}
                    </td>
                    <td>{formatAddress(payment.merchant, 4)}</td>
                    <td>{formatAddress(payment.payer, 4)}</td>
                    <td>{formatDateTime(payment.paidAt)}</td>
                    <td>
                      {payment.mode === "registry"
                        ? "Registry invoice"
                        : "Link invoice"}
                    </td>
                    <td>
                      <div className="table-actions">
                        <a
                          href={getExplorerTxUrl(payment.paymentTxHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-link"
                        >
                          Payment
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                        {payment.settlementTxHash ? (
                          <a
                            href={getExplorerTxUrl(payment.settlementTxHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-link"
                          >
                            Receipt
                            <CheckCircle2 size={14} aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
