export function commissionAmounts(amount, shares) {
  const pool = Math.round(Number(amount) * 10) / 100;
  const raw = shares.map((share) => Math.round(pool * Number(share)) / 100);
  const difference = Math.round((pool - raw.reduce((sum, value) => sum + value, 0)) * 100) / 100;
  const order = [0, 1, 2].sort((a, b) => Number(shares[b]) - Number(shares[a]) || a - b);
  raw[order[0]] = Math.round((raw[order[0]] + difference) * 100) / 100;
  return { pool, amounts: raw };
}
