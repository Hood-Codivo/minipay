import {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  numberToHex,
  parseAbiItem,
  parseUnits,
  stringToBytes,
  type Hex,
} from "viem";
import { celo, celoSepolia } from "viem/chains";

import type {
  CheckoutNetwork,
  InvoiceStatus,
  RegistryInvoiceView,
  TokenDescriptor,
  TokenKey,
} from "@/lib/checkout-types";

export interface InjectedProvider {
  isMiniPay?: boolean;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ACTIVE_NETWORK: CheckoutNetwork =
  process.env.NEXT_PUBLIC_CELO_NETWORK === "sepolia" ? "sepolia" : "mainnet";

const ACTIVE_CHAIN = ACTIVE_NETWORK === "sepolia" ? celoSepolia : celo;

const TOKEN_CATALOG: Record<CheckoutNetwork, TokenDescriptor[]> = {
  mainnet: [
    {
      key: "USDm",
      label: "USDm",
      address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      decimals: 18,
      helper: "Best gas experience inside MiniPay.",
      supportsFeeCurrency: true,
    },
    {
      key: "USDC",
      label: "USDC",
      address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      decimals: 6,
      helper: "Widely used on Celo mainnet.",
      supportsFeeCurrency: false,
    },
    {
      key: "USDT",
      label: "USDT",
      address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
      decimals: 6,
      helper: "Good fallback for merchant payments.",
      supportsFeeCurrency: false,
    },
  ],
  sepolia: [
    {
      key: "USDm",
      label: "USDm",
      address: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
      decimals: 18,
      helper: "MiniPay gas abstraction works with USDm.",
      supportsFeeCurrency: true,
    },
    {
      key: "USDC",
      label: "USDC",
      address: null,
      decimals: 6,
      helper: "USDC is not listed on Celo Sepolia in the current docs.",
      supportsFeeCurrency: false,
    },
    {
      key: "USDT",
      label: "USDT",
      address: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
      decimals: 6,
      helper: "Available for end-to-end checkout testing.",
      supportsFeeCurrency: false,
    },
  ],
};

export const CHECKOUT_REGISTRY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "createInvoice",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiresAt", type: "uint64" },
      { name: "referenceHash", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "invoiceId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "markInvoicePaid",
    inputs: [
      { name: "invoiceId", type: "uint256" },
      { name: "paymentTxHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "cancelInvoice",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "invoices",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "merchant", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiresAt", type: "uint64" },
      { name: "referenceHash", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
      { name: "status", type: "uint8" },
      { name: "paymentTxHash", type: "bytes32" },
      { name: "createdAt", type: "uint64" },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const createdEvent = parseAbiItem(
  "event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed token, uint256 amount, uint64 expiresAt, bytes32 referenceHash, bytes32 metadataHash)",
);
const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

let publicClient: any = null;

function getPublicRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_CELO_RPC_URL ??
    ACTIVE_CHAIN.rpcUrls.default.http[0] ??
    "https://forno.celo.org"
  );
}

export function getActiveNetwork(): CheckoutNetwork {
  return ACTIVE_NETWORK;
}

export function getActiveChain() {
  return ACTIVE_CHAIN;
}

export function getConfiguredRegistryAddress(): string | null {
  const configured = process.env.NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS;
  if (!configured || !isAddress(configured)) {
    return null;
  }

  return getAddress(configured);
}

export function getTokenCatalog(): TokenDescriptor[] {
  return TOKEN_CATALOG[ACTIVE_NETWORK];
}

export function getAvailableTokens(): TokenDescriptor[] {
  return getTokenCatalog().filter((token) => Boolean(token.address));
}

export function getTokenByKey(key: TokenKey): TokenDescriptor | null {
  return getTokenCatalog().find((token) => token.key === key) ?? null;
}

export function getTokenByAddress(address: string): TokenDescriptor | null {
  return (
    getTokenCatalog().find(
      (token) =>
        token.address && token.address.toLowerCase() === address.toLowerCase(),
    ) ?? null
  );
}

export function isValidAddress(value: string): boolean {
  return isAddress(value);
}

export function isTransactionHash(value: string): value is Hex {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

export function hashFreeform(value: string): Hex {
  return keccak256(stringToBytes(value.trim() || "blank"));
}

export function getExplorerTxUrl(hash: string): string {
  return `${ACTIVE_CHAIN.blockExplorers?.default.url}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${ACTIVE_CHAIN.blockExplorers?.default.url}/address/${address}`;
}

export function getMiniPayAddCashUrl(): string {
  return "https://minipay.opera.com/add_cash";
}

export function getPublicClient() {
  if (publicClient) {
    return publicClient;
  }

  publicClient = createPublicClient({
    chain: ACTIVE_CHAIN,
    transport: http(getPublicRpcUrl()),
  });

  return publicClient;
}

function getPreferredFeeCurrency(provider: InjectedProvider): string | undefined {
  if (!provider.isMiniPay) {
    return undefined;
  }

  return getTokenByKey("USDm")?.address ?? undefined;
}

async function getLegacyGasEnvelope(
  provider: InjectedProvider,
  tx: {
    from: string;
    to: string;
    data: Hex;
    value?: Hex;
  },
): Promise<Record<string, string>> {
  const publicRpc = getPublicClient();
  const feeCurrency = getPreferredFeeCurrency(provider);

  const gas = (await publicRpc.request({
    method: "eth_estimateGas",
    params: [
      {
        ...tx,
        ...(tx.value ? { value: tx.value } : {}),
        ...(feeCurrency ? { feeCurrency } : {}),
      },
    ],
  })) as Hex;

  const gasPrice = (await publicRpc.request({
    method: "eth_gasPrice",
    params: feeCurrency ? [feeCurrency] : [],
  })) as Hex;

  return {
    gas,
    gasPrice,
    ...(feeCurrency ? { feeCurrency } : {}),
  };
}

async function sendInjectedTransaction(
  provider: InjectedProvider,
  tx: {
    from: string;
    to: string;
    data: Hex;
    value?: Hex;
  },
) {
  const publicRpc = getPublicClient();
  const gasEnvelope = await getLegacyGasEnvelope(provider, tx);

  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        ...tx,
        ...gasEnvelope,
        ...(tx.value ? { value: tx.value } : {}),
      },
    ],
  })) as Hex;

  const receipt = await publicRpc.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function sendStableTokenTransfer(params: {
  provider: InjectedProvider;
  account: string;
  merchant: string;
  tokenAddress: string;
  tokenDecimals: number;
  amount: string;
}) {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [
      getAddress(params.merchant),
      parseUnits(params.amount, params.tokenDecimals),
    ],
  });

  return sendInjectedTransaction(params.provider, {
    from: getAddress(params.account),
    to: getAddress(params.tokenAddress),
    data,
  });
}

