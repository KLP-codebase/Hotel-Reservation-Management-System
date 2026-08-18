import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/layout/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    default: "Hotel RMS — Reservation Management System",
    template: "%s | Hotel RMS",
  },
  description:
    "A modern full-stack hotel reservation and management system built with Next.js App Router.",
  keywords: ["hotel", "reservation", "management", "booking", "hospitality"],
  authors: [{ name: "Hotel RMS Team" }],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
