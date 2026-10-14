// All prices are stored and shown in Sri Lankan rupees (migration 026).

/** "Rs 37,200.00" (pass decimals = 0 for whole-rupee prices: "Rs 37,200"). */
export function formatLKR(n: number | string | null | undefined, decimals = 2): string {
  const value = Number(n ?? 0);
  return `Rs ${(Number.isFinite(value) ? value : 0).toLocaleString('en-LK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