export async function verifyStableTokenTransfer(params: {
  hash: string;
  merchant: string;
  tokenAddress: string;
  tokenDecimals: number;
  amount: string;
}) {
  if (!isTransactionHash(params.hash)) {
    throw new Error("Payment transaction hash must be a valid 0x-prefixed hash.");
  }

  const normalizedHash = params.hash.trim() as Hex;
  const expectedRecipient = getAddress(params.merchant);
  const expectedToken = getAddress(params.tokenAddress);
  const expectedAmount = parseUnits(params.amount, params.tokenDecimals);
  const receipt = await getPublicClient().getTransactionReceipt({
    hash: normalizedHash,
  });

  if (receipt.status !== "success") {
    throw new Error("The payment transaction did not succeed onchain.");
  }

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: [transferEvent],
        data: log.data,
        topics: log.topics,
      });

      if (
        decoded.eventName === "Transfer" &&
        getAddress(log.address) === expectedToken &&
        getAddress(decoded.args.to) === expectedRecipient &&
        decoded.args.value === expectedAmount
      ) {
        return {
          hash: normalizedHash,
          payer: getAddress(decoded.args.from),
          merchant: expectedRecipient,
          receipt,
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    "That transaction does not match the expected token transfer for this invoice.",
  );
}

export async function createRegistryInvoice(params: {
  provider: InjectedProvider;
  account: string;
  tokenAddress: string;
  tokenDecimals: number;
  amount: string;
  expiresAtUnix: number;
  referenceHash: Hex;
  metadataHash: Hex;
}) {
  const contractAddress = getConfiguredRegistryAddress();
  if (!contractAddress) {
    throw new Error("Configure NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS first.");
  }

  const data = encodeFunctionData({
    abi: CHECKOUT_REGISTRY_ABI,
    functionName: "createInvoice",
    args: [
      getAddress(params.tokenAddress),
      parseUnits(params.amount, params.tokenDecimals),
      BigInt(params.expiresAtUnix),
      params.referenceHash,
      params.metadataHash,
    ],
  });

  const { hash, receipt } = await sendInjectedTransaction(params.provider, {
    from: getAddress(params.account),
    to: contractAddress,
    data,
  });

  let invoiceId: number | null = null;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: [createdEvent],
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "InvoiceCreated") {
        invoiceId = Number(decoded.args.invoiceId);
        break;
      }
    } catch {
      continue;
    }
  }

  if (invoiceId === null) {
    throw new Error("Invoice created, but the invoice id was not found.");
  }

  return { hash, receipt, invoiceId };
}

