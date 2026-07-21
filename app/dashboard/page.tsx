"use client";

import { useEffect } from "react";
import {
  Wallet,
  Copy,
  ExternalLink,
  RefreshCw,
  Check,
  Network,
  Loader2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Coins,
} from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import {
  copyToClipboard,
  explorerAccountUrl,
  shortAddress,
  formatXlm,
} from "@/lib/utils";
import { STELLAR_CONFIG, DEPLOYER_ADDRESS } from "@/lib/stellar/config";
import { useTransactionStore } from "@/store/transaction-store";
import { explorerTxUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Helper: format GRNT (stroops → GRNT) ─────────────────────────────────────
function formatGrnt(stroops: number | null): string {
  if (stroops === null) return "—";
  return (stroops / 10_000_000).toFixed(2);
}

export default function DashboardPage() {
  const {
    isConnected,
    address,
    balance,
    rewardBalance,
    network,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshBalance,
  } = useWallet();

  const { getRecentTransactions } = useTransactionStore();
  const recentTxs = getRecentTransactions(5);

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Wallet Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your Stellar wallet connection and view account details
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-destructive">
              Connection Error
            </p>
            <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!isConnected ? (
        /* ── Not connected ── */
        <div className="glass-card p-12 flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-stellar-gradient flex items-center justify-center animate-glow-pulse">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Connect Your Wallet</h2>
            <p className="text-muted-foreground max-w-sm">
              Connect a Stellar wallet to view your balance, create grant programs,
              and contribute to projects on the Stellar Testnet.
            </p>
          </div>
          <button
            id="dashboard-connect-btn"
            onClick={connect}
            disabled={isConnecting}
            className="btn-stellar px-8 py-3 text-base"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5 relative z-10" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Supports Freighter, XBULL, Albedo, and more
          </p>
        </div>
      ) : (
        /* ── Connected ── */
        <div className="space-y-4">
          {/* Main wallet card */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-stellar-gradient flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold">Connected Wallet</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="dot-active" />
                    <span className="text-xs text-muted-foreground capitalize">
                      {network || "testnet"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                id="dashboard-disconnect-btn"
                onClick={disconnect}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
              >
                Disconnect
              </button>
            </div>

            {/* Address */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Stellar Address
              </p>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/40 border border-white/[0.06]">
                <span
                  id="wallet-address-display"
                  className="font-mono text-sm text-foreground/90 flex-1 break-all"
                >
                  {address}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    id="copy-address-btn"
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors"
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <a
                    id="explorer-link"
                    href={explorerAccountUrl(address!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors"
                    aria-label="View on explorer"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Balance grid: XLM + CRWD Reward + Network Info */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* XLM Balance */}
            <div className="glass-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  XLM Balance
                </p>
                <button
                  id="refresh-balance-btn"
                  onClick={handleRefreshBalance}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                  aria-label="Refresh balance"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 text-muted-foreground",
                      isRefreshing && "animate-spin"
                    )}
                  />
                </button>
              </div>
              <p className="text-4xl font-black gradient-text">
                {balance ? parseFloat(balance).toFixed(4) : "—"}
              </p>
              <p className="text-sm text-muted-foreground">XLM</p>
            </div>

            {/* GRNT Reward Token Balance ── New inter-contract feature */}
            <div className="glass-card p-6 space-y-3 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-yellow-500/5 pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <p className="text-sm font-medium text-muted-foreground">
                  GRNT Rewards
                </p>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/10 border border-secondary/20">
                  <Sparkles className="w-3 h-3 text-secondary animate-pulse" />
                  <span className="text-[10px] text-secondary font-semibold">Earned</span>
                </div>
              </div>
              <p className="text-4xl font-black relative"
                style={{ background: "linear-gradient(135deg, hsl(243,75%,70%), hsl(43,96%,65%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {formatGrnt(rewardBalance)}
              </p>
              <p className="text-xs text-muted-foreground relative leading-relaxed">
                GRNT — earned via grant contributions.<br />
                <span className="text-secondary font-medium">1 GRNT = 1 XLM contributed</span>
              </p>
            </div>

            {/* Network Info */}
            <div className="glass-card p-6 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Network Info
              </p>
              <div className="space-y-2">
                {[
                  { label: "Network", value: "Stellar Testnet" },
                  { label: "Contract", value: shortAddress(STELLAR_CONFIG.contractId || "Not deployed", 6) },
                  { label: "RPC", value: "soroban-testnet.stellar.org" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-foreground/80">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold">Recent Transactions</h3>

            {recentTxs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No transactions yet. Create a grant program or make a contribution to
                  get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          tx.status === "success"
                            ? "bg-emerald-400"
                            : tx.status === "pending"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-red-400"
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          tx.status === "success"
                            ? "text-emerald-400"
                            : tx.status === "pending"
                            ? "text-amber-400"
                            : "text-red-400"
                        )}
                      >
                        {tx.status}
                      </span>
                      {tx.hash && (
                        <a
                          href={explorerTxUrl(tx.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
