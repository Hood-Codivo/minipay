"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  getActiveNetwork,
  getConfiguredRegistryAddress,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  getMiniPayAddCashUrl,
  getTokenByKey,
  isTransactionHash,
  isValidAddress,
  markRegistryInvoicePaid,
  readRegistryInvoice,
  sendStableTokenTransfer,
  verifyStableTokenTransfer,
} from "@/lib/celo";
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

interface CheckoutPanelProps {
  initialPayload: CheckoutLinkPayload | null;
  initialError?: string | null;
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

export function CheckoutPanel({
  initialPayload,
  initialError = null,
}: CheckoutPanelProps) {
  const wallet = useMiniPayWallet();
  const registryAddress = getConfiguredRegistryAddress();
  const activeNetwork = getActiveNetwork();
  const payload = initialPayload;

  const [invoice, setInvoice] = useState<LoadedInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"pay" | "settle" | null>(
    null,
  );
  const [manualPaymentTxHash, setManualPaymentTxHash] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      setLoading(false);
      setLoadError(initialError);
      setPaymentError(null);

      if (!payload) {
        setInvoice(null);
        if (!initialError) {
          setLoadError("This checkout link is missing its signed payload.");
        }
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
  }, [activeNetwork, initialError, payload, registryAddress]);

  useEffect(() => {
    setManualPaymentTxHash(invoice?.paymentTxHash ?? "");
  }, [invoice?.paymentTxHash]);

  const isMerchantWallet = Boolean(
    invoice &&
      wallet.address &&
      invoice.merchant.toLowerCase() === wallet.address.toLowerCase(),
  );

  const canPay = Boolean(
    invoice &&
      invoice.status === "open" &&
      !invoice.paymentTxHash &&
      wallet.isConnected &&
      wallet.isExpectedChain &&
      wallet.provider &&
      wallet.address &&
      wallet.address.toLowerCase() !== invoice.merchant.toLowerCase(),
  );

  const canRecordSettlement = Boolean(
    invoice &&
      invoice.mode === "registry" &&
      invoice.status === "open" &&
      isMerchantWallet &&
      wallet.provider &&
      wallet.isExpectedChain &&
      isTransactionHash(manualPaymentTxHash),
  );

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
      };

      upsertPaymentRecord(paymentRecord);

      updateStoredInvoice(invoice.key, (current) => ({
        ...current,
        status: invoice.mode === "local" ? "paid" : current.status,
        paymentTxHash: transfer.hash,
      }));

      setInvoice((current) =>
        current
          ? {
              ...current,
              paymentTxHash: transfer.hash,
              status: current.mode === "local" ? "paid" : current.status,
            }
          : current,
      );
      setManualPaymentTxHash(transfer.hash);

      if (invoice.mode === "registry") {
        setPaymentError(
          "Payment sent. The merchant must connect the receiving wallet and record this payment onchain.",
        );
        toast.warning(
          "Payment sent. Share the transfer hash with the merchant to finalize the registry receipt.",
        );
      } else {
        toast.success("Stablecoin payment sent.");
      }
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
      !wallet.provider ||
      !wallet.address
    ) {
      return;
    }

    if (!isMerchantWallet) {
      setPaymentError(
        "Only the merchant wallet that created this invoice can record the onchain receipt.",
      );
      return;
    }

    if (!isTransactionHash(manualPaymentTxHash)) {
      setPaymentError("Enter a valid payment transaction hash first.");
      return;
    }

    setPendingAction("settle");
    setPaymentError(null);

    try {
      const verifiedTransfer = await verifyStableTokenTransfer({
        hash: manualPaymentTxHash,
        merchant: invoice.merchant,
        tokenAddress: invoice.tokenAddress,
        tokenDecimals: invoice.decimals,
        amount: invoice.amount,
      });

      const settlement = await markRegistryInvoicePaid({
        provider: wallet.provider,
        account: wallet.address,
        invoiceId: invoice.registryInvoiceId,
        paymentTxHash: verifiedTransfer.hash,
      });

      upsertPaymentRecord({
        key: `${invoice.key}:${verifiedTransfer.hash}`,
        invoiceKey: invoice.key,
        mode: invoice.mode,
        chain: activeNetwork,
        tokenKey: invoice.tokenKey,
        amount: invoice.amount,
        merchant: invoice.merchant,
        payer: verifiedTransfer.payer,
        paidAt: new Date().toISOString(),
        paymentTxHash: verifiedTransfer.hash,
        settlementTxHash: settlement.hash,
      });

      updateStoredInvoice(invoice.key, (current) => ({
        ...current,
        status: "paid",
        paymentTxHash: verifiedTransfer.hash,
        settlementTxHash: settlement.hash,
      }));

      setInvoice((current) =>
        current
          ? {
              ...current,
              status: "paid",
              paymentTxHash: verifiedTransfer.hash,
              settlementTxHash: settlement.hash,
            }
          : current,
      );
      setManualPaymentTxHash(verifiedTransfer.hash);
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
        <p>Loading invoice details from Celo...</p>
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
            <p className="eyebrow">LinkRail Checkout</p>
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

          {invoice.mode === "registry" &&
          invoice.status === "open" &&
          invoice.paymentTxHash ? (
            <div className="warning-banner">
              <strong>
                {isMerchantWallet
                  ? "Merchant confirmation required."
                  : "Waiting on merchant confirmation."}
              </strong>
              <span>
                {isMerchantWallet
                  ? "Use the payment hash below to verify the transfer and finalize the registry receipt."
                  : "The stablecoin transfer has been sent. Only the merchant wallet can record the final onchain receipt now."}
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
                  ? invoice.mode === "registry" && invoice.status !== "paid"
                    ? "Payment sent"
                    : "Payment recorded"
                  : `Pay ${formatAmount(invoice.amount)} ${invoice.tokenKey}`}
              </span>
            </button>

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

          {invoice.mode === "registry" && invoice.status === "open" ? (
            <div className="keyline">
              <strong>Record onchain receipt</strong>
              <p>
                {isMerchantWallet
                  ? "Only the merchant wallet can finalize this registry invoice. Paste the payment transaction hash, verify it, and then write the receipt onchain."
                  : "After the customer pays, the merchant must connect the receiving wallet and record the payment transaction hash to close the invoice onchain."}
              </p>

              <div className="field">
                <label htmlFor="paymentTxHash">Payment transaction hash</label>
                <input
                  id="paymentTxHash"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={manualPaymentTxHash}
                  onChange={(event) => setManualPaymentTxHash(event.target.value)}
                  readOnly={!isMerchantWallet}
                  placeholder="0x..."
                />
              </div>

              {isMerchantWallet ? (
                <button
                  type="button"
                  className="button-secondary"
                  disabled={!canRecordSettlement || pendingAction !== null}
                  aria-busy={pendingAction === "settle" ? "true" : undefined}
                  onClick={() => void handleRecordSettlement()}
                >
                  {pendingAction === "settle" ? (
                    <LoaderCircle
                      size={18}
                      className="spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowRight size={18} aria-hidden="true" />
                  )}
                  <span>Record payment onchain</span>
                </button>
              ) : null}
            </div>
          ) : null}
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