export async function markRegistryInvoicePaid(params: {
  provider: InjectedProvider;
  account: string;
  invoiceId: number;
  paymentTxHash: Hex;
}) {
  const contractAddress = getConfiguredRegistryAddress();
  if (!contractAddress) {
    throw new Error("Configure NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS first.");
  }

  const data = encodeFunctionData({
    abi: CHECKOUT_REGISTRY_ABI,
    functionName: "markInvoicePaid",
    args: [BigInt(params.invoiceId), params.paymentTxHash],
  });

  return sendInjectedTransaction(params.provider, {
    from: getAddress(params.account),
    to: contractAddress,
    data,
  });
}

export async function cancelRegistryInvoice(params: {
  provider: InjectedProvider;
  account: string;
  invoiceId: number;
}) {
  const contractAddress = getConfiguredRegistryAddress();
  if (!contractAddress) {
    throw new Error("Configure NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS first.");
  }

  const data = encodeFunctionData({
    abi: CHECKOUT_REGISTRY_ABI,
    functionName: "cancelInvoice",
    args: [BigInt(params.invoiceId)],
  });

  return sendInjectedTransaction(params.provider, {
    from: getAddress(params.account),
    to: contractAddress,
    data,
  });
}

function statusFromValue(raw: bigint, expiresAt: bigint): InvoiceStatus {
  if (raw === 1n) {
    return "paid";
  }

  if (raw === 2n) {
    return "cancelled";
  }

  if (expiresAt !== 0n && Number(expiresAt) * 1000 < Date.now()) {
    return "expired";
  }

  return "open";
}

export async function readRegistryInvoice(
  invoiceId: number,
): Promise<RegistryInvoiceView> {
  const contractAddress = getConfiguredRegistryAddress();
  if (!contractAddress) {
    throw new Error("Configure NEXT_PUBLIC_CHECKOUT_REGISTRY_ADDRESS first.");
  }

  const raw = (await getPublicClient().readContract({
    address: contractAddress,
    abi: CHECKOUT_REGISTRY_ABI,
    functionName: "invoices",
    args: [BigInt(invoiceId)],
  })) as readonly [string, string, bigint, bigint, Hex, Hex, bigint, Hex, bigint];

  const [merchant, tokenAddress, amount, expiresAt, referenceHash, metadataHash, status, paymentTxHash, createdAt] =
    raw;

  if (
    merchant.toLowerCase() === ZERO_ADDRESS ||
    tokenAddress.toLowerCase() === ZERO_ADDRESS
  ) {
    throw new Error(`Invoice #${invoiceId} was not found on the registry.`);
  }

  const token = getTokenByAddress(tokenAddress);

  return {
    invoiceId,
    merchant,
    tokenAddress,
    tokenKey: token?.key ?? null,
    amount: formatUnits(amount, token?.decimals ?? 18),
    decimals: token?.decimals ?? 18,
    expiresAt: expiresAt === 0n ? null : new Date(Number(expiresAt) * 1000).toISOString(),
    createdAt:
      createdAt === 0n ? null : new Date(Number(createdAt) * 1000).toISOString(),
    status: statusFromValue(status, expiresAt),
    paymentTxHash: paymentTxHash === ZERO_HASH ? undefined : paymentTxHash,
    referenceHash,
    metadataHash,
  };
}

export async function readMerchantRegistryInvoices(
  merchant: string,
): Promise<RegistryInvoiceView[]> {
  const contractAddress = getConfiguredRegistryAddress();
  if (!contractAddress) {
    return [];
  }

  const normalized = getAddress(merchant);
  const logs: any[] = await getPublicClient().getLogs({
    address: contractAddress,
    event: createdEvent,
    args: { merchant: normalized },
    fromBlock: 0n,
    toBlock: "latest",
  });

  const invoices = await Promise.all(
    logs.map(async (log: any) => {
      const invoice = await readRegistryInvoice(Number(log.args.invoiceId));
      return {
        ...invoice,
        createTxHash: log.transactionHash,
      };
    }),
  );

  return invoices.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) {
      return b.invoiceId - a.invoiceId;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function toUnixTimestamp(iso: string | null): number {
  if (!iso) {
    return 0;
  }

  return Math.floor(new Date(iso).getTime() / 1000);
}

export function toHexChainId(): Hex {
  return numberToHex(ACTIVE_CHAIN.id);
}
