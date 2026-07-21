"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, AlertCircle, Zap } from "lucide-react";
import { useDonate, useRefund } from "@/hooks/useCampaigns";
import { useWalletStore } from "@/store/wallet-store";
import { useWallet } from "@/hooks/useWallet";
import { cn, formatXlm } from "@/lib/utils";
import type { CampaignUI } from "@/types";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

interface EscrowFormProps {
  campaign: CampaignUI;
}

export function DonationForm({ campaign }: EscrowFormProps) {
  const { isConnected } = useWalletStore();
  const { connect } = useWallet();
  const { mutate: donate, isPending: isDonating } = useDonate(campaign.id);
  const { mutate: refund, isPending: isRefunding } = useRefund(campaign.id);

  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState(false);

  const isActive = campaign.status === "Active";
  const isExpired = campaign.status === "Expired";

  const handleDonate = () => {
    if (!amount || amount <= 0) return;
    donate(amount);
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <h3 className="font-bold text-base">
        {isActive ? "Secure Escrow" : isExpired ? "Claim Escrow Refund" : "Gig Details"}
      </h3>

      {/* Active gig escrow form */}
      {isActive && (
        <>
          {/* Quick amounts */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">Quick select escrow amount (XLM)</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  id={`donate-amount-${a}`}
                  onClick={() => {
                    setAmount(a);
                    setCustomAmount(false);
                  }}
                  className={cn(
                    "py-2.5 rounded-lg text-sm font-semibold transition-all",
                    amount === a && !customAmount
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {a} XLM
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Or enter custom amount</p>
            <div className="relative">
              <input
                id="donate-custom-amount"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="0.00"
                value={customAmount ? amount : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmount(val);
                  setCustomAmount(true);
                }}
                onFocus={() => setCustomAmount(true)}
                className="input-stellar pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                XLM
              </span>
            </div>
          </div>

          {/* Summary */}
          {amount > 0 && (
            <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Escrow amount</span>
                <span className="font-semibold gradient-text">{formatXlm(amount)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Network fee</span>
                <span>~0.0001 XLM</span>
              </div>
            </div>
          )}

          {/* Submit */}
          {isConnected ? (
            <button
              id="donate-submit-btn"
              onClick={handleDonate}
              disabled={isDonating || amount <= 0}
              className="btn-stellar w-full justify-center"
            >
              {isDonating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 relative z-10" />
                  <span>Fund Escrow {amount > 0 ? formatXlm(amount) : ""}</span>
                </>
              )}
            </button>
          ) : (
            <button
              id="donate-connect-wallet-btn"
              onClick={connect}
              className="btn-ghost w-full justify-center"
            >
              <Zap className="w-4 h-4 text-secondary" />
              Connect Wallet to Fund Escrow
            </button>
          )}
        </>
      )}

      {/* Expired gig — escrow refund */}
      {isExpired && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">Gig Expired</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                This gig expired without meeting its escrow target. Freelancers can claim a full escrow refund.
              </p>
            </div>
          </div>

          {isConnected ? (
            <button
              id="refund-btn"
              onClick={() => refund()}
              disabled={isRefunding}
              className="w-full py-3 rounded-lg font-semibold text-sm bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              {isRefunding ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Refund...
                </span>
              ) : (
                "Claim Escrow Refund"
              )}
            </button>
          ) : (
            <button
              onClick={connect}
              className="btn-ghost w-full justify-center"
            >
              Connect Wallet to Claim Escrow Refund
            </button>
          )}
        </div>
      )}

      {/* Funded / Paid Out gig */}
      {(campaign.status === "Successful" || campaign.status === "Withdrawn") && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-4 h-4 rounded-full bg-emerald-400 flex-shrink-0 mt-0.5 flex items-center justify-center">
            <span className="text-[8px] font-bold text-emerald-900">✓</span>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">
              {campaign.status === "Withdrawn" ? "Payment Released" : "Gig Fully Funded!"}
            </p>
            <p className="text-xs text-emerald-400/70 mt-0.5">
              {campaign.status === "Withdrawn"
                ? "The client has successfully released payment to the freelancer."
                : "This gig has met its escrow goal. Client can now release payment."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
