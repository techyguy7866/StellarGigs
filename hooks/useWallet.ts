"use client";

import { useCallback } from "react";
import { useWalletStore } from "@/store/wallet-store";
import {
  openWalletModal,
  signTransaction,
  disconnectWallet,
  setActiveWallet,
  getConnectedAddress,
} from "@/lib/stellar/wallet-kit";
import { fetchXlmBalance, fetchRewardBalance } from "@/lib/stellar/contract";
import { parseContractError } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// useWallet Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useWallet() {
  const store = useWalletStore();

  /** Fetch both XLM and CRWD reward balances for an address */
  const fetchAllBalances = useCallback(async (address: string) => {
    const [balance, rewardBalance] = await Promise.allSettled([
      fetchXlmBalance(address),
      fetchRewardBalance(address),
    ]);
    if (balance.status === "fulfilled") store.setBalance(balance.value);
    if (rewardBalance.status === "fulfilled") store.setRewardBalance(rewardBalance.value);
  }, [store]);

  /** Open the wallet selection modal and connect */
  const connect = useCallback(async () => {
    store.setConnecting(true);
    store.setError(null);

    try {
      const { walletId, address } = await openWalletModal();
      store.setConnected(address, walletId);

      // Fetch XLM + CRWD reward balances in parallel
      await fetchAllBalances(address);
    } catch (err) {
      const message = parseContractError(err);
      // Ignore "modal closed" errors
      if (!message.includes("closed without")) {
        store.setError(message);
      } else {
        store.setConnecting(false);
      }
    }
  }, [store, fetchAllBalances]);

  /** Disconnect the current wallet */
  const disconnect = useCallback(async () => {
    await disconnectWallet();
    store.setDisconnected();
  }, [store]);

  /** Refresh the XLM + CRWD balances */
  const refreshBalance = useCallback(async () => {
    if (!store.address) return;
    try {
      await fetchAllBalances(store.address);
    } catch {
      // Ignore balance fetch errors
    }
  }, [store, fetchAllBalances]);

  /** Restore wallet from persisted state on page load */
  const restoreWallet = useCallback(async () => {
    if (!store.isConnected || !store.walletId) return;

    try {
      setActiveWallet(store.walletId);
      const address = await getConnectedAddress();

      if (address && address === store.address) {
        await fetchAllBalances(address);
      } else {
        // Session expired, disconnect
        store.setDisconnected();
      }
    } catch {
      store.setDisconnected();
    }
  }, [store, fetchAllBalances]);

  return {
    // State
    isConnected: store.isConnected,
    address: store.address,
    balance: store.balance,
    rewardBalance: store.rewardBalance,
    network: store.network,
    isConnecting: store.isConnecting,
    error: store.error,

    // Actions
    connect,
    disconnect,
    refreshBalance,
    restoreWallet,

    // Signing
    sign: signTransaction,
  };
}
