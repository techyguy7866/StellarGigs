"use client";

import { EventFeed } from "@/components/activity/EventFeed";

export default function ActivityPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">On-Chain Activity</h1>
        <p className="text-muted-foreground mt-1">
          Monitor real-time events and escrow operations from the StellarGigs smart contract on Stellar Testnet
        </p>
      </div>

      <div className="glass-card p-6">
        <EventFeed showHeader={true} />
      </div>
    </div>
  );
}
