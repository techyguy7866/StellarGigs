import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StellarGigs | Freelance Escrow Marketplace",
  description:
    "Decentralized freelance marketplace with milestone-based escrow on the Stellar blockchain. Transparent, fast, and low-cost payments powered by Soroban smart contracts.",
  keywords: [
    "Stellar",
    "Soroban",
    "freelance",
    "escrow",
    "gig marketplace",
    "reputation",
    "GIG token",
    "blockchain",
    "DApp",
    "XLM",
    "smart contracts",
  ],
  openGraph: {
    title: "StellarGigs",
    description: "Decentralized freelance escrow marketplace on Stellar Testnet",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {/* Sidebar */}
          <Sidebar />

          {/* Main content area */}
          <div className="lg:pl-64 min-h-screen flex flex-col bg-gradient-to-b from-black/40 via-black/20 to-black/40">
            {/* Navbar */}
            <Navbar />

            {/* Page content */}
            <main className="flex-1 px-4 md:px-8 py-8 max-w-screen-2xl mx-auto w-full">
              {children}
            </main>
          </div>

          {/* Toast notifications */}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            theme="dark"
            toastOptions={{
              style: {
                background: "hsl(234, 22%, 10%)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "hsl(210, 40%, 98%)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
