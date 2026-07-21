// ──────────────────────────────────────────────────────────────────────────────
// Stellar / Soroban Types
// ──────────────────────────────────────────────────────────────────────────────

export type Network = "testnet" | "mainnet" | "futurenet";

export interface StellarConfig {
  network: Network;
  rpcUrl: string;
  networkPassphrase: string;
  horizonUrl: string;
  contractId: string;
  rewardTokenId?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Wallet Types
// ──────────────────────────────────────────────────────────────────────────────

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: Network | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Types (mirrors the Soroban contract)
// ──────────────────────────────────────────────────────────────────────────────

export type CampaignStatus = "Active" | "Successful" | "Expired" | "Withdrawn";

export interface Campaign {
  id: number;
  creator: string;
  title: string;
  description: string;
  goal: bigint; // in stroops
  deadline: bigint; // unix timestamp
  raised: bigint; // in stroops
  status: CampaignStatus;
}

export interface CampaignUI extends Omit<Campaign, "goal" | "deadline" | "raised"> {
  goal: number; // in XLM
  deadline: Date;
  raised: number; // in XLM
  progressPercent: number;
  daysLeft: number;
  isExpired: boolean;
}

export interface Donation {
  donor: string;
  amount: bigint; // in stroops
  timestamp: bigint; // unix timestamp
}

export interface DonationUI extends Omit<Donation, "amount" | "timestamp"> {
  amount: number; // in XLM
  timestamp: Date;
}

export interface CreateCampaignParams {
  title: string;
  description: string;
  goal: number; // in XLM
  durationDays: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Transaction Types
// ──────────────────────────────────────────────────────────────────────────────

export type TransactionStatus = "pending" | "success" | "failed";
export type TransactionType =
  | "create_campaign"
  | "donate"
  | "withdraw"
  | "refund"
  | "initialize";

export interface Transaction {
  id: string;
  hash: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: Date;
  campaignId?: number;
  amount?: number; // in XLM
  description: string;
  error?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Event Types (from contract events)
// ──────────────────────────────────────────────────────────────────────────────

export type EventType =
  | "campaign_created"
  | "donation_made"
  | "funds_withdrawn"
  | "refund_issued";

export interface ContractEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  ledger: number;
  txHash: string;
  campaignId: number;
  walletAddress: string;
  amount?: number; // in XLM
  description: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// UI State Types
// ──────────────────────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "pending" | "info";
  title: string;
  description?: string;
  txHash?: string;
  duration?: number;
}

export interface ModalState {
  createCampaign: boolean;
  donate: boolean;
  wallet: boolean;
}
