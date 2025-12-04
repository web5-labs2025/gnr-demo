export function formatAmount(value, decimals) {
    const neg = value < 0n;
    const v = neg ? -value : value;
    const base = 10n ** BigInt(decimals);
    const int = v / base;
    const frac = v % base;
    const fracStr = decimals > 0 ? frac.toString().padStart(decimals, "0").replace(/0+$/, "") : "";
    const intStr = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const s = fracStr ? `${intStr}.${fracStr}` : intStr;
    return neg ? `-${s}` : s;
}
