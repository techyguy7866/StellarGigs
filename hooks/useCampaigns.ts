"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchCampaigns,
  fetchCampaign,
  fetchDonations,
  buildContractCall,
  submitTransaction,
} from "@/lib/stellar/contract";
import { STELLAR_CONFIG } from "@/lib/stellar/config";
import {
  xlmToStroops,
  transformCampaign,
  transformDonation,
  parseContractError,
  generateId,
} from "@/lib/utils";
import { useWalletStore } from "@/store/wallet-store";
import { useTransactionStore } from "@/store/transaction-store";
import { signTransaction } from "@/lib/stellar/wallet-kit";
import { nativeToScVal, Address } from "@stellar/stellar-sdk";
import type { CampaignUI, DonationUI, CreateCampaignParams } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────────────────────────────────

export const CAMPAIGN_KEYS = {
  all: ["campaigns"] as const,
  list: () => [...CAMPAIGN_KEYS.all, "list"] as const,
  detail: (id: number) => [...CAMPAIGN_KEYS.all, "detail", id] as const,
  donations: (id: number) => [...CAMPAIGN_KEYS.all, "donations", id] as const,
};

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Queries
// ──────────────────────────────────────────────────────────────────────────────

/** Fetch all campaigns */
export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGN_KEYS.list(),
    queryFn: async (): Promise<CampaignUI[]> => {
      const raw = await fetchCampaigns(1, 50);
      return raw.map(transformCampaign);
    },
    refetchInterval: 15_000, // Refresh every 15 seconds
    staleTime: 10_000,
  });
}

/** Fetch a single campaign by ID */
export function useCampaign(id: number) {
  return useQuery({
    queryKey: CAMPAIGN_KEYS.detail(id),
    queryFn: async (): Promise<CampaignUI | null> => {
      const raw = await fetchCampaign(id);
      if (!raw) return null;
      return transformCampaign(raw);
    },
    enabled: id > 0,
    refetchInterval: 10_000,
  });
}

/** Fetch donations for a campaign */
export function useDonations(campaignId: number) {
  return useQuery({
    queryKey: CAMPAIGN_KEYS.donations(campaignId),
    queryFn: async (): Promise<DonationUI[]> => {
      const raw = await fetchDonations(campaignId);
      return raw.map(transformDonation);
    },
    enabled: campaignId > 0,
    refetchInterval: 10_000,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Mutations
// ──────────────────────────────────────────────────────────────────────────────

/** Create a new campaign */
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { addTransaction, updateTransaction } = useTransactionStore();

  return useMutation({
    mutationFn: async (params: CreateCampaignParams) => {
      if (!address) throw new Error("Wallet not connected");
      if (!STELLAR_CONFIG.contractId) {
        throw new Error("Contract not deployed. Please set NEXT_PUBLIC_CROWDFUND_CONTRACT_ID");
      }

      const goalStroops = xlmToStroops(params.goal);
      const deadlineTs = BigInt(
        Math.floor(Date.now() / 1000) + params.durationDays * 86400
      );

      // Build transaction
      const xdr = await buildContractCall(address, "create_campaign", [
        new Address(address).toScVal(),
        nativeToScVal(params.title, { type: "string" }),
        nativeToScVal(params.description, { type: "string" }),
        nativeToScVal(goalStroops, { type: "i128" }),
        nativeToScVal(deadlineTs, { type: "u64" }),
      ]);

      // Sign
      const signedXdr = await signTransaction(xdr, { address });

      // Track transaction
      const txId = addTransaction({
        hash: "",
        type: "create_campaign",
        status: "pending",
        description: `Creating grant program: ${params.title}`,
      });

      toast.loading(`Creating grant program: ${params.title}`, { id: txId });

      try {
        // Submit
        const result = await submitTransaction(signedXdr);

        updateTransaction(txId, {
          status: "success",
          hash: result.txHash,
        });

        toast.success("Grant program created successfully!", {
          id: txId,
          description: `Tx: ${result.txHash.slice(0, 16)}...`,
        });

        return result;
      } catch (err) {
        updateTransaction(txId, {
          status: "failed",
          error: parseContractError(err),
        });
        toast.error("Grant program creation failed", {
          id: txId,
          description: parseContractError(err),
        });
        throw err;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_KEYS.all });
    },

    onError: (err) => {
      console.error("Create grant program error:", err);
    },
  });
}

/** Donate to a campaign */
export function useDonate(campaignId: number) {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { addTransaction, updateTransaction } = useTransactionStore();

  return useMutation({
    mutationFn: async (amountXlm: number) => {
      if (!address) throw new Error("Wallet not connected");
      if (!STELLAR_CONFIG.contractId) {
        throw new Error("Contract not deployed");
      }

      const amountStroops = xlmToStroops(amountXlm);

      // Build transaction
      const xdr = await buildContractCall(address, "donate", [
        nativeToScVal(campaignId, { type: "u32" }),
        new Address(address).toScVal(),
        nativeToScVal(amountStroops, { type: "i128" }),
      ]);

      // Sign
      const signedXdr = await signTransaction(xdr, { address });

      const txId = addTransaction({
        hash: "",
        type: "donate",
        status: "pending",
        campaignId,
        amount: amountXlm,
        description: `Contributing ${amountXlm} XLM to Grant Program #${campaignId}`,
      });

      toast.loading(`Contributing ${amountXlm} XLM...`, { id: txId });

      try {
        const result = await submitTransaction(signedXdr);

        updateTransaction(txId, {
          status: "success",
          hash: result.txHash,
        });

        toast.success(`Contributed ${amountXlm} XLM!`, {
          id: txId,
          description: `Tx: ${result.txHash.slice(0, 16)}...`,
        });

        return result;
      } catch (err) {
        updateTransaction(txId, {
          status: "failed",
          error: parseContractError(err),
        });
        toast.error("Contribution failed", {
          id: txId,
          description: parseContractError(err),
        });
        throw err;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_KEYS.detail(campaignId) });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_KEYS.donations(campaignId) });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_KEYS.list() });
    },
  });
}

