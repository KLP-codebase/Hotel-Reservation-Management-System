import type { Metadata } from "next";
import SkyNestHomePage from "@/components/marketing/SkyNestHomePage";

export const metadata: Metadata = {
  title: "SkyNest Hotels — Three Branches. One Standard.",
  description:
    "SkyNest Hotels — a luxury hotel chain across Colombo, Kandy, and Galle, Sri Lanka. Discover unhurried hospitality at three iconic destinations.",
};

export default function HomePage() {
  return <SkyNestHomePage />;
}
