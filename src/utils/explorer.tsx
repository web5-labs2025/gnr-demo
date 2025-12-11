import React from "react";
import { ethers } from "ethers";

export async function formatTxUrl(provider: ethers.BrowserProvider | null, hash: string): Promise<string> {
  try {
    if (!provider) return "";
    const net = await provider.getNetwork();
    const id = Number(net.chainId);
    const base = (
      id === 1 ? "https://etherscan.io" :
      id === 11155111 ? "https://sepolia.etherscan.io" :
      id === 56 ? "https://bscscan.com" :
      id === 97 ? "https://testnet.bscscan.com" :
      id === 137 ? "https://polygonscan.com" :
      id === 80001 ? "https://mumbai.polygonscan.com" :
      id === 8453 ? "https://basescan.org" :
      id === 84532 ? "https://sepolia.basescan.org" :
      id === 42161 ? "https://arbiscan.io" :
      id === 421614 ? "https://sepolia.arbiscan.io" :
      ""
    );
    return base ? `${base}/tx/${hash}` : "";
  } catch { return ""; }
}

export async function networkName(provider: ethers.BrowserProvider | null): Promise<string> {
  try {
    if (!provider) return "";
    const net = await provider.getNetwork();
    const id = Number(net.chainId);
    return (
      id === 1 ? "Ethereum" :
      id === 11155111 ? "Sepolia" :
      id === 56 ? "BSC" :
      id === 97 ? "BSC Testnet" :
      id === 137 ? "Polygon" :
      id === 80001 ? "Mumbai" :
      id === 8453 ? "Base" :
      id === 84532 ? "Base Sepolia" :
      id === 42161 ? "Arbitrum" :
      id === 421614 ? "Arbitrum Sepolia" :
      id === 31337 ? "Hardhat" :
      `Chain ${id}`
    );
  } catch { return ""; }
}

export async function switchNetwork(targetChainId: number): Promise<void> {
  const anyWindow: any = window as any;
  const hexId = "0x" + targetChainId.toString(16);
  const params: Record<number, { chainId: string; chainName: string; nativeCurrency: { name: string; symbol: string; decimals: number }; rpcUrls: string[]; blockExplorerUrls: string[] }> = {
    56: { chainId: "0x38", chainName: "BSC", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://bsc-dataseed.binance.org"], blockExplorerUrls: ["https://bscscan.com"] },
    97: { chainId: "0x61", chainName: "BSC Testnet", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"], blockExplorerUrls: ["https://testnet.bscscan.com"] },
    1: { chainId: "0x1", chainName: "Ethereum", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc.ankr.com/eth"], blockExplorerUrls: ["https://etherscan.io"] },
    11155111: { chainId: "0xaa36a7", chainName: "Sepolia", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc.sepolia.org"], blockExplorerUrls: ["https://sepolia.etherscan.io"] },
    31337: { chainId: "0x7a69", chainName: "Hardhat", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["http://localhost:8545"], blockExplorerUrls: [] }
  };
  try {
    await anyWindow.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (e: any) {
    const conf = params[targetChainId];
    if (conf) {
      await anyWindow.ethereum.request({ method: "wallet_addEthereumChain", params: [conf] });
      await anyWindow.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: conf.chainId }] });
    } else {
      throw e;
    }
  }
}