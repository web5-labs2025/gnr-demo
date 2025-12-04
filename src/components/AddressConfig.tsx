import React from "react";
import { Input, Space } from "antd";

export default function AddressConfig({ saleAddress, vaultAddress, gnrAddress, usdtAddress, onChange }: { saleAddress: string; vaultAddress: string; gnrAddress: string; usdtAddress: string; onChange: (k: "sale" | "vault" | "gnr" | "usdt", v: string) => void }) {
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Input addonBefore="Sale" value={saleAddress} onChange={(e) => onChange("sale", e.target.value)} placeholder="0x..." />
      <Input addonBefore="Vault" value={vaultAddress} onChange={(e) => onChange("vault", e.target.value)} placeholder="0x..." />
      <Input addonBefore="GNR" value={gnrAddress} onChange={(e) => onChange("gnr", e.target.value)} placeholder="0x..." />
      <Input addonBefore="USDT" value={usdtAddress} onChange={(e) => onChange("usdt", e.target.value)} placeholder="0x..." />
    </Space>
  );
}