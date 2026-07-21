"use client";

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  XBULL_ID,
  ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { STELLAR_CONFIG } from "./config";

// ──────────────────────────────────────────────────────────────────────────────
// Wallet Kit Singleton
// ──────────────────────────────────────────────────────────────────────────────

let walletKitInstance: StellarWalletsKit | null = null;

export function getWalletKit(): StellarWalletsKit {
  if (typeof window === "undefined") {
    throw new Error("WalletKit can only be used in the browser");
  }

  if (!walletKitInstance) {
    walletKitInstance = new StellarWalletsKit({
      network:
        STELLAR_CONFIG.network === "mainnet"
          ? WalletNetwork.PUBLIC
          : WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }

  return walletKitInstance;
}

// ──────────────────────────────────────────────────────────────────────────────
// Wallet Operations
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Open the wallet selection modal.
 * Returns the selected wallet ID and public key when the user connects.
 */
export async function openWalletModal(): Promise<{
  walletId: string;
  address: string;
}> {
  const kit = getWalletKit();

  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          resolve({ walletId: option.id, address });
        } catch (err) {
          reject(err);
        }
      },
      onClosed: (err) => {
        if (err) reject(err);
        else reject(new Error("Modal closed without wallet selection"));
      },
    });
  });
}

/**
 * Get the public key of the currently connected wallet.
 */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const kit = getWalletKit();
    const { address } = await kit.getAddress();
    return address;
  } catch {
    return null;
  }
}

/**
 * Sign a transaction XDR using the connected wallet.
 */
export async function signTransaction(
  xdr: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
  }
): Promise<string> {
  const kit = getWalletKit();

  const { signedTxXdr } = await kit.signTransaction(xdr, {
    networkPassphrase:
      opts?.networkPassphrase || STELLAR_CONFIG.networkPassphrase,
    address: opts?.address,
  });

  return signedTxXdr;
}

/**
 * Disconnect the current wallet.
 */
export async function disconnectWallet(): Promise<void> {
  try {
    const kit = getWalletKit();
    await kit.disconnect();
  } catch {
    // Ignore disconnect errors
  }
}

/**
 * Set the active wallet by ID (e.g., after reload if stored in localStorage).
 */
export function setActiveWallet(walletId: string): void {
  const kit = getWalletKit();
  kit.setWallet(walletId);
}
