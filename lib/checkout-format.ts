import type { InvoiceStatus } from "@/lib/checkout-types";

const compactAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const currencyLikeFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatAmount(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return compactAmountFormatter.format(numeric);
}

export function formatMoneyLike(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return currencyLikeFormatter.format(numeric);
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "No expiry";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return dateTimeFormatter.format(date);
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) {
    return "Unknown";
  }

  if (address.length <= chars * 2 + 2) {
    return address;
  }

  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function statusLabel(status: InvoiceStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}
