"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getActiveChain,
  type InjectedProvider,
  toHexChainId,
} from "@/lib/celo";
import { formatAddress } from "@/lib/checkout-format";

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

type WalletStatus =
  | "checking"
  | "idle"
  | "connecting"
  | "ready"
  | "missing"
  | "error";

export function useMiniPayWallet() {
  const [provider, setProvider] = useState<InjectedProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (nextProvider: InjectedProvider) => {
    const accounts = (await nextProvider.request({
      method: "eth_accounts",
    })) as string[];
    const rawChainId = (await nextProvider.request({
      method: "eth_chainId",
    })) as string;

    setAddress(accounts[0] ?? null);
    setChainId(Number.parseInt(rawChainId, 16));
    setStatus(accounts[0] ? "ready" : "idle");
  }, []);

  const connect = useCallback(
    async (nextProvider = provider) => {
      if (!nextProvider) {
        setStatus("missing");
        return;
      }

      try {
        setStatus("connecting");
        setError(null);
        const accounts = (await nextProvider.request({
          method: "eth_requestAccounts",
        })) as string[];
        const rawChainId = (await nextProvider.request({
          method: "eth_chainId",
        })) as string;

        setAddress(accounts[0] ?? null);
        setChainId(Number.parseInt(rawChainId, 16));
        setStatus(accounts[0] ? "ready" : "idle");
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Wallet connection failed.";
        setError(message);
        setStatus("error");
      }
    },
    [provider],
  );

  const switchChain = useCallback(async () => {
    if (!provider) {
      return;
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHexChainId() }],
      });
      await refresh(provider);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not switch to the configured Celo network.";
      setError(message);
      setStatus("error");
    }
  }, [provider, refresh]);

  useEffect(() => {
    const injected = window.ethereum;
    if (!injected) {
      setStatus("missing");
      return;
    }

    setProvider(injected);

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts)
        ? (accounts as string[])
        : [];
      setAddress(nextAccounts[0] ?? null);
      setStatus(nextAccounts[0] ? "ready" : "idle");
    };

    const handleChainChanged = (nextChainId: unknown) => {
      if (typeof nextChainId === "string") {
        setChainId(Number.parseInt(nextChainId, 16));
      }
    };

    void refresh(injected);

    if (injected.isMiniPay) {
      void connect(injected);
    }

    injected.on?.("accountsChanged", handleAccountsChanged);
    injected.on?.("chainChanged", handleChainChanged);

    return () => {
      injected.removeListener?.("accountsChanged", handleAccountsChanged);
      injected.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [connect, refresh]);

  const expectedChainId = Number(getActiveChain().id);
  const isExpectedChain = chainId === null || chainId === expectedChainId;

  return useMemo(
    () => ({
      provider,
      address,
      shortAddress: address ? formatAddress(address, 4) : null,
      chainId,
      expectedChainId,
      isExpectedChain,
      status,
      error,
      isConnected: Boolean(address),
      isMiniPay: Boolean(provider?.isMiniPay),
      providerKind: provider ? (provider.isMiniPay ? "minipay" : "browser") : "none",
      connect,
      switchChain,
    }),
    [
      address,
      chainId,
      connect,
      error,
      expectedChainId,
      isExpectedChain,
      provider,
      status,
      switchChain,
    ],
  );
}
