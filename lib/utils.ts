import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Campaign, CampaignUI, Donation, DonationUI } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// CSS Utilities
// ──────────────────────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ──────────────────────────────────────────────────────────────────────────────
// Stellar / XLM Utilities
// ──────────────────────────────────────────────────────────────────────────────

/** 1 XLM = 10_000_000 stroops */
export const STROOPS_PER_XLM = 10_000_000n;
export const STROOPS_PER_XLM_NUM = 10_000_000;

/** Convert stroops (bigint) to XLM (number) */
export function stroopsToXlm(stroops: bigint | number): number {
  const s = typeof stroops === "bigint" ? stroops : BigInt(Math.floor(stroops));
  return Number(s) / STROOPS_PER_XLM_NUM;
}

/** Convert XLM (number) to stroops (bigint) */
export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.floor(xlm * STROOPS_PER_XLM_NUM));
}

/** Format XLM amount for display */
export function formatXlm(xlm: number, decimals = 2): string {
  if (xlm === 0) return "0 XLM";
  if (xlm < 0.01) return `< 0.01 XLM`;
  return `${xlm.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} XLM`;
}

/** Shorten a Stellar address for display */
export function shortAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Date / Time Utilities
// ──────────────────────────────────────────────────────────────────────────────

/** Convert unix timestamp (seconds, bigint) to Date */
export function unixToDate(ts: bigint | number): Date {
  const seconds = typeof ts === "bigint" ? Number(ts) : ts;
  return new Date(seconds * 1000);
}

/** Get days remaining until a deadline */
export function daysRemaining(deadline: Date): number {
  const now = Date.now();
  const diff = deadline.getTime() - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** Format a date relative to now */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format deadline display */
export function formatDeadline(deadline: Date): string {
  const days = daysRemaining(deadline);
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  if (days < 30) return `${days} days left`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} left`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Transform Utilities
// ──────────────────────────────────────────────────────────────────────────────

/** Convert raw contract Campaign to UI-friendly CampaignUI */
export function transformCampaign(campaign: Campaign): CampaignUI {
  const deadline = unixToDate(campaign.deadline);
  const goal = stroopsToXlm(campaign.goal);
  const raised = stroopsToXlm(campaign.raised);
  const progressPercent = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const dl = daysRemaining(deadline);
  const isExpired = dl === 0 && campaign.status === "Active";

  return {
    ...campaign,
    goal,
    raised,
    deadline,
    progressPercent,
    daysLeft: dl,
    isExpired,
  };
}

/** Convert raw Donation to UI-friendly DonationUI */
export function transformDonation(donation: Donation): DonationUI {
  return {
    donor: donation.donor,
    amount: stroopsToXlm(donation.amount),
    timestamp: unixToDate(donation.timestamp),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Transaction Utilities
// ──────────────────────────────────────────────────────────────────────────────

/** Get Stellar Expert explorer URL for a transaction */
export function explorerTxUrl(hash: string, network: "testnet" | "mainnet" = "testnet"): string {
  const base = network === "mainnet"
    ? "https://stellar.expert/explorer/public"
    : "https://stellar.expert/explorer/testnet";
  return `${base}/tx/${hash}`;
}

/** Get Stellar Expert explorer URL for an account */
export function explorerAccountUrl(address: string, network: "testnet" | "mainnet" = "testnet"): string {
  const base = network === "mainnet"
    ? "https://stellar.expert/explorer/public"
    : "https://stellar.expert/explorer/testnet";
  return `${base}/account/${address}`;
}

/** Get Stellar Expert explorer URL for a contract */
export function explorerContractUrl(contractId: string, network: "testnet" | "mainnet" = "testnet"): string {
  const base = network === "mainnet"
    ? "https://stellar.expert/explorer/public"
    : "https://stellar.expert/explorer/testnet";
  return `${base}/contract/${contractId}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Error Utilities
// ──────────────────────────────────────────────────────────────────────────────

export function parseContractError(error: unknown): string {
  if (!error) return "Unknown error occurred";

  const message = String(error);

  if (message.includes("AlreadyInitialized")) return "Contract is already initialized";
  if (message.includes("Unauthorized")) return "You are not authorized to perform this action";
  if (message.includes("CampaignNotFound")) return "Campaign not found";
  if (message.includes("CampaignNotActive")) return "Campaign is not active";
  if (message.includes("CampaignExpired")) return "Campaign has expired";
  if (message.includes("CampaignNotSuccessful")) return "Campaign has not met its goal yet";
  if (message.includes("CampaignNotExpired")) return "Campaign has not expired yet";
  if (message.includes("InvalidGoal")) return "Invalid funding goal. Must be greater than 0";
  if (message.includes("InvalidDeadline")) return "Invalid deadline. Must be in the future";
  if (message.includes("InvalidAmount")) return "Invalid donation amount. Must be greater than 0";
  if (message.includes("NothingToWithdraw")) return "No funds to withdraw";
  if (message.includes("NoDonationFound")) return "No donation found for this address";
  if (message.includes("rejected")) return "Transaction was rejected by the user";
  if (message.includes("User declined") || message.includes("user rejected")) {
    return "Transaction rejected by wallet";
  }
  if (message.includes("insufficient") || message.includes("Insufficient")) {
    return "Insufficient balance to complete this transaction";
  }
  if (message.includes("not installed") || message.includes("not found")) {
    return "Wallet not found. Please install Freighter or another Stellar wallet";
  }

  return message.length > 120 ? `${message.slice(0, 120)}...` : message;
}

// ──────────────────────────────────────────────────────────────────────────────
// Misc Utilities
// ──────────────────────────────────────────────────────────────────────────────

/** Generate a unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Format large numbers with K/M suffix */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
