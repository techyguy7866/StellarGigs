import { StellarConfig } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Stellar Network Configuration
// ──────────────────────────────────────────────────────────────────────────────

export const STELLAR_CONFIG: StellarConfig = {
  network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK as "testnet" | "mainnet") || "testnet",
  rpcUrl:
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
    "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ||
    "https://horizon-testnet.stellar.org",
  contractId:
    process.env.NEXT_PUBLIC_CROWDFUND_CONTRACT_ID || "",
  rewardTokenId:
    process.env.NEXT_PUBLIC_REWARD_TOKEN_CONTRACT_ID || "",
};

/** Testnet native XLM SAC address */
export const NATIVE_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_NATIVE_TOKEN_ADDRESS ||
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/** Deployer / owner address */
export const DEPLOYER_ADDRESS =
  process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ||
  "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX";

/** Event poll interval (milliseconds) */
export const EVENT_POLL_INTERVAL = 5_000;

/** Transaction confirmation poll interval (milliseconds) */
export const TX_POLL_INTERVAL = 2_000;

/** Maximum number of events to display in the feed */
export const MAX_EVENTS_IN_FEED = 50;
