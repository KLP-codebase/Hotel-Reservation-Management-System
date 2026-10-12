import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Cinzel } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/layout/Providers";
import { SkyNestConcierge } from "@/components/ui/SkyNestConcierge";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "SkyNest Hotels — Three Branches. One Standard.",
    template: "%s | SkyNest Hotels",
  },
  description:
    "SkyNest Hotels — a luxury hotel chain across Colombo, Kandy, and Galle, Sri Lanka. Discover unhurried hospitality at three iconic destinations.",
  keywords: ["luxury hotel", "Sri Lanka", "Colombo", "Kandy", "Galle", "hotel booking", "SkyNest"],
  authors: [{ name: "SkyNest Hotels" }],
  robots: "index, follow",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}<SkyNestConcierge /></Providers>
      </body>
    </html>
  );
}
