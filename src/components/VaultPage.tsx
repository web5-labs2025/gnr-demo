import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Card, Input, Space, Typography, message } from "antd";
import { formatTxUrl } from "../utils/explorer";
import { isAddress, isValidAddress, parseAmount } from "../utils/validate";
import vaultAbi from "../abi/vault.json";

export default function VaultPage({ provider, signer, vaultAddress }: { provider: ethers.BrowserProvider | null; signer: ethers.Signer | null; vaultAddress: string }) {
  const ready = useMemo(() => !!provider && !!signer && isValidAddress(vaultAddress), [provider, signer, vaultAddress]);
  const [balance, setBalance] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [addr, setAddr] = useState<string>("");
  const [has, setHas] = useState<boolean>(false);
  const [distTo, setDistTo] = useState<string>("");
  const [distAmt, setDistAmt] = useState<string>("");
  const [batchTo, setBatchTo] = useState<string>("");
  const [batchAmt, setBatchAmt] = useState<string>("");
  useEffect(() => {
    async function init() {
      if (!ready) return;
      const c = new ethers.Contract(vaultAddress, vaultAbi, signer!);
      const b = await c.balance();
      setBalance(b.toString());
      const r = await c.DISTRIBUTOR_ROLE();
      setRole(r);
    }
    init();
  }, [ready, vaultAddress]);
  async function check() {
    const c = new ethers.Contract(vaultAddress, vaultAbi, signer!);
    const hide = message.loading({ content: "检查中...", duration: 0 });
    try {
      const v = await c.hasRole(role, addr);
      setHas(Boolean(v));
      hide();
      message.success("检查完成");
    } catch (e: any) { hide(); message.error(e?.message || "检查失败"); }
  }
  async function grant() {
    const c = new ethers.Contract(vaultAddress, vaultAbi, signer!);
    const hide = message.loading({ content: "授予中...", duration: 0 });
    try {
      if (!isAddress(addr)) { throw new Error("地址无效"); }
      const tx = await c.grantRole(role, addr);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">授予成功，查看交易</a> : "授予成功");
    } catch (e: any) { hide(); message.error(e?.message || "授予失败"); }
  }
  async function revoke() {
    const c = new ethers.Contract(vaultAddress, vaultAbi, signer!);
    const hide = message.loading({ content: "撤销中...", duration: 0 });
    try {
      if (!isAddress(addr)) { throw new Error("地址无效"); }
      const tx = await c.revokeRole(role, addr);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">撤销成功，查看交易</a> : "撤销成功");
    } catch (e: any) { hide(); message.error(e?.message || "撤销失败"); }
  }
  return (
    <div>
      <Typography.Paragraph type="secondary">金库用于发放奖励；需具备 DISTRIBUTOR_ROLE 才能发放，支持单笔与批量发放。</Typography.Paragraph>
      <Typography.Text>金库余额: {balance || "-"}</Typography.Text>
      <Space style={{ marginTop: 8 }}>
        <Input placeholder="地址" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <Button onClick={check}>检查角色</Button>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{has ? "已拥有 DISTRIBUTOR_ROLE" : "未拥有"}</Typography.Text>
      </Space>
      <Space style={{ marginTop: 8 }}>
        <Button type="primary" onClick={grant}>授予</Button>
        <Button danger onClick={revoke}>撤销</Button>
      </Space>
      {has && (
        <>
          <Space style={{ marginTop: 8 }}>
            <Input placeholder="发放地址" value={distTo} onChange={(e) => setDistTo(e.target.value)} />
            <Input placeholder="发放金额" value={distAmt} onChange={(e) => setDistAmt(e.target.value)} />
            <Button onClick={async () => { const c = new ethers.Contract(vaultAddress, vaultAbi, signer!); const hide = message.loading({ content: "发放中...", duration: 0 }); try { if (!isAddress(distTo)) throw new Error("地址无效"); const a = parseAmount(distAmt); if (!a) throw new Error("金额无效"); const tx = await c.distribute(distTo, a); const r = await tx.wait(); const url = await formatTxUrl(provider, tx.hash); hide(); message.success(url ? <a href={url} target="_blank" rel="noreferrer">发放成功，查看交易</a> : "发放成功"); } catch (e: any) { hide(); message.error(e?.message || "发放失败"); } }}>发放</Button>
          </Space>
          <Space style={{ marginTop: 8 }}>
            <Input placeholder="批量地址,逗号分隔" value={batchTo} onChange={(e) => setBatchTo(e.target.value)} />
            <Input placeholder="批量金额,逗号分隔" value={batchAmt} onChange={(e) => setBatchAmt(e.target.value)} />
            <Button onClick={async () => { const c = new ethers.Contract(vaultAddress, vaultAbi, signer!); const tos = batchTo.split(",").map((x) => x.trim()).filter(Boolean); const amts = batchAmt.split(",").map((x) => x.trim()).filter(Boolean); const hide = message.loading({ content: "批量发放中...", duration: 0 }); try { if (!tos.length || tos.length !== amts.length) throw new Error("数量不一致"); const addrOk = tos.every(isAddress); if (!addrOk) throw new Error("地址无效"); const vals = amts.map((x) => parseAmount(x)); if (vals.some((v) => !v)) throw new Error("金额无效"); const tx = await c.distributeBatch(tos, vals as any); const r = await tx.wait(); const url = await formatTxUrl(provider, tx.hash); hide(); message.success(url ? <a href={url} target="_blank" rel="noreferrer">批量发放成功，查看交易</a> : "批量发放成功"); } catch (e: any) { hide(); message.error(e?.message || "批量发放失败"); } }}>批量发放</Button>
          </Space>
        </>
      )}
    </div>
  );
}