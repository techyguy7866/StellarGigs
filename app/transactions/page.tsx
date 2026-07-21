"use client";

import { useTransactionStore } from "@/store/transaction-store";
import {
  FileCode,
  ArrowUpRight,
  Heart,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Trash2,
  Award,
  Shield,
  Activity,
} from "lucide-react";
import { cn, formatXlm, explorerTxUrl } from "@/lib/utils";

const TYPE_CONFIG = {
  create_campaign: {
    icon: Award,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
    label: "Create Grant Program",
  },
  donate: {
    icon: Heart,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    label: "Grant Funded",
  },
  withdraw: {
    icon: ArrowUpRight,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    label: "Funds Claimed",
  },
  refund: {
    icon: RotateCcw,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    label: "Refund Claimed",
  },
  initialize: {
    icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    label: "Initialize Contract",
  },
};

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "text-amber-400",
    className: "badge-pending",
  },
  success: {
    icon: CheckCircle,
    color: "text-emerald-400",
    className: "badge-success",
  },
  failed: {
    icon: AlertTriangle,
    color: "text-destructive",
    className: "badge-error",
  },
};

export default function TransactionsPage() {
  const { transactions, clearAll, removeTransaction } = useTransactionStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-sans">Transaction History</h1>
          <p className="text-muted-foreground mt-1">
            Track your Soroban smart contract submissions and their status on the Stellar network
          </p>
        </div>

        {transactions.length > 0 && (
          <button
            onClick={clearAll}
            className="btn-ghost text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 border-white/5 py-2 px-3.5"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>

      {/* List */}
      {transactions.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.05] mx-auto flex items-center justify-center">
            <Activity className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No Transactions Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Transactions performed on this device will be logged here in real time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const typeConfig = TYPE_CONFIG[tx.type] || {
              icon: FileCode,
              color: "text-muted-foreground",
              bg: "bg-muted/10 border-muted/20",
              label: tx.type,
            };
            const statusConfig = STATUS_CONFIG[tx.status];
            const Icon = typeConfig.icon;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={tx.id}
                className="glass-card p-5 flex items-start gap-4 hover:translate-y-0 hover:scale-100"
              >
                {/* Type Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0",
                    typeConfig.bg
                  )}
                >
                  <Icon className={cn("w-5 h-5", typeConfig.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-foreground/90">
                        {typeConfig.label}
                      </h3>
                      <p className="text-sm text-foreground mt-1">
                        {tx.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                      <span className={cn("badge text-xs", statusConfig.className)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-white/[0.04]">
                    <span>
                      {tx.timestamp.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      {tx.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {tx.amount !== undefined && (
                      <span className={cn("font-semibold", typeConfig.color)}>
                        Amount: {formatXlm(tx.amount)}
                      </span>
                    )}

                    {tx.campaignId && (
                      <span>Campaign #{tx.campaignId}</span>
                    )}

                    {tx.hash ? (
                      <a
                        href={explorerTxUrl(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-mono ml-auto"
                      >
                        Tx: {tx.hash.slice(0, 12)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="italic ml-auto">Simulated/Pending sign</span>
                    )}
                  </div>

                  {/* Error display */}
                  {tx.error && (
                    <div className="mt-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-1.5 leading-relaxed">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{tx.error}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
