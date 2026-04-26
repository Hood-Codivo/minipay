"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  LoaderCircle,
  Network,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  createRegistryInvoice,
  getActiveNetwork,
  getAvailableTokens,
  getConfiguredRegistryAddress,
  getExplorerTxUrl,
  hashFreeform,
  isValidAddress,
  toUnixTimestamp,
} from "@/lib/celo";
import {
  buildCheckoutHref,
  buildCheckoutUrl,
  resolveAppOrigin,
} from "@/lib/checkout-codec";
import { formatAddress } from "@/lib/checkout-format";
import {
  createInvoiceKey,
  type LocalCheckoutPayload,
  type RegistryCheckoutPayload,
  type StoredInvoiceRecord,
  type TokenKey,
} from "@/lib/checkout-types";
import { upsertStoredInvoice } from "@/lib/checkout-storage";
import { useMiniPayWallet } from "@/hooks/use-minipay-wallet";

const expiryWindows = [
  { value: "0", label: "No expiry" },
  { value: "1", label: "24 hours" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
] as const;

type PendingAction = "link" | "publish" | null;

interface ShareResult {
  shareUrl: string;
  previewHref: string;
  mode: "local" | "registry";
  createTxHash?: string;
  registryInvoiceId?: number;
}

interface FieldErrors {
  merchantAddress?: string;
  amount?: string;
  title?: string;
}

function resolveExpiryIso(windowValue: string): string | null {
  const days = Number(windowValue);
  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}

async function copyToClipboard(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied.`);
}

export function CreateInvoiceForm() {
  const wallet = useMiniPayWallet();
  const tokens = useMemo(() => getAvailableTokens(), []);
  const registryAddress = getConfiguredRegistryAddress();
  const activeNetwork = getActiveNetwork();

  const [merchantAddress, setMerchantAddress] = useState("");
  const [selectedTokenKey, setSelectedTokenKey] = useState<TokenKey>(
    tokens[0]?.key ?? "USDm",
  );
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("MiniPay Checkout");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState(
    "Tap pay in MiniPay to complete this invoice in one step.",
  );
  const [expiryWindow, setExpiryWindow] = useState("7");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);

  const selectedToken =
    tokens.find((token) => token.key === selectedTokenKey) ?? tokens[0];
  const connectedMerchant = wallet.address ?? "";

  useEffect(() => {
    if (!merchantAddress && connectedMerchant) {
      setMerchantAddress(connectedMerchant);
    }
  }, [connectedMerchant, merchantAddress]);

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const nextMerchant = merchantAddress.trim() || connectedMerchant;

    if (!title.trim()) {
      nextErrors.title =
        "Add a short label so the customer knows what they are paying for.";
    }

    if (!nextMerchant) {
      nextErrors.merchantAddress =
        "Enter the receiving wallet or connect the merchant wallet.";
    } else if (!isValidAddress(nextMerchant)) {
      nextErrors.merchantAddress =
        "Merchant wallet must be a valid Celo address.";
    }

    const parsedAmount = Number(amount);
    if (!amount.trim()) {
      nextErrors.amount = "Amount is required.";
    } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = "Enter an amount greater than zero.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function createStoredRecord(
    shareUrl: string,
    mode: "local" | "registry",
    recordId: string | number,
    createTxHash?: string,
  ): StoredInvoiceRecord {
    return {
      key: createInvoiceKey(mode, recordId),
      mode,
      chain: activeNetwork,
      tokenKey: selectedToken.key,
      tokenAddress: selectedToken.address ?? "",
      amount,
      decimals: selectedToken.decimals,
      merchant:
        mode === "registry" && connectedMerchant
          ? connectedMerchant
          : merchantAddress.trim(),
      createdAt: new Date().toISOString(),
      expiresAt: resolveExpiryIso(expiryWindow),
      status: "open",
      shareUrl,
      localInvoiceId: mode === "local" ? String(recordId) : undefined,
      registryInvoiceId: mode === "registry" ? Number(recordId) : undefined,
      createTxHash,
      title: title.trim(),
      reference: reference.trim(),
      note: note.trim(),
    };
  }

  function buildLocalPayload(localInvoiceId: string): LocalCheckoutPayload {
    return {
      version: 1,
      mode: "local",
      localInvoiceId,
      chain: activeNetwork,
      merchant: merchantAddress.trim() || connectedMerchant,
      tokenKey: selectedToken.key,
      tokenAddress: selectedToken.address ?? "",
      amount: amount.trim(),
      decimals: selectedToken.decimals,
      createdAt: new Date().toISOString(),
      expiresAt: resolveExpiryIso(expiryWindow),
      title: title.trim(),
      reference: reference.trim(),
      note: note.trim(),
    };
  }

  async function handleGenerateLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setPendingAction("link");

    try {
      const invoiceId = crypto.randomUUID();
      const payload = buildLocalPayload(invoiceId);
      const origin = resolveAppOrigin();
      const shareUrl = buildCheckoutUrl(origin, payload);
      const previewHref = buildCheckoutHref(payload);

      upsertStoredInvoice(createStoredRecord(shareUrl, "local", invoiceId));
      setShareResult({
        shareUrl,
        previewHref,
        mode: "local",
      });

      toast.success("Checkout link generated.");
    } catch (caught) {
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "Could not generate the checkout link.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePublishOnchain() {
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!wallet.provider || !wallet.address) {
      setSubmitError("Connect a MiniPay or browser wallet to publish onchain.");
      return;
    }

    if (!wallet.isExpectedChain) {
      setSubmitError("Switch to the configured Celo network before publishing.");
      return;
    }

    if (!registryAddress) {
      setSubmitError(
        "Set NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS to enable registry publishing.",
      );
      return;
    }

    setPendingAction("publish");

    try {
      const expiresAt = resolveExpiryIso(expiryWindow);
      const invoiceMeta = {
        title: title.trim(),
        reference: reference.trim(),
        note: note.trim(),
      };
      const { hash, invoiceId } = await createRegistryInvoice({
        provider: wallet.provider,
        account: wallet.address,
        tokenAddress: selectedToken.address ?? "",
        tokenDecimals: selectedToken.decimals,
        amount: amount.trim(),
        expiresAtUnix: toUnixTimestamp(expiresAt),
        referenceHash: hashFreeform(
          invoiceMeta.reference || `${invoiceMeta.title}:${amount.trim()}`,
        ),
        metadataHash: hashFreeform(JSON.stringify(invoiceMeta)),
      });

      const payload: RegistryCheckoutPayload = {
        version: 1,
        mode: "registry",
        registryInvoiceId: invoiceId,
        chain: activeNetwork,
        tokenKey: selectedToken.key,
        createdAt: new Date().toISOString(),
        expiresAt,
        title: invoiceMeta.title,
        reference: invoiceMeta.reference,
        note: invoiceMeta.note,
      };

      const origin = resolveAppOrigin();
      const shareUrl = buildCheckoutUrl(origin, payload);
      const previewHref = buildCheckoutHref(payload);

      upsertStoredInvoice(
        createStoredRecord(shareUrl, "registry", invoiceId, hash),
      );

      setShareResult({
        shareUrl,
        previewHref,
        mode: "registry",
        createTxHash: hash,
        registryInvoiceId: invoiceId,
      });

      toast.success("Invoice published to the Celo registry.");
    } catch (caught) {
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "The invoice could not be published onchain.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const walletSummary =
    wallet.status === "ready"
      ? wallet.isMiniPay
        ? `MiniPay connected as ${wallet.shortAddress}`
        : `Browser wallet connected as ${wallet.shortAddress}`
      : wallet.status === "missing"
        ? "No injected wallet detected yet."
        : "Connect a wallet to publish invoices onchain.";

  return (
    <div className="surface stack-lg">
      <div className="surface-head">
        <div>
          <p className="eyebrow">Invoice Builder</p>
          <h2>Create a MiniPay checkout link in one pass</h2>
        </div>
        <div className="pill-row">
          <span className="status-pill open">{activeNetwork}</span>
          <span className="status-pill paid">
            {registryAddress ? "Registry configured" : "Link mode ready"}
          </span>
        </div>
      </div>

      <div className="info-strip">
        <div className="info-chip">
          <Wallet size={18} aria-hidden="true" />
          <span>{walletSummary}</span>
        </div>
        <div className="info-chip">
          <Network size={18} aria-hidden="true" />
          <span>
            Stablecoin gas on MiniPay uses {tokens[0]?.label ?? "USDm"} when
            available.
          </span>
        </div>
      </div>

      <form className="stack-lg" onSubmit={handleGenerateLink}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="merchantAddress">Merchant wallet</label>
            <input
              id="merchantAddress"
              type="text"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              value={merchantAddress}
              onChange={(event) => setMerchantAddress(event.target.value)}
              aria-invalid={fieldErrors.merchantAddress ? "true" : undefined}
              aria-describedby={
                fieldErrors.merchantAddress
                  ? "merchant-error"
                  : "merchant-help"
              }
              placeholder="0x..."
            />
            <p id="merchant-help" className="helper-text">
              This receives the stablecoin transfer. When you publish onchain,
              the connected wallet becomes the merchant automatically.
            </p>
            {fieldErrors.merchantAddress ? (
              <p id="merchant-error" className="error-text">
                {fieldErrors.merchantAddress}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="invoiceAmount">Amount</label>
            <input
              id="invoiceAmount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={fieldErrors.amount ? "true" : undefined}
              aria-describedby={
                fieldErrors.amount ? "amount-error" : "amount-help"
              }
              placeholder="25.00"
            />
            <p id="amount-help" className="helper-text">
              Use a simple amount like 25 or 25.50. Customers pay exactly this
              number of tokens.
            </p>
            {fieldErrors.amount ? (
              <p id="amount-error" className="error-text">
                {fieldErrors.amount}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="invoiceToken">Token</label>
            <select
              id="invoiceToken"
              value={selectedTokenKey}
              onChange={(event) => setSelectedTokenKey(event.target.value as TokenKey)}
            >
              {tokens.map((token) => (
                <option key={token.key} value={token.key}>
                  {token.label}
                </option>
              ))}
            </select>
            <p className="helper-text">{selectedToken?.helper}</p>
          </div>

          <div className="field">
            <label htmlFor="invoiceExpiry">Expires</label>
            <select
              id="invoiceExpiry"
              value={expiryWindow}
              onChange={(event) => setExpiryWindow(event.target.value)}
            >
              {expiryWindows.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="helper-text">
              Expiry is optional. Open invoices automatically become expired in
              the checkout view.
            </p>
          </div>

          <div className="field">
            <label htmlFor="invoiceTitle">Checkout label</label>
            <input
              id="invoiceTitle"
              type="text"
              autoComplete="off"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={fieldErrors.title ? "true" : undefined}
              aria-describedby={fieldErrors.title ? "title-error" : "title-help"}
              placeholder="April design sprint"
            />
            <p id="title-help" className="helper-text">
              This is the first thing the customer sees on the payment page.
            </p>
            {fieldErrors.title ? (
              <p id="title-error" className="error-text">
                {fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="invoiceReference">Reference</label>
            <input
              id="invoiceReference"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="INV-0426"
            />
            <p className="helper-text">
              Order numbers and invoice ids help the merchant reconcile payments
              later.
            </p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="invoiceNote">Customer note</label>
          <textarea
            id="invoiceNote"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
          />
          <p className="helper-text">
            Use this for delivery notes, wallet instructions, or a short
            thank-you.
          </p>
        </div>

        {submitError ? (
          <div className="error-banner" role="alert">
            <strong>Could not finish that step.</strong>
            <span>{submitError}</span>
          </div>
        ) : null}

        <div className="button-row">
          <button
            type="submit"
            className="button-primary"
            disabled={pendingAction !== null}
            aria-busy={pendingAction === "link" ? "true" : undefined}
          >
            {pendingAction === "link" ? (
              <LoaderCircle size={18} className="spin" aria-hidden="true" />
            ) : (
              <Sparkles size={18} aria-hidden="true" />
            )}
            <span>Generate checkout link</span>
          </button>

          <button
            type="button"
            className="button-secondary"
            disabled={pendingAction !== null || !registryAddress}
            aria-busy={pendingAction === "publish" ? "true" : undefined}
            onClick={() => void handlePublishOnchain()}
          >
            {pendingAction === "publish" ? (
              <LoaderCircle size={18} className="spin" aria-hidden="true" />
            ) : (
              <Network size={18} aria-hidden="true" />
            )}
            <span>Publish on Celo</span>
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
        </div>
      </form>

      {shareResult ? (
        <div className="result-card">
          <div className="surface-head">
            <div>
              <p className="eyebrow">Ready To Share</p>
              <h3>
                {shareResult.mode === "registry"
                  ? `Onchain invoice #${shareResult.registryInvoiceId}`
                  : "Offchain checkout link"}
              </h3>
            </div>
            <span className="status-pill paid">{selectedToken.label}</span>
          </div>

          <div className="copy-row">
            <code>{shareResult.shareUrl}</code>
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                void copyToClipboard(shareResult.shareUrl, "Checkout link")
              }
            >
              <Copy size={18} aria-hidden="true" />
              <span>Copy link</span>
            </button>
          </div>

          <div className="button-row">
            <a href={shareResult.previewHref} className="button-primary">
              <ArrowRight size={18} aria-hidden="true" />
              <span>Open checkout preview</span>
            </a>
            <button
              type="button"
              className="button-ghost"
              onClick={() =>
                void copyToClipboard(
                  merchantAddress || connectedMerchant,
                  "Merchant address",
                )
              }
            >
              <Wallet size={18} aria-hidden="true" />
              <span>
                Copy merchant{" "}
                {formatAddress(merchantAddress || connectedMerchant, 4)}
              </span>
            </button>
            {shareResult.createTxHash ? (
              <a
                href={getExplorerTxUrl(shareResult.createTxHash)}
                className="button-ghost"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={18} aria-hidden="true" />
                <span>View create tx</span>
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
