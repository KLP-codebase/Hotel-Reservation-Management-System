import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatLKR } from "./currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return formatLKR(amount);
}
