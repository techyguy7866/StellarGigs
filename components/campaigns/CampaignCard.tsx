"use client";

import { Clock, Target, TrendingUp, ExternalLink, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatXlm, formatDeadline, shortAddress, explorerAccountUrl } from "@/lib/utils";
import type { CampaignUI } from "@/types";

interface CampaignCardProps {
  campaign: CampaignUI;
}

const STATUS_CONFIG = {
  Active: { label: "Open", className: "badge-active", dot: "dot-active" },
  Successful: { label: "Locked / Funded", className: "badge-success", dot: "" },
  Expired: { label: "Expired / Closed", className: "badge-expired", dot: "" },
  Withdrawn: { label: "Paid Out", className: "badge-success", dot: "" },
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[campaign.status];
  const isActive = campaign.status === "Active";

  const handleCardClick = () => {
    router.push(`/campaigns/${campaign.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      id={`gig-card-${campaign.id}`}
      className="glass-card flex flex-col h-full cursor-pointer animate-fade-in"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Header gradient bar */}
      <div
        className="h-1.5 w-full rounded-t-xl"
        style={{
          background:
            campaign.status === "Successful" || campaign.status === "Withdrawn"
              ? "linear-gradient(90deg, hsl(142,70%,45%), hsl(243,75%,59%))"
              : campaign.status === "Expired"
              ? "linear-gradient(90deg, hsl(0,20%,40%), hsl(0,20%,50%))"
              : `linear-gradient(90deg, hsl(243,75%,59%) ${campaign.progressPercent}%, hsl(234,18%,20%) ${campaign.progressPercent}%)`,
        }}
      />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Status + ID */}
        <div className="flex items-center justify-between">
          <span className={cn("badge text-xs", status.className)}>
            {status.dot && <span className={status.dot} />}
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            #{campaign.id}
          </span>
        </div>

        {/* Title + Description */}
        <div className="flex-1">
          <h3 className="font-semibold text-base text-foreground leading-snug mb-2 line-clamp-2">
            {campaign.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold gradient-text">
              {formatXlm(campaign.raised, 0)}
            </span>
            <span className="text-xs text-muted-foreground">
              of {formatXlm(campaign.goal, 0)}
            </span>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, campaign.progressPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{campaign.progressPercent.toFixed(1)}% escrowed</span>
            {isActive && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDeadline(campaign.deadline)}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
          <a
            href={explorerAccountUrl(campaign.creator)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-4 h-4 rounded-full bg-stellar-gradient opacity-70" />
            {shortAddress(campaign.creator, 4)}
          </a>

          <div className="flex items-center gap-1 text-xs text-primary font-medium">
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────────────────────

export function CampaignCardSkeleton() {
  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      <div className="h-1.5 skeleton rounded-none" />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-4 w-8 rounded" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-4 w-full rounded mt-1" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-2 w-full rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-4 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}
