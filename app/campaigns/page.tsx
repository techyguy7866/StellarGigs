"use client";

import { useState } from "react";
import { Plus, Search, Filter, Rocket, Info, Briefcase } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignCard, CampaignCardSkeleton } from "@/components/campaigns/CampaignCard";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { useWalletStore } from "@/store/wallet-store";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/types";

export default function CampaignsPage() {
  const { data: campaigns, isLoading, error } = useCampaigns();
  const { isConnected } = useWalletStore();
  const { connect } = useWallet();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "All">("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter campaigns
  const filteredCampaigns = campaigns?.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.creator.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Freelance Gigs</h1>
          <p className="text-muted-foreground mt-1">
            Discover and escrow milestone freelance projects on Stellar
          </p>
        </div>

        {isConnected ? (
          <button
            id="launch-campaign-modal-btn"
            onClick={() => setIsCreateOpen(true)}
            className="btn-stellar"
          >
            <Plus className="w-4 h-4 relative z-10" />
            <span>Post a Gig</span>
          </button>
        ) : (
          <button
            id="connect-to-launch-btn"
            onClick={connect}
            className="btn-ghost"
          >
            Connect Wallet to Post
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            id="campaign-search-input"
            type="text"
            placeholder="Search gigs by title, deliverables, or client address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-stellar pl-10.5 py-2.5"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["All", "Active", "Successful", "Expired", "Withdrawn"] as const).map((status) => (
            <button
              key={status}
              id={`filter-btn-${status.toLowerCase()}`}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
                statusFilter === status
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              {status === "Withdrawn"
                ? "Paid Out"
                : status === "Active"
                ? "Open"
                : status === "Expired"
                ? "Expired / Closed"
                : status === "Successful"
                ? "Locked / Funded"
                : status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 mx-auto flex items-center justify-center">
            <Info className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">Failed to Load Freelance Gigs</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              There was an issue communicating with the Stellar network. Please check your network connection or try again later.
            </p>
          </div>
        </div>
      ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] mx-auto flex items-center justify-center">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No Freelance Gigs Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              We couldn&apos;t find any gigs matching your filters. Try adjusting your search query or posting a new gig.
            </p>
          </div>
        </div>
      )}

      {/* Create campaign modal */}
      {isCreateOpen && (
        <CampaignForm onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
}