/** Withdraw funds from a successful campaign */
export function useWithdraw(campaignId: number) {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { addTransaction, updateTransaction } = useTransactionStore();

  return useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Wallet not connected");

      const xdr = await buildContractCall(address, "withdraw", [
        nativeToScVal(campaignId, { type: "u32" }),
        new Address(address).toScVal(),
      ]);

      const signedXdr = await signTransaction(xdr, { address });

      const txId = addTransaction({
        hash: "",
        type: "withdraw",
        status: "pending",
        campaignId,
        description: `Claiming funds from Grant Program #${campaignId}`,
      });

      toast.loading("Claiming funds...", { id: txId });

      try {
        const result = await submitTransaction(signedXdr);

        updateTransaction(txId, {
          status: "success",
          hash: result.txHash,
        });

        toast.success("Funds claimed successfully!", {
          id: txId,
          description: `Tx: ${result.txHash.slice(0, 16)}...`,
        });

        return result;
      } catch (err) {
        updateTransaction(txId, {
          status: "failed",
          error: parseContractError(err),
        });
        toast.error("Claim failed", {
          id: txId,
          description: parseContractError(err),
        });
        throw err;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_KEYS.detail(campaignId) });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_KEYS.list() });
    },
  });
}

/** Refund from an expired campaign */
export function useRefund(campaignId: number) {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { addTransaction, updateTransaction } = useTransactionStore();

  return useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Wallet not connected");

      const xdr = await buildContractCall(address, "refund", [
        nativeToScVal(campaignId, { type: "u32" }),
        new Address(address).toScVal(),
      ]);

      const signedXdr = await signTransaction(xdr, { address });

      const txId = addTransaction({
        hash: "",
        type: "refund",
        status: "pending",
        campaignId,
        description: `Requesting refund from Grant Program #${campaignId}`,
      });

      toast.loading("Processing refund...", { id: txId });

      try {
        const result = await submitTransaction(signedXdr);

        updateTransaction(txId, {
          status: "success",
          hash: result.txHash,
        });

        toast.success("Refund claimed successfully!", {
          id: txId,
          description: `Tx: ${result.txHash.slice(0, 16)}...`,
        });

        return result;
      } catch (err) {
        updateTransaction(txId, {
          status: "failed",
          error: parseContractError(err),
        });
        toast.error("Refund failed", {
          id: txId,
          description: parseContractError(err),
        });
        throw err;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_KEYS.detail(campaignId) });
    },
  });
}
