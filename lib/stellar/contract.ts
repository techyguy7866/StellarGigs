import {
  Contract,
  rpc,
  Transaction,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "./config";
import type { Campaign, Donation, ContractEvent, EventType } from "@/types";
import { stroopsToXlm } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// RPC Client
// ──────────────────────────────────────────────────────────────────────────────

let _server: rpc.Server | null = null;

export function getRpcServer(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(STELLAR_CONFIG.rpcUrl, {
      allowHttp: false,
    });
  }
  return _server;
}

// ──────────────────────────────────────────────────────────────────────────────
// Contract Interaction Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build and simulate a contract call, then assemble the transaction.
 * Returns the XDR string of the assembled transaction ready for signing.
 */
export async function buildContractCall(
  sourceAddress: string,
  functionName: string,
  args: xdr.ScVal[]
): Promise<string> {
  const server = getRpcServer();
  const contract = new Contract(STELLAR_CONFIG.contractId);

  // Load the source account
  const account = await server.getAccount(sourceAddress);

  // Build the transaction
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(300)
    .build();

  // Simulate to get resource fees
  const simulation = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(
      `Simulation error: ${simulation.error}`
    );
  }

  if (!rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error("Transaction simulation failed");
  }

  // Assemble the transaction with proper resource fees
  const assembledTx = rpc.assembleTransaction(tx, simulation).build();

  return assembledTx.toXDR();
}

/**
 * Submit a signed transaction to the network and poll for status.
 */
export async function submitTransaction(
  signedXdr: string
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const server = getRpcServer();

  const tx = TransactionBuilder.fromXDR(
    signedXdr,
    STELLAR_CONFIG.networkPassphrase
  ) as Transaction;

  // Send the transaction
  const sendResponse = await server.sendTransaction(tx);

  if (sendResponse.status === "ERROR") {
    throw new Error(
      `Transaction failed: ${JSON.stringify(sendResponse.errorResult)}`
    );
  }

  const txHash = sendResponse.hash;

  // Poll until finalized
  const startTime = Date.now();
  const timeout = 30_000; // 30 seconds

  while (Date.now() - startTime < timeout) {
    await sleep(2000);

    const statusResponse = await server.getTransaction(txHash);

    if (statusResponse.status === "SUCCESS") {
      return statusResponse as rpc.Api.GetSuccessfulTransactionResponse;
    }

    if (statusResponse.status === "FAILED") {
      throw new Error(
        `Transaction failed: ${JSON.stringify(statusResponse)}`
      );
    }

    // Status is NOT_FOUND or PENDING, keep polling
  }

  throw new Error("Transaction timed out after 30 seconds");
}

// ──────────────────────────────────────────────────────────────────────────────
// Contract Read-Only Queries
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a read-only contract call and return the native JS value.
 */
