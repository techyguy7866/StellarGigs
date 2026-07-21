"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";

// ──────────────────────────────────────────────────────────────────────────────
// Query Client
// ──────────────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// ──────────────────────────────────────────────────────────────────────────────
// Wallet Restorer
// ──────────────────────────────────────────────────────────────────────────────

function WalletRestorer() {
  const { restoreWallet } = useWallet();

  useEffect(() => {
    // Try to restore wallet session on mount
    restoreWallet();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Root Provider
// ──────────────────────────────────────────────────────────────────────────────

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <WalletRestorer />
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
