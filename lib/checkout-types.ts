export type CheckoutNetwork = "mainnet" | "sepolia";

export type TokenKey = "USDm" | "USDC" | "USDT";

export type InvoiceStatus = "open" | "paid" | "cancelled" | "expired";

export interface TokenDescriptor {
  key: TokenKey;
  label: string;
  address: string | null;
  decimals: number;
  helper: string;
  supportsFeeCurrency: boolean;
}

export interface InvoiceDisplayMeta {
  title: string;
  reference: string;
  note: string;
}

export interface LocalCheckoutPayload extends InvoiceDisplayMeta {
  version: 1;
  mode: "local";
  localInvoiceId: string;
  chain: CheckoutNetwork;
  merchant: string;
  tokenKey: TokenKey;
  tokenAddress: string;
  amount: string;
  decimals: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface RegistryCheckoutPayload extends InvoiceDisplayMeta {
  version: 1;
  mode: "registry";
  registryInvoiceId: number;
  chain: CheckoutNetwork;
  tokenKey: TokenKey;
  createdAt: string;
  expiresAt: string | null;
}

export type CheckoutLinkPayload =
  | LocalCheckoutPayload
  | RegistryCheckoutPayload;

export interface StoredInvoiceRecord extends InvoiceDisplayMeta {
  key: string;
  mode: "local" | "registry";
  chain: CheckoutNetwork;
  tokenKey: TokenKey;
  tokenAddress: string;
  amount: string;
  decimals: number;
  merchant: string;
  createdAt: string;
  expiresAt: string | null;
  status: InvoiceStatus;
  shareUrl: string;
  localInvoiceId?: string;
  registryInvoiceId?: number;
  createTxHash?: string;
  paymentTxHash?: string;
  settlementTxHash?: string;
  metadataHash?: string;
  referenceHash?: string;
}

export interface PaymentRecord {
  key: string;
  invoiceKey: string;
  mode: "local" | "registry";
  chain: CheckoutNetwork;
  tokenKey: TokenKey;
  amount: string;
  merchant: string;
  payer: string;
  paidAt: string;
  paymentTxHash: string;
  settlementTxHash?: string;
}

export interface RegistryInvoiceView {
  invoiceId: number;
  merchant: string;
  tokenAddress: string;
  tokenKey: TokenKey | null;
  amount: string;
  decimals: number;
  expiresAt: string | null;
  createdAt: string | null;
  status: InvoiceStatus;
  paymentTxHash?: string;
  referenceHash: string;
  metadataHash: string;
  createTxHash?: string;
}

export function createInvoiceKey(
  mode: "local" | "registry",
  id: string | number,
): string {
  return `${mode}:${id}`;
}
