"use client";

import { use, useState } from "react";
import {
  Clock,
  Target,
  TrendingUp,
  Users,
  ChevronLeft,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  ArrowUpRight,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCampaign, useDonations, useWithdraw } from "@/hooks/useCampaigns";
import { DonationForm } from "@/components/campaigns/DonationForm";
import { useWalletStore } from "@/store/wallet-store";
import { useWallet } from "@/hooks/useWallet";
import {
  cn,
  formatXlm,
  formatDeadline,
  shortAddress,
  copyToClipboard,
  explorerAccountUrl,
  unixToDate,
} from "@/lib/utils";

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = Number(params.id);

  const { data: campaign, isLoading: isCampaignLoading, error: campaignError } = useCampaign(campaignId);
  const { data: donations, isLoading: isDonationsLoading } = useDonations(campaignId);
  const { mutate: withdraw, isPending: isWithdrawing } = useWithdraw(campaignId);
  const { address, isConnected } = useWalletStore();
  const { connect } = useWallet();

  const [copiedCreator, setCopiedCreator] = useState(false);

  const handleCopyCreator = async () => {
    if (!campaign) return;
    const ok = await copyToClipboard(campaign.creator);
    if (ok) {
      setCopiedCreator(true);
      setTimeout(() => setCopiedCreator(false), 2000);
    }
  };

  if (isCampaignLoading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="skeleton h-6 w-24" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 space-y-4">
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
            <div className="glass-card p-6 space-y-4">
              <div className="skeleton h-6 w-32" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="glass-card p-6 h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (campaignError || !campaign) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Grant Program Not Found</h2>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t retrieve the details for Grant Program #{campaignId}. It might not exist, or there might be a network issue.
          </p>
        </div>
        <Link href="/campaigns" className="btn-ghost inline-flex justify-center">
          <ChevronLeft className="w-4 h-4" />
          Back to Grant Programs
        </Link>
      </div>
    );
  }

  const isCreator = address && address.toLowerCase() === campaign.creator.toLowerCase();
  const canWithdraw = campaign.status === "Successful" && isCreator;
  const isExpired = campaign.status === "Expired";
  const isSuccessful = campaign.status === "Successful";
  const isWithdrawn = campaign.status === "Withdrawn";

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Grant Programs
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Main Details (Col Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Header Details */}
          <div className="glass-card p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={cn(
                  "badge text-xs",
                  campaign.status === "Active"
                    ? "badge-active"
                    : campaign.status === "Expired"
                    ? "badge-expired"
                    : "badge-success"
                )}
              >
                {campaign.status === "Active" && <span className="dot-active" />}
                {campaign.status === "Withdrawn" ? "Claimed" : campaign.status === "Active" ? "Open" : campaign.status}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Grant #{campaign.id}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black leading-tight">
              {campaign.title}
            </h1>

            <p className="text-foreground/90 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
              {campaign.description}
            </p>

            {/* Progress Section */}
            <div className="space-y-3 pt-4 border-t border-white/[0.05]">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black gradient-text">
                    {formatXlm(campaign.raised, 0)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    funded of {formatXlm(campaign.goal, 0)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {campaign.progressPercent.toFixed(1)}%
                </span>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, campaign.progressPercent)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {donations?.length || 0} Funders
                </span>
                {campaign.status === "Active" && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Closed: {campaign.deadline.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })} ({formatDeadline(campaign.deadline)})
                  </span>
                )}
              </div>
            </div>

            {/* Creator info box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stellar-gradient flex items-center justify-center opacity-85">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Grant Publisher</p>
                  <p className="font-mono text-foreground/90 mt-0.5 max-w-[200px] sm:max-w-none truncate">
                    {campaign.creator}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={handleCopyCreator}
                  className="btn-ghost px-2.5 py-1.5 text-[11px] font-semibold"
                >
                  {copiedCreator ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
                <a
                  href={explorerAccountUrl(campaign.creator)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost px-2.5 py-1.5 text-[11px] font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Explorer</span>
                </a>
              </div>
            </div>

            {/* Creator administration section */}
            {canWithdraw && (
              <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-primary">Publisher Panel</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Funding goal achieved! Claim {formatXlm(campaign.raised)} to your wallet.
                  </p>
                </div>
                <button
                  id="withdraw-funds-btn"
                  onClick={() => withdraw()}
                  disabled={isWithdrawing}
                  className="btn-stellar w-full sm:w-auto"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                      <span>Claiming...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 relative z-10" />
                      <span>Claim {formatXlm(campaign.raised, 0)}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Backers / Donation History */}
          <div className="glass-card p-6 md:p-8 space-y-4">
            <h3 className="font-bold text-lg">Funding History</h3>

            {!donations || donations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No contributions yet. Be the first to fund this grant program!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto pr-2">
                {donations.map((donation, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <a
                        href={explorerAccountUrl(donation.donor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-foreground/90 hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        {shortAddress(donation.donor, 6)}
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {donation.timestamp.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        {donation.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-foreground">
                      +{formatXlm(donation.amount, 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel (Col Span 1) */}
        <div className="space-y-6">
          {/* Donation Form widget */}
          <DonationForm campaign={campaign} />

          {/* Stellar Trust Banner */}
          <div className="glass-card p-5 space-y-3.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Secure Smart Contract</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This grant program is managed by a Soroban smart contract on the Stellar blockchain. 
                Your XLM is locked securely in the contract and cannot be accessed by anyone 
                unless the goal is reached.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
