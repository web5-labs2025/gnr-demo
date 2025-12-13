import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Card, Input, Space, message, Typography, Divider, Tag, Checkbox } from "antd";
import saleAbi from "../abi/sale.json";
import erc20Abi from "../abi/erc20.json";
import { formatTxUrl } from "../utils/explorer";
import { exportCsv } from "../utils/csv";
import { parseAmount, parseUint, isValidAddress } from "../utils/validate";
import { formatAmount } from "../utils/format";

export default function UserPage({ provider, signer, address, saleAddress, gnrAddress, usdtAddress }: { provider: ethers.BrowserProvider | null; signer: ethers.Signer | null; address: string; saleAddress: string; gnrAddress: string; usdtAddress: string }) {
  const [buyAmt, setBuyAmt] = useState<string>("");
  const [stakeAmt, setStakeAmt] = useState<string>("");
  const [faucetUsdtAmt, setFaucetUsdtAmt] = useState<string>("");
  const [faucetGnrAmt, setFaucetGnrAmt] = useState<string>("");
  const [aprBP, setAprBP] = useState<number>(0);
  const [stakes, setStakes] = useState<any[]>([]);
  const [gnrBal, setGnrBal] = useState<string>("");
  const [usdtBal, setUsdtBal] = useState<string>("");
  const [gnrDec, setGnrDec] = useState<number>(18);
  const [usdtDec, setUsdtDec] = useState<number>(6);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [autoStakeAfterBuy, setAutoStakeAfterBuy] = useState<boolean>(false);
  const ready = useMemo(() => !!provider && !!signer && !!address && !!saleAddress && !!gnrAddress && !!usdtAddress, [provider, signer, address, saleAddress, gnrAddress, usdtAddress]);
  useEffect(() => {
    async function init() {
      if (!ready) return;
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const apr = await sale.aprBP();
      setAprBP(Number(apr));
      const res = await sale.listUserStakes(address, 0, 100);
      const n = Number(res[0]);
      const items = [] as any[];
      for (let i = 0; i < n && i < res[1].length; i++) {
        items.push({ id: res[1][i], amount: res[2][i], start: res[3][i], active: res[4][i], claimable: res[5][i] });
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
  async function reload() {
    if (!ready) return;
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const apr = await sale.aprBP(); setAprBP(Number(apr));
      const res = await sale.listUserStakes(address, 0, 100);
      const n = Number(res[0]); const items = [] as any[];
      for (let i = 0; i < n && i < res[1].length; i++) { items.push({ id: res[1][i], amount: res[2][i], start: res[3][i], active: res[4][i], claimable: res[5][i] }); }
      setStakes(items);
      const erc = new ethers.Contract(gnrAddress, erc20Abi, signer!);
      const decG = await erc.decimals(); setGnrDec(Number(decG));
      const balG = await erc.balanceOf(address); setGnrBal(formatAmount(balG, Number(decG)));
      const ercU = new ethers.Contract(usdtAddress, erc20Abi, signer!);
      const decU = await ercU.decimals(); setUsdtDec(Number(decU));
      const balU = await ercU.balanceOf(address); setUsdtBal(formatAmount(balU, Number(decU)));
    } catch {}
  }
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
      if (autoStakeAfterBuy) {
        const hideStake = message.loading({ content: "自动质押中...", duration: 0 });
        try {
          const txStake = await sale.stake(needGnr);
          const rStake = await txStake.wait();
          const urlStake = await formatTxUrl(provider, txStake.hash);
          hideStake();
          message.success(urlStake ? <a href={urlStake} target="_blank" rel="noreferrer">已自动质押，查看交易</a> : "已自动质押");
          await reload();
        } catch (se: any) {
          hideStake();
          message.error(se?.message || "自动质押失败");
        }
      }
    } catch (e: any) { message.error(e?.message || "购买失败"); }
  }
  async function onStake() {
    if (!ready || !stakeAmt) { message.warning("请连接钱包并输入金额"); return; }
    if (!isValidAddress(gnrAddress) || !isValidAddress(saleAddress)) { message.error("地址未配置或无效"); return; }
    const amt = parseAmount(stakeAmt);
    if (!amt) { message.error("输入无效"); return; }
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const ke = await sale.kycEnabled(); if (ke) { const wl = await sale.whitelist(address); if (!wl) { message.error("需在白名单后才能质押"); return; } }
      const bl = await sale.blacklist(address); if (bl) { message.error("黑名单用户不可质押"); return; }
      const hide = message.loading({ content: "质押中...", duration: 0 });
      const tx = await sale.stake(amt);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">质押成功，查看交易</a> : "质押成功");
    } catch (e: any) { message.error(e?.message || "质押失败"); }
  }
  async function onCancel(id: bigint) {
    try {
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const hide = message.loading({ content: "取消中...", duration: 0 });
      const tx = await sale.cancelStake(id);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">已取消质押，查看交易</a> : "已取消质押");
    } catch (e: any) { message.error(e?.message || "取消失败"); }
  }
  async function onFaucetUSDT() {
    if (!ready || !faucetUsdtAmt) { message.warning("请连接钱包并输入USDT最小单位数量（6位精度）"); return; }
    if (!isValidAddress(usdtAddress)) { message.error("USDT地址未配置或无效"); return; }
    const amt = parseAmount(faucetUsdtAmt);
    if (!amt) { message.error("金额无效，示例：1000000=1 USDT"); return; }
    try {
      const balNative = await provider!.getBalance(address);
      if (balNative === 0n) { message.error("当前网络原生币余额不足（需 tBNB 用于 Gas）"); return; }
      const mockUsdtAbi = [{ inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" }];
      const usdt = new ethers.Contract(usdtAddress, mockUsdtAbi, signer!);
      const hide = message.loading({ content: "领取USDT中...", duration: 0 });
      const tx = await usdt.mint(address, amt);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">领取USDT成功，查看交易</a> : "领取USDT成功");
      await reload();
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("Internal JSON-RPC error") || msg.includes("UNKNOWN_ERROR")) { message.error("交易提交失败：请确认 BSC 测试网账户有足够 tBNB 支付 Gas"); return; }
      message.error(e?.message || "领取USDT失败");
    }
  }
  async function onFaucetGNR() {
    if (!ready || !faucetGnrAmt) { message.warning("请连接钱包并输入GNR最小单位数量（18位精度）"); return; }
    if (!isValidAddress(saleAddress) || !isValidAddress(usdtAddress) || !isValidAddress(gnrAddress)) { message.error("地址未配置或无效"); return; }
    const gnrWant = parseAmount(faucetGnrAmt);
    if (!gnrWant) { message.error("金额无效，示例：1000000000000000000=1 GNR"); return; }
    try {
      const balNative = await provider!.getBalance(address);
      if (balNative === 0n) { message.error("当前网络原生币余额不足（需 tBNB 用于 Gas）"); return; }
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const sa = await sale.saleActive(); if (!sa) { message.error("购买未开启"); return; }
      const ke = await sale.kycEnabled(); if (ke) { const wl = await sale.whitelist(address); if (!wl) { message.error("需在白名单后才能领取GNR"); return; } }
      const bl = await sale.blacklist(address); if (bl) { message.error("黑名单用户不可领取"); return; }
      const factor = 10n ** BigInt(gnrDec - usdtDec);
      const needUsdt = (gnrWant + factor - 1n) / factor;
      const inv = await sale.remainingInventory(); if (inv < gnrWant) { message.error("库存 GNR 不足"); return; }
      const mockUsdtAbi = [{ inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" }];
      const usdt = new ethers.Contract(usdtAddress, mockUsdtAbi, signer!);
      await usdt.mint(address, needUsdt);
      await approveErc20(usdtAddress, saleAddress, needUsdt);
      const hide = message.loading({ content: "领取GNR中...", duration: 0 });
      const tx = await sale.buy(needUsdt);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">领取GNR成功，查看交易</a> : "领取GNR成功");
      await reload();
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("Internal JSON-RPC error") || msg.includes("UNKNOWN_ERROR")) { message.error("交易提交失败：请确认 BSC 测试网账户有足够 tBNB 支付 Gas"); return; }
      message.error(e?.message || "领取GNR失败");
    }
  }
  return (
    <div>
      <Typography.Paragraph type="secondary">购买用 USDT 兑换 GNR；质押为锁定模型（余额可见但不可转），可随时取消；利息为固定 APR 线性累计，单位 GNR，仅用于展示与导出。</Typography.Paragraph>
      <Typography.Paragraph>我的余额 GNR: {gnrBal || "-"} ｜ USDT: {usdtBal || "-"}</Typography.Paragraph>
      <Divider />
      <Space>
        <Input placeholder="USDT 数量" value={buyAmt} onChange={(e) => setBuyAmt(e.target.value)} />
        <Button type="primary" onClick={onBuy}>购买</Button>
        <Checkbox checked={autoStakeAfterBuy} onChange={(e) => setAutoStakeAfterBuy(e.target.checked)}>购买后自动质押</Checkbox>
      </Space>
      <Space wrap style={{ marginTop: 8 }}>
        <Tag color="blue">输入金额进行质押（APR {aprBP} / {(aprBP || 0) / 100}%）</Tag>
        <Input placeholder="GNR 数量" value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} />
        <Button type="primary" onClick={onStake}>质押</Button>
      </Space>
      <Divider />
      <Card size="small" title="测试代币领取">
        <Typography.Paragraph type="secondary">USDT 为 6 位精度，示例：1000000 = 1 USDT；GNR 为 18 位精度，示例：1000000000000000000 = 1 GNR。</Typography.Paragraph>
        <Space style={{ marginBottom: 8 }}>
          <Input placeholder="USDT 最小单位数量（示例：1000000=1 USDT）" value={faucetUsdtAmt} onChange={(e) => setFaucetUsdtAmt(e.target.value)} />
          <Button onClick={onFaucetUSDT}>领取 USDT</Button>
        </Space>
        <Space>
          <Input placeholder="GNR 最小单位数量（示例：1000000000000000000=1 GNR）" value={faucetGnrAmt} onChange={(e) => setFaucetGnrAmt(e.target.value)} />
          <Button onClick={onFaucetGNR}>领取 GNR</Button>
        </Space>
      </Card>
      <div style={{ marginTop: 12 }}>
        <Button onClick={() => {
          const rows = [["id", "amount", "start", "active", "claimable_gnr"], ...stakes.map((s) => [s.id.toString(), s.amount.toString(), s.start.toString(), s.active ? "true" : "false", s.claimable.toString()])];
          exportCsv(`user-${address}.csv`, rows);
        }}>导出我的质押</Button>
        {stakes.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map((s) => (
          <Card key={s.id.toString()} size="small" style={{ marginBottom: 8 }}>
            <div>编号 {s.id.toString()} 金额 {formatAmount(BigInt(s.amount.toString()), gnrDec)}</div>
            <div>开始 {s.start.toString()} 活跃 {s.active ? "是" : "否"}</div>
            <div>可视利息(GNR) {formatAmount(BigInt(s.claimable.toString()), gnrDec)}</div>
            <Space style={{ marginTop: 4 }}>
              <Button onClick={() => onCancel(s.id)}>取消质押</Button>
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