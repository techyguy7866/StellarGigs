import { create } from "zustand";
import type { Transaction, TransactionStatus, TransactionType } from "@/types";
import { generateId } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Transaction Store
// ──────────────────────────────────────────────────────────────────────────────

interface TransactionStore {
  transactions: Transaction[];

  // Actions
  addTransaction: (tx: Omit<Transaction, "id" | "timestamp">) => string;
  updateTransaction: (
    id: string,
    updates: Partial<Pick<Transaction, "status" | "hash" | "error">>
  ) => void;
  removeTransaction: (id: string) => void;
  clearAll: () => void;

  // Selectors
  getPendingTransactions: () => Transaction[];
  getRecentTransactions: (limit?: number) => Transaction[];
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],

  addTransaction: (tx) => {
    const id = generateId();
    const transaction: Transaction = {
      ...tx,
      id,
      timestamp: new Date(),
    };

    set((state) => ({
      transactions: [transaction, ...state.transactions].slice(0, 100), // Keep max 100
    }));

    return id;
  },

  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates } : tx
      ),
    })),

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== id),
    })),

  clearAll: () => set({ transactions: [] }),

  getPendingTransactions: () =>
    get().transactions.filter((tx) => tx.status === "pending"),

  getRecentTransactions: (limit = 20) =>
    get().transactions.slice(0, limit),
}));
