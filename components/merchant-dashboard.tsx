"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FolderOpen,
  LoaderCircle,
  Network,
  RefreshCw,
  Wallet,
} from "lucide-react";

import {
  getConfiguredRegistryAddress,
  getExplorerTxUrl,
  isValidAddress,
  readMerchantRegistryInvoices,
} from "@/lib/celo";
import {
  formatAddress,
  formatAmount,
  formatDateTime,
  statusLabel,
} from "@/lib/checkout-format";
import {
  createInvoiceKey,
  type RegistryInvoiceView,
  type StoredInvoiceRecord,
} from "@/lib/checkout-types";
import {
  findRegistryInvoiceMeta,
  readStoredInvoices,
} from "@/lib/checkout-storage";
import { useMiniPayWallet } from "@/hooks/use-minipay-wallet";

function getEffectiveStatus(
  record: StoredInvoiceRecord,
): StoredInvoiceRecord["status"] {
  if (
    record.status === "open" &&
    record.expiresAt &&
    new Date(record.expiresAt).getTime() < Date.now()
  ) {
    return "expired";
  }

  return record.status;
}

export function MerchantDashboard() {
  const wallet = useMiniPayWallet();
  const registryAddress = getConfiguredRegistryAddress();

  const [merchantFilter, setMerchantFilter] = useState("");
  const [localInvoices, setLocalInvoices] = useState<StoredInvoiceRecord[]>([]);
  const [registryInvoices, setRegistryInvoices] = useState<RegistryInvoiceView[]>(
    [],
  );
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshLocal = useCallback(() => {
    setLocalInvoices(readStoredInvoices());
  }, []);

  const refreshRegistry = useCallback(async () => {
    if (!registryAddress) {
      setRegistryInvoices([]);
      setLoadError(null);
      return;
    }

    if (!merchantFilter.trim()) {
      setRegistryInvoices([]);
      setLoadError(null);
      return;
    }

    if (!isValidAddress(merchantFilter.trim())) {
      setRegistryInvoices([]);
      setLoadError(
        "Enter a valid Celo merchant address to load onchain invoices.",
      );
      return;
    }

    setIsLoadingRegistry(true);
    setLoadError(null);

    try {
      const invoices = await readMerchantRegistryInvoices(merchantFilter.trim());
      setRegistryInvoices(invoices);
    } catch (caught) {
      setLoadError(
        caught instanceof Error
          ? caught.message
          : "Could not load the registry activity right now.",
      );
      setRegistryInvoices([]);
    } finally {
      setIsLoadingRegistry(false);
    }
  }, [merchantFilter, registryAddress]);

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    if (!merchantFilter && wallet.address) {
      setMerchantFilter(wallet.address);
    }
  }, [merchantFilter, wallet.address]);

  useEffect(() => {
    void refreshRegistry();
  }, [refreshRegistry]);

  const combinedInvoices = useMemo(() => {
    const filteredLocal = merchantFilter.trim()
      ? localInvoices.filter(
          (record) =>
            record.merchant.toLowerCase() === merchantFilter.trim().toLowerCase(),
        )
      : localInvoices;

    const registryRows = registryInvoices.map((invoice) => {
      const localMeta = findRegistryInvoiceMeta(invoice.invoiceId);

      return {
        key: createInvoiceKey("registry", invoice.invoiceId),
        mode: "registry" as const,
        chain: localMeta?.chain ?? "mainnet",
        tokenKey: invoice.tokenKey ?? localMeta?.tokenKey ?? "USDm",
        tokenAddress: invoice.tokenAddress,
        amount: invoice.amount,
        decimals: invoice.decimals,
        merchant: invoice.merchant,
        createdAt:
          invoice.createdAt ?? localMeta?.createdAt ?? new Date().toISOString(),
        expiresAt: invoice.expiresAt ?? localMeta?.expiresAt ?? null,
        status: invoice.status,
        shareUrl: localMeta?.shareUrl ?? "",
        registryInvoiceId: invoice.invoiceId,
        localInvoiceId: undefined,
        createTxHash: invoice.createTxHash ?? localMeta?.createTxHash,
        paymentTxHash: invoice.paymentTxHash ?? localMeta?.paymentTxHash,
        settlementTxHash: localMeta?.settlementTxHash,
        metadataHash: invoice.metadataHash,
        referenceHash: invoice.referenceHash,
        title: localMeta?.title ?? `Onchain invoice #${invoice.invoiceId}`,
        reference:
          localMeta?.reference ?? `Ref ${invoice.referenceHash.slice(0, 10)}`,
        note:
          localMeta?.note ??
          "Recovered from the onchain Celo registry without local metadata.",
      } satisfies StoredInvoiceRecord;
    });

    const merged = new Map<string, StoredInvoiceRecord>();

    [...filteredLocal, ...registryRows].forEach((record) => {
      merged.set(record.key, {
        ...record,
        status: getEffectiveStatus(record),
      });
    });

    return Array.from(merged.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }, [localInvoices, merchantFilter, registryInvoices]);

  const openInvoices = combinedInvoices.filter(
    (item) => item.status === "open",
  ).length;
  const paidInvoices = combinedInvoices.filter(
    (item) => item.status === "paid",
  ).length;
  const collectedAmount = combinedInvoices
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="stack-lg">
      <div className="surface">
        <div className="surface-head">
          <div>
            <p className="eyebrow">Merchant View</p>
            <h2>Track every checkout link you create</h2>
          </div>
          <div className="pill-row">
            <span className="status-pill open">
              {combinedInvoices.length} invoices
            </span>
            <span className="status-pill paid">{paidInvoices} paid</span>
          </div>
        </div>

        <div className="toolbar-row">
          <div className="field compact-field">
            <label htmlFor="merchantLookup">Merchant address</label>
            <input
              id="merchantLookup"
              type="text"
              spellCheck={false}
              value={merchantFilter}
              onChange={(event) => setMerchantFilter(event.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="button-row">
            {!wallet.isConnected ? (
              <button
                type="button"
                className="button-ghost"
                onClick={() => void wallet.connect()}
              >
                <Wallet size={18} aria-hidden="true" />
                <span>Connect wallet</span>
              </button>
            ) : null}

            {!wallet.isExpectedChain ? (
              <button
                type="button"
                className="button-ghost"
                onClick={() => void wallet.switchChain()}
              >
                <Network size={18} aria-hidden="true" />
                <span>Switch network</span>
              </button>
            ) : null}

            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                refreshLocal();
                void refreshRegistry();
              }}
            >
              {isLoadingRegistry ? (
                <LoaderCircle size={18} className="spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={18} aria-hidden="true" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {registryAddress ? (
          <p className="helper-text">
            Registry queries use the configured contract at{" "}
            <code>{registryAddress}</code>.
          </p>
        ) : (
          <div className="info-strip">
            <div className="info-chip">
              <FolderOpen size={18} aria-hidden="true" />
              <span>
                Offchain link tracking is active. Set a registry address to load
                invoices created onchain.
              </span>
            </div>
          </div>
        )}

        {loadError ? (
          <div className="error-banner" role="alert">
            <strong>Registry query needs attention.</strong>
            <span>{loadError}</span>
          </div>
        ) : null}
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <p className="eyebrow">Open</p>
          <strong>{openInvoices}</strong>
          <span>Still waiting for payment</span>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Paid</p>
          <strong>{paidInvoices}</strong>
          <span>Invoices with a captured receipt</span>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Collected</p>
          <strong>{formatAmount(String(collectedAmount || 0))}</strong>
          <span>Total stablecoin volume across paid invoices</span>
        </article>
      </div>

      <div className="surface">
        <div className="surface-head">
          <div>
            <p className="eyebrow">Invoice Log</p>
            <h2>Latest links and registry entries</h2>
          </div>
          <Link href="/create" className="button-primary">
            <span>Create another invoice</span>
          </Link>
        </div>

        {combinedInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FolderOpen size={22} aria-hidden="true" />
            </div>
            <div>
              <h3>No invoices yet</h3>
              <p>
                Create your first checkout link, then come back here to track
                payment status and registry receipts.
              </p>
            </div>
            <Link href="/create" className="button-secondary">
              <span>Open the invoice builder</span>
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Source</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {combinedInvoices.map((invoice) => (
                  <tr key={invoice.key}>
                    <td>
                      <div className="table-primary">
                        <strong>{invoice.title}</strong>
                        <span>{invoice.reference || "No reference"}</span>
                      </div>
                    </td>
                    <td>{invoice.mode === "registry" ? "Onchain" : "Link only"}</td>
                    <td>{formatAddress(invoice.merchant, 4)}</td>
                    <td>
                      {formatAmount(invoice.amount)} {invoice.tokenKey}
                    </td>
                    <td>
                      <span className={`status-pill ${invoice.status}`}>
                        {statusLabel(invoice.status)}
                      </span>
                    </td>
                    <td>{formatDateTime(invoice.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        {invoice.shareUrl ? (
                          <a
                            href={invoice.shareUrl.replace(/^https?:\/\/[^/]+/, "")}
                            className="inline-link"
                          >
                            Open
                          </a>
                        ) : null}
                        {invoice.createTxHash ? (
                          <a
                            href={getExplorerTxUrl(invoice.createTxHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-link"
                          >
                            Tx
                            <ExternalLink size={14} aria-hidden="true" />
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
