import type { Metadata } from "next";
import { Inter, Outfit, Fraunces, Plus_Jakarta_Sans } from "next/font/google";
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

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500", "600", "700", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
});

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${fraunces.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
