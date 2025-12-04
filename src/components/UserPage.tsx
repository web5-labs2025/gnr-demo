import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Card, Input, Space, message, Typography, Divider, Tag } from "antd";
import saleAbi from "../abi/sale.json";
import erc20Abi from "../abi/erc20.json";
import { formatTxUrl } from "../utils/explorer";
import { exportCsv } from "../utils/csv";
import { parseAmount, parseUint, isValidAddress } from "../utils/validate";
import { formatAmount } from "../utils/format";

export default function UserPage({ provider, signer, address, saleAddress, gnrAddress, usdtAddress }: { provider: ethers.BrowserProvider | null; signer: ethers.Signer | null; address: string; saleAddress: string; gnrAddress: string; usdtAddress: string }) {
  const [buyAmt, setBuyAmt] = useState<string>("");
  const [stakeAmt, setStakeAmt] = useState<string>("");
  const [stakeMonths, setStakeMonths] = useState<string>("3");
  const [userClaimEnabled, setUserClaimEnabled] = useState<boolean>(false);
  const [stakes, setStakes] = useState<any[]>([]);
  const [gnrBal, setGnrBal] = useState<string>("");
  const [usdtBal, setUsdtBal] = useState<string>("");
  const [gnrDec, setGnrDec] = useState<number>(18);
  const [usdtDec, setUsdtDec] = useState<number>(6);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const ready = useMemo(() => !!provider && !!signer && !!address && !!saleAddress && !!gnrAddress && !!usdtAddress, [provider, signer, address, saleAddress, gnrAddress, usdtAddress]);
  useEffect(() => {
    async function init() {
      if (!ready) return;
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const u = await sale.userClaimEnabled();
      setUserClaimEnabled(Boolean(u));
      const res = await sale.listUserStakes(address, 0, 100);
      const n = Number(res[0]);
      const items = [] as any[];
      for (let i = 0; i < n && i < res[1].length; i++) {
        items.push({ id: res[1][i], amount: res[2][i], months: res[3][i], start: res[4][i], end: res[5][i], active: res[6][i], earlyExit: res[7][i], claimable: res[8][i] });
      }
      setStakes(items);
      const erc = new ethers.Contract(gnrAddress, erc20Abi, signer!);
      const decG = await erc.decimals();
      setGnrDec(Number(decG));
      const balG = await erc.balanceOf(address);
      setGnrBal(formatAmount(balG, Number(decG)));
      const ercU = new ethers.Contract(usdtAddress, erc20Abi, signer!);
      const decU = await ercU.decimals();
      setUsdtDec(Number(decU));
      const balU = await ercU.balanceOf(address);
      setUsdtBal(formatAmount(balU, Number(decU)));
    }
    init();
  }, [ready, address, saleAddress]);
  async function approveErc20(token: string, spender: string, amount: bigint) {
    if (!isValidAddress(token) || !isValidAddress(spender)) { message.error("地址未配置或无效"); throw new Error("invalid address"); }
    const c = new ethers.Contract(token, erc20Abi, signer!);
    const hide = message.loading({ content: "授权中...", duration: 0 });
    try {
      const tx = await c.approve(spender, amount);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">授权成功，查看交易</a> : "授权成功");
    } catch (e: any) {
      message.error(e?.message || "授权失败");
      throw e;
    } finally { hide(); }
  }
  async function onBuy() {
    if (!ready || !buyAmt) { message.warning("请连接钱包并输入金额"); return; }
    if (!isValidAddress(usdtAddress) || !isValidAddress(saleAddress)) { message.error("地址未配置或无效"); return; }
    const amt = parseAmount(buyAmt);
    if (!amt) { message.error("金额无效"); return; }
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const sa = await sale.saleActive(); if (!sa) { message.error("购买未开启"); return; }
      const ke = await sale.kycEnabled(); if (ke) { const wl = await sale.whitelist(address); if (!wl) { message.error("需在白名单后才能购买"); return; } }
      const bl = await sale.blacklist(address); if (bl) { message.error("黑名单用户不可购买"); return; }
      const ercU = new ethers.Contract(usdtAddress, erc20Abi, signer!);
      const balU = await ercU.balanceOf(address); if (balU < amt) { message.error("USDT 余额不足"); return; }
      const gnrDecNow = gnrDec; const usdtDecNow = usdtDec; if (gnrDecNow < usdtDecNow) { message.error("代币精度异常"); return; }
      const factor = 10n ** BigInt(gnrDecNow - usdtDecNow);
      const needGnr = amt * factor;
      const inv = await sale.remainingInventory(); if (inv < needGnr) { message.error("库存 GNR 不足"); return; }
      await approveErc20(usdtAddress, saleAddress, amt);
      const hide = message.loading({ content: "购买中...", duration: 0 });
      const tx = await sale.buy(amt);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">购买成功，查看交易</a> : "购买成功");
    } catch (e: any) { message.error(e?.message || "购买失败"); }
  }
  async function onStake() {
    if (!ready || !stakeAmt) { message.warning("请连接钱包并输入金额"); return; }
    if (!isValidAddress(gnrAddress) || !isValidAddress(saleAddress)) { message.error("地址未配置或无效"); return; }
    const amt = parseAmount(stakeAmt);
    const months = parseUint(stakeMonths);
    if (!amt || !months || months <= 0) { message.error("输入无效"); return; }
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const c = await sale.cycleParams(months); if (!Boolean(c.allowed)) { message.error("该质押周期未开放"); return; }
      const ke = await sale.kycEnabled(); if (ke) { const wl = await sale.whitelist(address); if (!wl) { message.error("需在白名单后才能质押"); return; } }
      const bl = await sale.blacklist(address); if (bl) { message.error("黑名单用户不可质押"); return; }
      await approveErc20(gnrAddress, saleAddress, amt);
      const hide = message.loading({ content: "质押中...", duration: 0 });
      const tx = await sale.stake(amt, months);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">质押成功，查看交易</a> : "质押成功");
    } catch (e: any) { message.error(e?.message || "质押失败"); }
  }
  async function onWithdraw(id: bigint) {
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const hide = message.loading({ content: "提现中...", duration: 0 });
      const tx = await sale.withdrawMature(id);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">提现成功，查看交易</a> : "提现成功");
    } catch (e: any) { message.error(e?.message || "提现失败"); }
  }
  async function onEarlyExit(id: bigint) {
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const hide = message.loading({ content: "早退中...", duration: 0 });
      const tx = await sale.earlyExit(id);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">早退成功，查看交易</a> : "早退成功");
    } catch (e: any) { message.error(e?.message || "早退失败"); }
  }
  async function onClaim(id: bigint) {
    if (!userClaimEnabled) return;
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const hide = message.loading({ content: "领取中...", duration: 0 });
      const tx = await sale.userClaimRewards(id);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">领取成功，查看交易</a> : "领取成功");
    } catch (e: any) { message.error(e?.message || "领取失败"); }
  }
  return (
    <div>
      <Typography.Paragraph type="secondary">购买用 USDT 兑换 GNR；质押后可在到期提现或选择早退；领取利息需管理员开启用户领息开关。</Typography.Paragraph>
      <Typography.Paragraph>我的余额 GNR: {gnrBal || "-"} ｜ USDT: {usdtBal || "-"}</Typography.Paragraph>
      <Divider />
      <Space>
        <Input placeholder="USDT 数量" value={buyAmt} onChange={(e) => setBuyAmt(e.target.value)} />
        <Button type="primary" onClick={onBuy}>购买</Button>
      </Space>
      <Space wrap style={{ marginTop: 8 }}>
        <Tag color="blue">选择周期并输入金额进行质押</Tag>
        <Input placeholder="GNR 数量" value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} />
        <Input placeholder="质押月数" value={stakeMonths} onChange={(e) => setStakeMonths(e.target.value)} />
        <Button type="primary" onClick={onStake}>质押</Button>
      </Space>
      <div style={{ marginTop: 12 }}>
        <Button onClick={() => {
          const rows = [["id", "amount", "months", "start", "end", "active", "earlyExit", "claimable"], ...stakes.map((s) => [s.id.toString(), s.amount.toString(), s.months.toString(), s.start.toString(), s.end.toString(), s.active ? "true" : "false", s.earlyExit ? "true" : "false", s.claimable.toString()])];
          exportCsv(`user-${address}.csv`, rows);
        }}>导出我的质押</Button>
        {stakes.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map((s) => (
          <Card key={s.id.toString()} size="small" style={{ marginBottom: 8 }}>
            <div>编号 {s.id.toString()} 金额 {formatAmount(BigInt(s.amount.toString()), gnrDec)} 月数 {s.months.toString()}</div>
            <div>到期 {s.end.toString()} 活跃 {s.active ? "是" : "否"} 早退 {s.earlyExit ? "是" : "否"}</div>
            <div>可领利息 {formatAmount(BigInt(s.claimable.toString()), gnrDec)}</div>
            <Space style={{ marginTop: 4 }}>
              <Button onClick={() => onWithdraw(s.id)}>到期提现</Button>
              <Button onClick={() => onEarlyExit(s.id)}>早退</Button>
              <Button disabled={!userClaimEnabled} onClick={() => onClaim(s.id)}>领取利息</Button>
            </Space>
          </Card>
        ))}
        <Space style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">第 {page} 页 / 共 {Math.max(1, Math.ceil(stakes.length / pageSize))} 页</Typography.Text>
          <Button onClick={() => setPage(Math.max(1, page - 1))}>上一页</Button>
          <Button onClick={() => setPage(Math.min(Math.ceil(stakes.length / pageSize) || 1, page + 1))}>下一页</Button>
        </Space>
      </div>
    </div>
  );
}