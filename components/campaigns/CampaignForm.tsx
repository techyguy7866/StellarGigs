"use client";

import { useState } from "react";
import { X, Briefcase, Calendar, Target, FileText, Loader2, AlertCircle } from "lucide-react";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { useWalletStore } from "@/store/wallet-store";
import { cn } from "@/lib/utils";
import type { CreateCampaignParams } from "@/types";

interface GigFormProps {
  onClose: () => void;
}

export function CampaignForm({ onClose }: GigFormProps) {
  const { isConnected } = useWalletStore();
  const { mutate: createCampaign, isPending, error } = useCreateCampaign();

  const [form, setForm] = useState<CreateCampaignParams>({
    title: "",
    description: "",
    goal: 100,
    durationDays: 30,
  });

  const [formErrors, setFormErrors] = useState<Partial<CreateCampaignParams>>({});

  const validate = () => {
    const errors: Partial<CreateCampaignParams> = {};
    if (!form.title.trim()) errors.title = "Title is required" as unknown as string;
    if (form.title.length > 100) errors.title = "Max 100 characters" as unknown as string;
    if (!form.description.trim()) errors.description = "Description is required" as unknown as string;
    if (form.description.length > 500) errors.description = "Max 500 characters" as unknown as string;
    if (form.goal < 1) errors.goal = 1;
    if (form.durationDays < 1 || form.durationDays > 365) errors.durationDays = 30;
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    createCampaign(form, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        id="create-gig-modal"
        className="relative w-full max-w-lg glass-card animate-fade-in"
        style={{ transform: "none" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stellar-gradient flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Post a Freelance Gig</h2>
              <p className="text-xs text-muted-foreground">Create a new milestone-based escrow project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* GIG Token Info Banner */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2.5 text-xs text-primary">
          <Briefcase className="w-4 h-4 flex-shrink-0" />
          <span>Posters & Applicants receive <strong>1 GIG Token</strong> per 1 XLM escrowed upon completion.</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="campaign-title" className="text-sm font-medium text-foreground/90">
              Gig Title *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="campaign-title"
                type="text"
                placeholder="e.g. Build a Stellar DeFi Dashboard with Soroban escrow"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={cn(
                  "input-stellar pl-10",
                  formErrors.title && "border-destructive/60"
                )}
                maxLength={100}
              />
            </div>
            {formErrors.title && (
              <p className="text-xs text-destructive">{String(formErrors.title)}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {form.title.length}/100
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="campaign-desc" className="text-sm font-medium text-foreground/90">
              Deliverables / Description *
            </label>
            <textarea
              id="campaign-desc"
              placeholder="Describe the gig deliverables, milestones, and escrow release criteria..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className={cn(
                "input-stellar resize-none",
                formErrors.description && "border-destructive/60"
              )}
              maxLength={500}
            />
            {formErrors.description && (
              <p className="text-xs text-destructive">{String(formErrors.description)}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {form.description.length}/500
            </p>
          </div>

          {/* Escrow Goal + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="campaign-goal" className="text-sm font-medium text-foreground/90">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Escrow Amount (XLM) *
                </div>
              </label>
              <input
                id="campaign-goal"
                type="number"
                min="1"
                step="1"
                value={form.goal}
                onChange={(e) =>
                  setForm({ ...form, goal: parseFloat(e.target.value) || 0 })
                }
                className={cn(
                  "input-stellar",
                  formErrors.goal && "border-destructive/60"
                )}
              />
              <p className="text-xs text-muted-foreground">
                ≈ ${(form.goal * 0.12).toFixed(0)} USD
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="campaign-duration" className="text-sm font-medium text-foreground/90">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-secondary" />
                  Duration (Days) *
                </div>
              </label>
              <input
                id="campaign-duration"
                type="number"
                min="1"
                max="365"
                value={form.durationDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    durationDays: parseInt(e.target.value) || 30,
                  })
                }
                className={cn(
                  "input-stellar",
                  formErrors.durationDays && "border-destructive/60"
                )}
              />
              <p className="text-xs text-muted-foreground">
                Ends{" "}
                {new Date(
                  Date.now() + form.durationDays * 86400 * 1000
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{String(error)}</p>
            </div>
          )}

          {/* Wallet warning */}
          {!isConnected && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-400">
                Please connect your wallet to post a gig
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              id="submit-gig-btn"
              type="submit"
              disabled={isPending || !isConnected}
              className="btn-stellar flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4 relative z-10" />
                  <span>Post Gig</span>
                </>
              )}
            </button>
          </div>

          {isConnected && (
            <p className="text-xs text-muted-foreground text-center">
              This will submit a transaction on the Stellar Testnet
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
