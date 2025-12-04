import { ethers } from "ethers";

export function isAddress(addr: string): boolean {
  try { ethers.getAddress(addr); return true; } catch { return false; }
}

export function isZeroAddress(addr: string): boolean {
  return addr?.toLowerCase() === "0x0000000000000000000000000000000000000000";
}

export function isValidAddress(addr: string): boolean {
  return isAddress(addr) && !isZeroAddress(addr);
}

export function parseAmount(s: string): bigint | null {
  try { const v = BigInt(s); return v > 0n ? v : null; } catch { return null; }
}

export function parseUint(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}