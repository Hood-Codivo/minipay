"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  getActiveNetwork,
  getConfiguredRegistryAddress,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  getMiniPayAddCashUrl,
  getTokenByKey,
  isValidAddress,
  markRegistryInvoicePaid,
  readRegistryInvoice,
  sendStableTokenTransfer,
} from "@/lib/celo";
import { decodeCheckoutPayload } from "@/lib/checkout-codec";
import {
  formatAddress,
  formatAmount,
  formatDateTime,
  statusLabel,
} from "@/lib/checkout-format";
import {
  createInvoiceKey,
  type CheckoutLinkPayload,
  type InvoiceStatus,
  type PaymentRecord,
  type TokenKey,
} from "@/lib/checkout-types";
import {
  findRegistryInvoiceMeta,
  findStoredInvoice,
  upsertPaymentRecord,
  updateStoredInvoice,
} from "@/lib/checkout-storage";
import { useMiniPayWallet } from "@/hooks/use-minipay-wallet";

interface LoadedInvoice {
  key: string;
  mode: "local" | "registry";
  merchant: string;
  tokenKey: TokenKey;
  tokenAddress: string;
  decimals: number;
  amount: string;
  title: string;
  reference: string;
  note: string;
  expiresAt: string | null;
  status: InvoiceStatus;
  registryInvoiceId?: number;
  paymentTxHash?: string;
  settlementTxHash?: string;
}

