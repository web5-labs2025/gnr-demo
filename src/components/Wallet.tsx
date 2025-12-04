import React, { useState } from "react";
import { ethers } from "ethers";
import { Button, Typography } from "antd";

export default function Wallet({ onConnected }: { onConnected: (p: ethers.BrowserProvider, s: ethers.Signer, a: string) => void }) {
  const [addr, setAddr] = useState("");
  async function connect() {
    const anyWindow = window as any;
    if (!anyWindow.ethereum) return;
    const provider = new ethers.BrowserProvider(anyWindow.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const a = await signer.getAddress();
    setAddr(a);
    onConnected(provider, signer, a);
  }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Button type="primary" onClick={connect}>连接钱包</Button>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{addr ? `已连接: ${addr}` : "未连接"}</Typography.Text>
    </div>
  );
}