async function simulateReadCall(
  functionName: string,
  args: xdr.ScVal[],
  contractIdOverride?: string
): Promise<unknown> {
  const server = getRpcServer();
  const contractIdToUse = contractIdOverride || STELLAR_CONFIG.contractId;
  const contract = new Contract(contractIdToUse);

  // Use a dummy account for read-only calls
  // We use a well-known funded testnet account to load sequence numbers
  const dummySource =
    "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX";

  let account;
  try {
    account = await server.getAccount(dummySource);
  } catch {
    // If account can't be loaded, use a minimal account builder
    const { Account } = await import("@stellar/stellar-sdk");
    account = new Account(dummySource, "0");
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Query error: ${simulation.error}`);
  }

  if (!rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error("Query simulation failed");
  }

  const result = simulation.result?.retval;
  if (!result) return null;

  return scValToNative(result);
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Queries
// ──────────────────────────────────────────────────────────────────────────────

export async function fetchCampaignCount(): Promise<number> {
  if (!STELLAR_CONFIG.contractId) return 0;
  try {
    const count = await simulateReadCall("get_campaign_count", []);
    return Number(count) || 0;
  } catch {
    return 0;
  }
}

export async function fetchCampaign(id: number): Promise<Campaign | null> {
  if (!STELLAR_CONFIG.contractId) return null;
  try {
    const raw = (await simulateReadCall("get_campaign", [
      nativeToScVal(id, { type: "u32" }),
    ])) as Record<string, unknown> | null;

    if (!raw) return null;
    return parseCampaign(raw);
  } catch {
    return null;
  }
}

export async function fetchCampaigns(
  startId = 1,
  limit = 20
): Promise<Campaign[]> {
  if (!STELLAR_CONFIG.contractId) return getMockCampaigns();
  try {
    const raw = (await simulateReadCall("get_campaigns", [
      nativeToScVal(startId, { type: "u32" }),
      nativeToScVal(limit, { type: "u32" }),
    ])) as Record<string, unknown>[] | null;

    if (!raw || !Array.isArray(raw)) return [];
    return raw.map(parseCampaign).filter(Boolean) as Campaign[];
  } catch {
    return getMockCampaigns();
  }
}

export async function fetchDonations(campaignId: number): Promise<Donation[]> {
  if (!STELLAR_CONFIG.contractId) return [];
  try {
    const raw = (await simulateReadCall("get_donations", [
      nativeToScVal(campaignId, { type: "u32" }),
    ])) as Record<string, unknown>[] | null;

    if (!raw || !Array.isArray(raw)) return [];
    return raw.map(parseDonation).filter(Boolean) as Donation[];
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Contract Events
// ──────────────────────────────────────────────────────────────────────────────

let _lastEventLedger = 0;

export async function fetchContractEvents(
  contractId: string,
  startLedger?: number
): Promise<ContractEvent[]> {
  const server = getRpcServer();

  try {
    // Use stored ledger or start from a reasonable recent ledger
    const ledger = startLedger || _lastEventLedger || undefined;

    const response = await server.getEvents({
      startLedger: ledger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
        },
      ],
      limit: 100,
    });

    const events: ContractEvent[] = [];

    for (const event of response.events) {
      // Track latest ledger for next poll
      if (event.ledger > _lastEventLedger) {
        _lastEventLedger = event.ledger;
      }

      const parsed = parseContractEvent(event);
      if (parsed) events.push(parsed);
    }

    return events.reverse(); // Newest first
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Account Balance
// ──────────────────────────────────────────────────────────────────────────────

export async function fetchXlmBalance(address: string): Promise<string> {
  try {
    const response = await fetch(
      `${STELLAR_CONFIG.horizonUrl}/accounts/${address}`
    );
    if (!response.ok) return "0";

    const data = await response.json();
    const xlmBalance = data.balances?.find(
      (b: { asset_type: string; balance: string }) =>
        b.asset_type === "native"
    );
    return xlmBalance?.balance || "0";
  } catch {
    return "0";
  }
}

/**
 * Fetch the CRWD reward token balance for an address.
 * Returns the raw stroop amount (divide by 10_000_000 for XLM-equivalent display).
 */
export async function fetchRewardBalance(address: string): Promise<number> {
  if (!STELLAR_CONFIG.rewardTokenId) return 0;
  try {
    const raw = await simulateReadCall(
      "balance_of",
      [new Address(address).toScVal()],
      STELLAR_CONFIG.rewardTokenId
    );
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Data Parsers
// ──────────────────────────────────────────────────────────────────────────────

function parseCampaign(raw: Record<string, unknown>): Campaign {
  const status = Object.keys(raw.status as Record<string, unknown>)[0] as
    | "Active"
    | "Successful"
    | "Expired"
    | "Withdrawn";

  return {
    id: Number(raw.id),
    creator: String(raw.creator),
    title: String(raw.title),
    description: String(raw.description),
    goal: BigInt(raw.goal as string | number | bigint),
    deadline: BigInt(raw.deadline as string | number | bigint),
    raised: BigInt(raw.raised as string | number | bigint),
    status,
  };
}

function parseDonation(raw: Record<string, unknown>): Donation {
  return {
    donor: String(raw.donor),
    amount: BigInt(raw.amount as string | number | bigint),
    timestamp: BigInt(raw.timestamp as string | number | bigint),
  };
}

function parseContractEvent(
  event: rpc.Api.EventResponse
): ContractEvent | null {
  try {
    const topics = event.topic.map((t) => scValToNative(t));
    const value = scValToNative(event.value);

    // topics[0] = category (e.g. "campaign"), topics[1] = action (e.g. "created")
    const category = String(topics[0] || "");
    const action = String(topics[1] || "");
    const eventType = `${category}_${action}` as EventType;

    // Parse value as array
    const vals = Array.isArray(value) ? value : [value];

    const campaignId = Number(vals[0]) || 0;
    const walletAddress = String(vals[1] || "");
    const amount =
      vals[2] !== undefined ? stroopsToXlm(Number(vals[2])) : undefined;

    const descriptions: Record<EventType, string> = {
      campaign_created: `Campaign #${campaignId} created`,
      donation_made: `Donated ${amount?.toFixed(2)} XLM to Campaign #${campaignId}`,
      funds_withdrawn: `Creator withdrew ${amount?.toFixed(2)} XLM from Campaign #${campaignId}`,
      refund_issued: `Refund of ${amount?.toFixed(2)} XLM issued for Campaign #${campaignId}`,
    };

    return {
      id: `${event.ledger}-${event.pagingToken}`,
      type: eventType,
      timestamp: new Date(event.ledgerClosedAt),
      ledger: event.ledger,
      txHash: event.txHash,
      campaignId,
      walletAddress,
      amount,
      description: descriptions[eventType] || `${category} ${action}`,
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock Data (for demo when contract not deployed)
// ──────────────────────────────────────────────────────────────────────────────

function getMockCampaigns(): Campaign[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      id: 1,
      creator: "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX",
      title: "Build a Solar-Powered Community Hub",
      description:
        "We're building a sustainable community center powered entirely by solar energy in rural Kenya. The hub will serve 500+ families with education, healthcare, and digital access.",
      goal: BigInt(5000 * 10_000_000), // 5000 XLM
      deadline: BigInt(now + 30 * 86400), // 30 days
      raised: BigInt(2350 * 10_000_000), // 2350 XLM raised
      status: "Active",
    },
    {
      id: 2,
      creator: "GBUX3IHQTAIRN3BXVBWZMKFW2CF6FE4QKQWYEDHYGQXL6OQ3YFMN5R3N",
      title: "Open Source Stellar DEX Aggregator",
      description:
        "Building a fully open-source DEX aggregator for the Stellar ecosystem. Route your trades through SDEX and liquidity pools for the best rates.",
      goal: BigInt(10000 * 10_000_000), // 10000 XLM
      deadline: BigInt(now + 45 * 86400), // 45 days
      raised: BigInt(7800 * 10_000_000), // 7800 XLM raised
      status: "Active",
    },
    {
      id: 3,
      creator: "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX",
      title: "Micro-Lending Protocol for Emerging Markets",
      description:
        "A decentralized micro-lending platform on Stellar that connects lenders with borrowers in developing countries, with on-chain credit scoring and collateral management.",
      goal: BigInt(20000 * 10_000_000), // 20000 XLM
      deadline: BigInt(now + 60 * 86400), // 60 days
      raised: BigInt(20500 * 10_000_000), // Goal exceeded
      status: "Successful",
    },
    {
      id: 4,
      creator: "GBUX3IHQTAIRN3BXVBWZMKFW2CF6FE4QKQWYEDHYGQXL6OQ3YFMN5R3N",
      title: "Decentralized Ocean Cleanup Initiative",
      description:
        "Fund autonomous ocean cleanup drones coordinated by Stellar smart contracts. Each donation directly triggers cleanup operations tracked on-chain.",
      goal: BigInt(8000 * 10_000_000), // 8000 XLM
      deadline: BigInt(now - 5 * 86400), // Expired 5 days ago
      raised: BigInt(3200 * 10_000_000), // 3200 XLM raised
      status: "Expired",
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