function deriveLocalStatus(
  expiresAt: string | null,
  storedStatus: InvoiceStatus | undefined,
): InvoiceStatus {
  if (storedStatus) {
    return storedStatus;
  }

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return "expired";
  }

  return "open";
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied.`);
}

export function CheckoutPanel() {
  const searchParams = useSearchParams();
  const wallet = useMiniPayWallet();
  const registryAddress = getConfiguredRegistryAddress();
  const activeNetwork = getActiveNetwork();

  const payload = useMemo<CheckoutLinkPayload | null>(() => {
    const encoded = searchParams.get("data");
    return encoded ? decodeCheckoutPayload(encoded) : null;
  }, [searchParams]);

  const [invoice, setInvoice] = useState<LoadedInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"pay" | "settle" | null>(
    null,
  );
  const [settlementPending, setSettlementPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      setLoading(false);
      setLoadError(null);
      setPaymentError(null);
      setSettlementPending(false);

      if (!payload) {
        setInvoice(null);
        setLoadError("This checkout link is missing its encoded invoice payload.");
        return;
      }

      if (payload.chain !== activeNetwork) {
        setInvoice(null);
        setLoadError(
          `This link targets Celo ${payload.chain}, but the app is configured for ${activeNetwork}.`,
        );
        return;
      }

      if (payload.mode === "local") {
        const key = createInvoiceKey("local", payload.localInvoiceId);
        const stored = findStoredInvoice(key);

        setInvoice({
          key,
          mode: "local",
          merchant: payload.merchant,
          tokenKey: payload.tokenKey,
          tokenAddress: payload.tokenAddress,
          decimals: payload.decimals,
          amount: payload.amount,
          title: payload.title,
          reference: payload.reference,
          note: payload.note,
          expiresAt: payload.expiresAt,
          status: deriveLocalStatus(payload.expiresAt, stored?.status),
          paymentTxHash: stored?.paymentTxHash,
          settlementTxHash: stored?.settlementTxHash,
        });
        return;
      }

      if (!registryAddress) {
        setInvoice(null);
        setLoadError(
          "This link references an onchain invoice, but NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS is not configured.",
        );
        return;
      }

      setLoading(true);

      try {
        const onchain = await readRegistryInvoice(payload.registryInvoiceId);
        if (cancelled) {
          return;
        }

        const stored = findRegistryInvoiceMeta(payload.registryInvoiceId);
        const token =
          getTokenByKey(onchain.tokenKey ?? payload.tokenKey) ??
          getTokenByKey(payload.tokenKey);

        if (!token?.address && !onchain.tokenAddress) {
          throw new Error(
            "The token used for this invoice is not available in the current build.",
          );
        }

        setInvoice({
          key: createInvoiceKey("registry", payload.registryInvoiceId),
          mode: "registry",
          merchant: onchain.merchant,
          tokenKey: onchain.tokenKey ?? payload.tokenKey,
          tokenAddress: onchain.tokenAddress,
          decimals: onchain.decimals,
          amount: onchain.amount,
          title:
            payload.title ||
            stored?.title ||
            `Invoice #${payload.registryInvoiceId}`,
          reference: payload.reference || stored?.reference || "",
          note: payload.note || stored?.note || "",
          expiresAt: onchain.expiresAt ?? payload.expiresAt,
          status: onchain.status,
          registryInvoiceId: payload.registryInvoiceId,
          paymentTxHash: onchain.paymentTxHash ?? stored?.paymentTxHash,
          settlementTxHash: stored?.settlementTxHash,
        });
      } catch (caught) {
        if (!cancelled) {
          setLoadError(
            caught instanceof Error
              ? caught.message
              : "Could not load the registry invoice.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [activeNetwork, payload, registryAddress]);

  const canPay =
    invoice &&
    invoice.status === "open" &&
    !invoice.paymentTxHash &&
    wallet.isConnected &&
    wallet.isExpectedChain &&
    wallet.provider;

  async function handlePay() {
    if (!invoice || !wallet.provider || !wallet.address) {
      return;
    }

    if (!isValidAddress(invoice.merchant)) {
      setPaymentError("The merchant wallet on this invoice is invalid.");
      return;
    }

    if (wallet.address.toLowerCase() === invoice.merchant.toLowerCase()) {
      setPaymentError("Switch to a customer wallet before paying your own invoice.");
      return;
    }

    setPendingAction("pay");
    setPaymentError(null);

    try {
      const transfer = await sendStableTokenTransfer({
        provider: wallet.provider,
        account: wallet.address,
        merchant: invoice.merchant,
        tokenAddress: invoice.tokenAddress,
        tokenDecimals: invoice.decimals,
        amount: invoice.amount,
      });

      let settlementTxHash: string | undefined;

      if (invoice.mode === "registry" && invoice.registryInvoiceId) {
        try {
          const settlement = await markRegistryInvoicePaid({
            provider: wallet.provider,
            account: wallet.address,
            invoiceId: invoice.registryInvoiceId,
            paymentTxHash: transfer.hash,
          });
          settlementTxHash = settlement.hash;
          setSettlementPending(false);
          toast.success("Registry receipt recorded on Celo.");
        } catch (caught) {
          const message =
            caught instanceof Error
              ? caught.message
              : "Transfer succeeded, but the registry receipt still needs confirmation.";
          setSettlementPending(true);
          setPaymentError(message);
          toast.warning(
            "Transfer sent. Record the registry receipt to close the invoice.",
          );
        }
      }

      const paymentRecord: PaymentRecord = {
        key: `${invoice.key}:${transfer.hash}`,
        invoiceKey: invoice.key,
        mode: invoice.mode,
        chain: activeNetwork,
        tokenKey: invoice.tokenKey,
        amount: invoice.amount,
        merchant: invoice.merchant,
        payer: wallet.address,
        paidAt: new Date().toISOString(),
        paymentTxHash: transfer.hash,
        settlementTxHash,
      };

      upsertPaymentRecord(paymentRecord);

      updateStoredInvoice(invoice.key, (current) => ({
        ...current,
        status:
          invoice.mode === "local" || settlementTxHash ? "paid" : current.status,
        paymentTxHash: transfer.hash,
        settlementTxHash,
      }));

      setInvoice((current) =>
        current
          ? {
              ...current,
              paymentTxHash: transfer.hash,
              settlementTxHash,
              status:
                current.mode === "local" || settlementTxHash
                  ? "paid"
                  : current.status,
            }
          : current,
      );

      toast.success("Stablecoin payment sent.");
    } catch (caught) {
      setPaymentError(
        caught instanceof Error
          ? caught.message
          : "The payment did not complete.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRecordSettlement() {
    if (
      !invoice ||
      invoice.mode !== "registry" ||
      !invoice.registryInvoiceId ||
      !invoice.paymentTxHash ||
      !wallet.provider ||
      !wallet.address
    ) {
      return;
    }

    setPendingAction("settle");
    setPaymentError(null);

    try {
      const settlement = await markRegistryInvoicePaid({
        provider: wallet.provider,
        account: wallet.address,
        invoiceId: invoice.registryInvoiceId,
        paymentTxHash: invoice.paymentTxHash as `0x${string}`,
      });

      upsertPaymentRecord({
        key: `${invoice.key}:${invoice.paymentTxHash}`,
        invoiceKey: invoice.key,
        mode: invoice.mode,
        chain: activeNetwork,
        tokenKey: invoice.tokenKey,
        amount: invoice.amount,
        merchant: invoice.merchant,
        payer: wallet.address,
        paidAt: new Date().toISOString(),
        paymentTxHash: invoice.paymentTxHash,
        settlementTxHash: settlement.hash,
      });

      updateStoredInvoice(invoice.key, (current) => ({
        ...current,
        status: "paid",
        settlementTxHash: settlement.hash,
      }));

      setInvoice((current) =>
        current
          ? {
              ...current,
              status: "paid",
              settlementTxHash: settlement.hash,
            }
          : current,
      );
      setSettlementPending(false);
      toast.success("The registry receipt is now recorded.");
    } catch (caught) {
      setPaymentError(
        caught instanceof Error
          ? caught.message
          : "The registry receipt could not be recorded.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return (
      <div className="surface loading-surface">
        <LoaderCircle size={22} className="spin" aria-hidden="true" />
        <p>Loading invoice details from Celo…</p>
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div className="surface">
        <div className="empty-state">
          <div className="empty-icon">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <div>
            <h3>Checkout unavailable</h3>
            <p>{loadError ?? "We could not decode this payment link."}</p>
          </div>
          <Link href="/create" className="button-secondary">
            <span>Create a fresh invoice</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div className="surface hero-card">
        <div className="surface-head">
          <div>
            <p className="eyebrow">MiniPay Checkout</p>
            <h1>{invoice.title}</h1>
          </div>
          <div className="pill-row">
            <span className={`status-pill ${invoice.status}`}>
              {statusLabel(invoice.status)}
            </span>
            <span className="status-pill open">{invoice.tokenKey}</span>
          </div>
        </div>

        <p className="hero-text">
          Pay {formatAmount(invoice.amount)} {invoice.tokenKey} directly to the
          merchant wallet and keep the receipt on Celo.
        </p>

        <div className="detail-grid">
          <div className="detail-card">
            <span>Merchant</span>
            <strong>{formatAddress(invoice.merchant, 5)}</strong>
            <a
              href={getExplorerAddressUrl(invoice.merchant)}
              target="_blank"
              rel="noreferrer"
              className="inline-link"
            >
              Open address
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
          <div className="detail-card">
            <span>Reference</span>
            <strong>{invoice.reference || "No reference"}</strong>
            <small>
              {invoice.mode === "registry"
                ? "Backed by the Celo invoice registry."
                : "Direct wallet-to-wallet link."}
            </small>
          </div>
          <div className="detail-card">
            <span>Expires</span>
            <strong>{formatDateTime(invoice.expiresAt)}</strong>
            <small>
              Expired invoices stay visible but should not be paid again.
            </small>
          </div>
        </div>
      </div>

      <div className="surface-grid">
        <div className="surface">
          <div className="surface-head">
            <div>
              <p className="eyebrow">Payment</p>
              <h2>Complete the transfer in one tap</h2>
            </div>
            <button
              type="button"
              className="button-ghost"
              onClick={() => void copyText(invoice.merchant, "Merchant address")}
            >
              <Copy size={18} aria-hidden="true" />
              <span>Copy merchant</span>
            </button>
          </div>

          <div className="info-strip">
            <div className="info-chip">
              <Wallet size={18} aria-hidden="true" />
              <span>
                {wallet.isConnected
                  ? wallet.isMiniPay
                    ? `MiniPay connected as ${wallet.shortAddress}`
                    : `Browser wallet connected as ${wallet.shortAddress}`
                  : "Open this link in MiniPay or connect a browser wallet to pay."}
              </span>
            </div>
          </div>

          {!wallet.isExpectedChain ? (
            <div className="warning-banner">
              <strong>Wrong network.</strong>
              <span>
                Switch to the configured Celo chain before sending the transfer.
              </span>
            </div>
          ) : null}

          {paymentError ? (
            <div className="error-banner" role="alert">
              <strong>Payment needs attention.</strong>
              <span>{paymentError}</span>
            </div>
          ) : null}

          {invoice.note ? (
            <div className="keyline">
              <strong>Merchant note</strong>
              <p>{invoice.note}</p>
            </div>
          ) : null}

          <div className="button-row">
            <button
              type="button"
              className="button-primary"
              disabled={!canPay || pendingAction !== null}
              aria-busy={pendingAction === "pay" ? "true" : undefined}
              onClick={() => void handlePay()}
            >
              {pendingAction === "pay" ? (
                <LoaderCircle size={18} className="spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 size={18} aria-hidden="true" />
              )}
              <span>
                {invoice.paymentTxHash
                  ? "Payment recorded"
                  : `Pay ${formatAmount(invoice.amount)} ${invoice.tokenKey}`}
              </span>
            </button>

            {settlementPending ? (
              <button
                type="button"
                className="button-secondary"
                disabled={pendingAction !== null}
                aria-busy={pendingAction === "settle" ? "true" : undefined}
                onClick={() => void handleRecordSettlement()}
              >
                {pendingAction === "settle" ? (
                  <LoaderCircle size={18} className="spin" aria-hidden="true" />
                ) : (
                  <ArrowRight size={18} aria-hidden="true" />
                )}
                <span>Record payment onchain</span>
              </button>
            ) : null}

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
                <ArrowRight size={18} aria-hidden="true" />
                <span>Switch network</span>
              </button>
            ) : null}

            <a
              href={getMiniPayAddCashUrl()}
              className="button-ghost"
              target="_blank"
              rel="noreferrer"
            >
              <span>Add cash in MiniPay</span>
            </a>
          </div>
        </div>

        <div className="surface">
          <div className="surface-head">
            <div>
              <p className="eyebrow">Proof</p>
              <h2>Receipts and follow-up</h2>
            </div>
          </div>

          <div className="stack-md">
            <div className="detail-row">
              <span>Mode</span>
              <strong>
                {invoice.mode === "registry"
                  ? "Onchain registry invoice"
                  : "Direct checkout link"}
              </strong>
            </div>
            <div className="detail-row">
              <span>Status</span>
              <strong>{statusLabel(invoice.status)}</strong>
            </div>
            {invoice.paymentTxHash ? (
              <div className="detail-row">
                <span>Payment tx</span>
                <a
                  href={getExplorerTxUrl(invoice.paymentTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-link"
                >
                  {formatAddress(invoice.paymentTxHash, 6)}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            ) : null}
            {invoice.settlementTxHash ? (
              <div className="detail-row">
                <span>Registry receipt</span>
                <a
                  href={getExplorerTxUrl(invoice.settlementTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-link"
                >
                  {formatAddress(invoice.settlementTxHash, 6)}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            ) : null}
            {invoice.mode === "registry" && invoice.registryInvoiceId ? (
              <div className="detail-row">
                <span>Invoice id</span>
                <strong>#{invoice.registryInvoiceId}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
