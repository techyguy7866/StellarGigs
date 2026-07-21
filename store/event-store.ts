import { create } from "zustand";
import type { ContractEvent } from "@/types";
import { MAX_EVENTS_IN_FEED } from "@/lib/stellar/config";

// ──────────────────────────────────────────────────────────────────────────────
// Event Store
// ──────────────────────────────────────────────────────────────────────────────

interface EventStore {
  events: ContractEvent[];
  lastPollTime: number | null;
  isPolling: boolean;

  // Actions
  addEvents: (events: ContractEvent[]) => void;
  setPolling: (isPolling: boolean) => void;
  setLastPollTime: (time: number) => void;
  clearEvents: () => void;

  // Selectors
  getEventsByType: (type: ContractEvent["type"]) => ContractEvent[];
  getRecentEvents: (limit?: number) => ContractEvent[];
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  lastPollTime: null,
  isPolling: false,

  addEvents: (newEvents) => {
    if (newEvents.length === 0) return;

    set((state) => {
      const existingIds = new Set(state.events.map((e) => e.id));
      const unique = newEvents.filter((e) => !existingIds.has(e.id));

      if (unique.length === 0) return state;

      const combined = [...unique, ...state.events].slice(0, MAX_EVENTS_IN_FEED);
      return { events: combined };
    });
  },

  setPolling: (isPolling) => set({ isPolling }),

  setLastPollTime: (time) => set({ lastPollTime: time }),

  clearEvents: () => set({ events: [] }),

  getEventsByType: (type) =>
    get().events.filter((e) => e.type === type),

  getRecentEvents: (limit = 20) => get().events.slice(0, limit),
}));
