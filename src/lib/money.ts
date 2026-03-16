export function formatEuro(
  value: number | null | undefined,
  opts?: { withSymbol?: boolean; symbol?: "€"; decimals?: number }
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const decimals = opts?.decimals ?? 2;
  const nf = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  });
  const formatted = nf.format(value);
  if (opts?.withSymbol === false) return formatted;
  const symbol = opts?.symbol ?? "€";
  // Manteniamo il simbolo come prefisso per coerenza con la UI esistente
  return `${symbol} ${formatted}`;
}

