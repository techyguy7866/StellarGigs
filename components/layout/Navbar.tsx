"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Award, Bell, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn, shortAddress, explorerTxUrl } from "@/lib/utils";
import { useWalletStore } from "@/store/wallet-store";
import { useTransactionStore } from "@/store/transaction-store";
import { WalletConnect } from "@/components/wallet/WalletConnect";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/campaigns", label: "Freelance Gigs" },
  { href: "/activity", label: "Activity" },
  { href: "/transactions", label: "Transactions" },
];

export function Navbar() {
  const pathname = usePathname();
  const { getPendingTransactions } = useTransactionStore();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const pending = getPendingTransactions();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-black/40 backdrop-blur-xl lg:pl-64">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-screen-2xl mx-auto">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-stellar-gradient flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">StellarGigs</span>
        </Link>

        {/* Desktop: page breadcrumb */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          <span>StellarGigs</span>
          <span className="text-white/20">/</span>
          <span className="text-foreground">
            {NAV_ITEMS.find(
              (item) =>
                item.href === pathname ||
                (item.href !== "/" && pathname.startsWith(item.href))
            )?.label || "Home"}
          </span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-primary/10 border border-primary/20 text-primary normal-case font-mono">
            Soroban v1.0
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Pending transactions indicator */}
          {pending.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <div className="dot-pending" />
              <span className="text-xs text-amber-400 font-medium">
                {pending.length} pending
              </span>
            </div>
          )}

          {/* Wallet connect button */}
          <WalletConnect />

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden btn-ghost p-2"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-white/[0.06] bg-black/60 backdrop-blur-xl">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMobileMenu(false)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
