import type { PaymentRecord, StoredInvoiceRecord } from "@/lib/checkout-types";

const INVOICES_KEY = "minipay-checkout:invoices";
const PAYMENTS_KEY = "minipay-checkout:payments";

function readCollection<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeCollection<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(items));
}

export function readStoredInvoices(): StoredInvoiceRecord[] {
  return readCollection<StoredInvoiceRecord>(INVOICES_KEY).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function upsertStoredInvoice(invoice: StoredInvoiceRecord): void {
  const next = readStoredInvoices().filter((item) => item.key !== invoice.key);
  next.unshift(invoice);
  writeCollection(INVOICES_KEY, next);
}

export function updateStoredInvoice(
  key: string,
  updater: (current: StoredInvoiceRecord) => StoredInvoiceRecord,
): void {
  const next = readStoredInvoices().map((item) =>
    item.key === key ? updater(item) : item,
  );
  writeCollection(INVOICES_KEY, next);
}

export function findStoredInvoice(key: string): StoredInvoiceRecord | null {
  return readStoredInvoices().find((item) => item.key === key) ?? null;
}

export function findRegistryInvoiceMeta(
  registryInvoiceId: number,
): StoredInvoiceRecord | null {
  return (
    readStoredInvoices().find(
      (item) => item.registryInvoiceId === registryInvoiceId,
    ) ?? null
  );
}

export function readPaymentRecords(): PaymentRecord[] {
  return readCollection<PaymentRecord>(PAYMENTS_KEY).sort((a, b) =>
    b.paidAt.localeCompare(a.paidAt),
  );
}

export function upsertPaymentRecord(payment: PaymentRecord): void {
  const next = readPaymentRecords().filter((item) => item.key !== payment.key);
  next.unshift(payment);
  writeCollection(PAYMENTS_KEY, next);
}
