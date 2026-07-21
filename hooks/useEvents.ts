"use client";

import { useQuery } from "@tanstack/react-query";
import { useEventStore } from "@/store/event-store";
import { fetchContractEvents } from "@/lib/stellar/contract";
import { STELLAR_CONFIG, EVENT_POLL_INTERVAL } from "@/lib/stellar/config";
import type { ContractEvent } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// useEvents Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useEvents() {
  const { events, addEvents, setPolling, setLastPollTime, isPolling } =
    useEventStore();

  const query = useQuery({
    queryKey: ["contract-events", STELLAR_CONFIG.contractId],
    queryFn: async () => {
      if (!STELLAR_CONFIG.contractId) {
        return getMockEvents();
      }

      setPolling(true);
      try {
        const newEvents = await fetchContractEvents(STELLAR_CONFIG.contractId);
        addEvents(newEvents);
        setLastPollTime(Date.now());
        return newEvents;
      } finally {
        setPolling(false);
      }
    },
    refetchInterval: EVENT_POLL_INTERVAL,
    refetchIntervalInBackground: true,
    staleTime: 4_000,
    retry: 2,
  });

  return {
    events,
    isLoading: query.isLoading,
    isPolling,
    error: query.error,
    refetch: query.refetch,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock Events for Demo
// ──────────────────────────────────────────────────────────────────────────────

function getMockEvents(): ContractEvent[] {
  const now = Date.now();
  return [
    {
      id: "mock-1",
      type: "donation_made",
      timestamp: new Date(now - 30_000),
      ledger: 54321,
      txHash:
        "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      campaignId: 1,
      walletAddress:
        "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX",
      amount: 50,
      description: "Donated 50.00 XLM to Campaign #1",
    },
    {
      id: "mock-2",
      type: "campaign_created",
      timestamp: new Date(now - 120_000),
      ledger: 54310,
      txHash:
        "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
      campaignId: 4,
      walletAddress:
        "GBUX3IHQTAIRN3BXVBWZMKFW2CF6FE4QKQWYEDHYGQXL6OQ3YFMN5R3N",
      description: "Campaign #4 created",
    },
    {
      id: "mock-3",
      type: "donation_made",
      timestamp: new Date(now - 300_000),
      ledger: 54290,
      txHash:
        "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      campaignId: 2,
      walletAddress:
        "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX",
      amount: 200,
      description: "Donated 200.00 XLM to Campaign #2",
    },
    {
      id: "mock-4",
      type: "funds_withdrawn",
      timestamp: new Date(now - 600_000),
      ledger: 54270,
      txHash:
        "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
      campaignId: 3,
      walletAddress:
        "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX",
      amount: 20500,
      description: "Creator withdrew 20500.00 XLM from Campaign #3",
    },
    {
      id: "mock-5",
      type: "donation_made",
      timestamp: new Date(now - 900_000),
      ledger: 54250,
      txHash:
        "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
      campaignId: 1,
      walletAddress:
        "GBUX3IHQTAIRN3BXVBWZMKFW2CF6FE4QKQWYEDHYGQXL6OQ3YFMN5R3N",
      amount: 100,
      description: "Donated 100.00 XLM to Campaign #1",
    },
    {
      id: "mock-6",
      type: "campaign_created",
      timestamp: new Date(now - 1800_000),
      ledger: 54200,
      txHash:
        "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1",
      campaignId: 1,
      walletAddress:
        "GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX",
      description: "Campaign #1 created",
    },
    {
      id: "mock-7",
      type: "refund_issued",
      timestamp: new Date(now - 3600_000),
      ledger: 54100,
      txHash:
        "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b3",
      campaignId: 4,
      walletAddress:
        "GBUX3IHQTAIRN3BXVBWZMKFW2CF6FE4QKQWYEDHYGQXL6OQ3YFMN5R3N",
      amount: 150,
      description: "Refund of 150.00 XLM issued for Campaign #4",
    },
  ];
}
