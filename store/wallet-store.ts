import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WalletState } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Wallet Store
// ──────────────────────────────────────────────────────────────────────────────

interface WalletStore extends WalletState {
  walletId: string | null;
  /** CRWD reward token balance (in stroops). Null = not yet fetched. */
  rewardBalance: number | null;

  // Actions
  setConnected: (address: string, walletId: string) => void;
  setDisconnected: () => void;
  setBalance: (balance: string) => void;
  setRewardBalance: (rewardBalance: number) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      // State
      isConnected: false,
      address: null,
      walletId: null,
      network: "testnet",
      balance: null,
      rewardBalance: null,
      isConnecting: false,
      error: null,

      // Actions
      setConnected: (address, walletId) =>
        set({
          isConnected: true,
          address,
          walletId,
          network: "testnet",
          error: null,
          isConnecting: false,
        }),

      setDisconnected: () =>
        set({
          isConnected: false,
          address: null,
          walletId: null,
          balance: null,
          rewardBalance: null,
          error: null,
          isConnecting: false,
        }),

      setBalance: (balance) => set({ balance }),

      setRewardBalance: (rewardBalance) => set({ rewardBalance }),

      setConnecting: (isConnecting) => set({ isConnecting }),

      setError: (error) => set({ error, isConnecting: false }),
    }),
    {
      name: "crowdfund-wallet",
      // Only persist non-sensitive state
      partialize: (state) => ({
        address: state.address,
        walletId: state.walletId,
        isConnected: state.isConnected,
      }),
    }
  )
);
