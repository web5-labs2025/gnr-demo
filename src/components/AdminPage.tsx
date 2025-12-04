import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Input, Space, Switch, message, Divider, Typography, Tag } from "antd";
import saleAbi from "../abi/sale.json";
import { formatTxUrl } from "../utils/explorer";
import { isAddress, isValidAddress, parseAmount, parseUint } from "../utils/validate";
import { exportCsv } from "../utils/csv";

export default function AdminPage({ provider, signer, address, saleAddress }: { provider: ethers.BrowserProvider | null; signer: ethers.Signer | null; address: string; saleAddress: string }) {
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [ownerAddr, setOwnerAddr] = useState<string>("");
  const [saleActive, setSaleActive] = useState<boolean>(false);
  const [kycEnabled, setKycEnabled] = useState<boolean>(false);
  const [userClaimEnabled, setUserClaimEnabled] = useState<boolean>(false);
  const [onPause, setOnPause] = useState<boolean>(true);
  const [onBlacklist, setOnBlacklist] = useState<boolean>(true);
  const [whitelistAddr, setWhitelistAddr] = useState<string>("");
  const [blacklistAddr, setBlacklistAddr] = useState<string>("");
  const [cycleMonths, setCycleMonths] = useState<string>("3");
  const [cycleApr, setCycleApr] = useState<string>("500");
  const [cyclePen, setCyclePen] = useState<string>("500");
  const [depositAmt, setDepositAmt] = useState<string>("");
  const [payIds, setPayIds] = useState<string>("");
  const [projectWallet, setProjectWallet] = useState<string>("");
  const [priceNum, setPriceNum] = useState<string>("");
  const [priceDen, setPriceDen] = useState<string>("");
  const [lpGnr, setLpGnr] = useState<string>("");
  const [lpUsdt, setLpUsdt] = useState<string>("");
  const [lpEnabled, setLpEnabled] = useState<boolean>(false);
  const [queryStatus, setQueryStatus] = useState<string>("0");
  const [statusIds, setStatusIds] = useState<bigint[]>([]);
  const [timeStart, setTimeStart] = useState<string>("");
  const [timeEnd, setTimeEnd] = useState<string>("");
  const [timeIds, setTimeIds] = useState<bigint[]>([]);
  const [statusPage, setStatusPage] = useState<number>(1);
  const statusPageSize = 10;
  const [timePage, setTimePage] = useState<number>(1);
  const timePageSize = 10;
  const ready = useMemo(() => !!provider && !!signer && !!address && !!saleAddress, [provider, signer, address, saleAddress]);
  const [adminCycles, setAdminCycles] = useState<number[]>([]);
  const [adminParams, setAdminParams] = useState<Record<number, { aprBP: number; penaltyBP: number; allowed: boolean }>>({});
  useEffect(() => {
    async function init() {
      if (!ready) return;
      const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
      const o = await sale.owner();
      setOwnerAddr(o);
      setIsOwner(o.toLowerCase() === address.toLowerCase());
      setSaleActive(Boolean(await sale.saleActive()));
      setKycEnabled(Boolean(await sale.kycEnabled()));
      setUserClaimEnabled(Boolean(await sale.userClaimEnabled()));
      setOnPause(Boolean(await sale.allowWithdrawOnPause()));
      setOnBlacklist(Boolean(await sale.allowWithdrawWhenBlacklisted()));
    }
    init();
  }, [ready, address, saleAddress]);
  async function exec(fn: string, args: any[]) {
    if (!isOwner) { message.error("需要管理员权限"); return; }
    if (!isValidAddress(saleAddress)) { message.error("Sale 地址未配置或无效"); return; }
    const anyWindow: any = window as any;
    const rpc = provider ?? (anyWindow?.ethereum ? new ethers.BrowserProvider(anyWindow.ethereum) : null);
    if (!rpc) { message.error("缺少 Provider，请连接钱包"); return; }
    const code = await rpc.getCode(saleAddress);
    if (!code || code === "0x") { message.error("Sale 合约在当前网络未部署或地址错误"); return; }
    const sale = new ethers.Contract(saleAddress, saleAbi, signer!);
    const hide = message.loading({ content: "执行中...", duration: 0 });
    try {
      const tx = await sale[fn](...args);
      const r = await tx.wait();
      const url = await formatTxUrl(provider, tx.hash);
      hide();
      message.success(url ? <a href={url} target="_blank" rel="noreferrer">已完成，查看交易</a> : "已完成");
    } catch (e: any) { hide(); message.error(e?.message || "执行失败"); }
  }
  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary">用于合约配置与维护：先确认开关与周期，再进行名单与资金操作；查询区可按状态或时间检索并导出。</Typography.Paragraph>
        <Typography.Text type="secondary">管理员地址: {ownerAddr || "-"} ｜ 当前钱包: {address || "-"} ｜ 权限: {isOwner ? "是" : "否"}</Typography.Text>
        <Space>
          <span>销售开关</span>
          <Switch checked={saleActive} onChange={(v) => setSaleActive(v)} />
          <Button onClick={() => exec("setSaleActive", [saleActive])}>更新</Button>
        </Space>
        <Divider />
        <Space>
          <span>KYC 开关</span>
          <Switch checked={kycEnabled} onChange={(v) => setKycEnabled(v)} />
          <Button onClick={() => exec("setKycEnabled", [kycEnabled])}>更新</Button>
        </Space>
        <Divider />
        <Space>
          <span>用户领息开关</span>
          <Switch checked={userClaimEnabled} onChange={(v) => setUserClaimEnabled(v)} />
          <Button onClick={() => exec("setUserClaimEnabled", [userClaimEnabled])}>更新</Button>
        </Space>
        <Divider />
        <Space>
          <span>允许暂停时提现</span>
          <Switch checked={onPause} onChange={(v) => setOnPause(v)} />
          <span>允许黑名单提现</span>
          <Switch checked={onBlacklist} onChange={(v) => setOnBlacklist(v)} />
          <Button onClick={() => exec("setWithdrawFlags", [onPause, onBlacklist])}>更新</Button>
        </Space>
        <Divider />
        <Space>
          <Input placeholder="白名单地址" value={whitelistAddr} onChange={(e) => setWhitelistAddr(e.target.value)} />
          <Button onClick={() => { if (!isAddress(whitelistAddr)) { message.error("地址无效"); return; } exec("addWhitelist", [whitelistAddr]); }}>加入</Button>
          <Button onClick={() => { if (!isAddress(whitelistAddr)) { message.error("地址无效"); return; } exec("removeWhitelist", [whitelistAddr]); }}>移除</Button>
        </Space>
        <Space>
          <Input placeholder="黑名单地址" value={blacklistAddr} onChange={(e) => setBlacklistAddr(e.target.value)} />
          <Button onClick={() => { if (!isAddress(blacklistAddr)) { message.error("地址无效"); return; } exec("addBlacklist", [blacklistAddr]); }}>加入</Button>
          <Button onClick={() => { if (!isAddress(blacklistAddr)) { message.error("地址无效"); return; } exec("removeBlacklist", [blacklistAddr]); }}>移除</Button>
        </Space>
        <Space>
          <Input placeholder="周期(月)" value={cycleMonths} onChange={(e) => setCycleMonths(e.target.value)} />
          <Input placeholder="APR(bps)" value={cycleApr} onChange={(e) => setCycleApr(e.target.value)} />
          <Input placeholder="罚金(bps)" value={cyclePen} onChange={(e) => setCyclePen(e.target.value)} />
          <Button onClick={() => { const m = parseUint(cycleMonths); const a = parseUint(cycleApr); const p = parseUint(cyclePen); if (!m || m <= 0 || !a || !p) { message.error("输入无效"); return; } exec("addCycle", [m, a, p]); }}>新增</Button>
          <Button onClick={() => { const m = parseUint(cycleMonths); const a = parseUint(cycleApr); const p = parseUint(cyclePen); if (!m || m <= 0 || !a || !p) { message.error("输入无效"); return; } exec("updateCycle", [m, a, p]); }}>更新</Button>
          <Button danger onClick={() => { const m = parseUint(cycleMonths); if (!m || m <= 0) { message.error("周期无效"); return; } exec("removeCycle", [m]); }}>删除</Button>
        </Space>
        <Space>
          <Button onClick={async () => { const sale = new ethers.Contract(saleAddress, saleAbi, signer!); const cs: number[] = await sale.getAllowedCycles(); const p: Record<number, { aprBP: number; penaltyBP: number; allowed: boolean }> = {}; for (const m of cs) { const c = await sale.cycleParams(m); p[m] = { aprBP: Number(c.aprBP), penaltyBP: Number(c.penaltyBP), allowed: Boolean(c.allowed) }; } setAdminCycles(cs); setAdminParams(p); message.success(`已刷新 ${cs.length} 个周期`); }}>刷新周期</Button>
          <Typography.Text type="secondary">当前允许: {adminCycles.length ? adminCycles.join(", ") : "-"}</Typography.Text>
        </Space>
        {adminCycles.map((m) => (
          <Space key={m}>
            <Tag color="blue">{m} 月</Tag>
            <Tag>APR {adminParams[m]?.aprBP}</Tag>
            <Tag>罚金 {adminParams[m]?.penaltyBP}</Tag>
          </Space>
        ))}
        <Space>
          <Input placeholder="priceNum" value={priceNum} onChange={(e) => setPriceNum(e.target.value)} />
          <Input placeholder="priceDen" value={priceDen} onChange={(e) => setPriceDen(e.target.value)} />
          <Input placeholder="lpGnr" value={lpGnr} onChange={(e) => setLpGnr(e.target.value)} />
          <Input placeholder="lpUsdt" value={lpUsdt} onChange={(e) => setLpUsdt(e.target.value)} />
          <Switch checked={lpEnabled} onChange={(v) => setLpEnabled(v)} />
          <Button onClick={() => { const pn = parseAmount(priceNum); const pd = parseAmount(priceDen); const lg = parseAmount(lpGnr); const lu = parseAmount(lpUsdt); if (!pn || !pd || !lg || !lu) { message.error("参数无效"); return; } exec("setUniswapParams", [pn, pd, lg, lu, lpEnabled]); }}>设置Uniswap参数</Button>
        </Space>
        <Space>
          <Input placeholder="USDT 充值金额" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
          <Button onClick={() => { const a = parseAmount(depositAmt); if (!a) { message.error("金额无效"); return; } exec("adminDepositUSDT", [a]); }}>充值</Button>
        </Space>
        <Space>
          <Input placeholder="批量支付 stakeId 列表, 逗号分隔" value={payIds} onChange={(e) => setPayIds(e.target.value)} />
          <Button onClick={() => exec("adminPayRewardsBatch", [payIds.split(",").map((x) => BigInt(x.trim())).filter((x) => x > 0n)])}>批量支付</Button>
        </Space>
        <Space>
          <Input placeholder="状态(0活跃/1到期/2早退)" value={queryStatus} onChange={(e) => setQueryStatus(e.target.value)} />
          <Button onClick={async () => { const st = parseUint(queryStatus); if (st === null || st < 0 || st > 2) { message.error("状态无效"); return; } const sale = new ethers.Contract(saleAddress, saleAbi, signer!); const res = await sale.listStakesByStatus(st, 0, 100); setStatusIds(res[1]); message.success(`获取 ${res[1].length} 条`); }}>按状态查询</Button>
          <Button onClick={() => { if (!statusIds.length) { message.error("无数据"); return; } exportCsv("stakes-by-status.csv", [["id"], ...statusIds.map((x) => [x.toString()])]); }}>导出CSV</Button>
        </Space>
        <Space style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">第 {statusPage} 页 / 共 {Math.max(1, Math.ceil(statusIds.length / statusPageSize))} 页</Typography.Text>
          <Button onClick={() => setStatusPage(Math.max(1, statusPage - 1))}>上一页</Button>
          <Button onClick={() => setStatusPage(Math.min(Math.ceil(statusIds.length / statusPageSize) || 1, statusPage + 1))}>下一页</Button>
        </Space>
        <div style={{ fontSize: 12 }}>{statusIds.length ? `IDs: ${statusIds.slice((statusPage - 1) * statusPageSize, (statusPage - 1) * statusPageSize + statusPageSize).map((x) => x.toString()).join(",")}` : ""}</div>
        <Divider />
        <Space>
          <Input placeholder="开始时间戳" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
          <Input placeholder="结束时间戳" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
          <Button onClick={async () => { const ts = parseUint(timeStart) ?? 0; const te = parseUint(timeEnd) ?? Math.floor(Date.now() / 1000); if (ts < 0 || te <= 0 || ts > te) { message.error("时间范围无效"); return; } const sale = new ethers.Contract(saleAddress, saleAbi, signer!); const res = await sale.listStakesByTime(ts, te, 0, 100); setTimeIds(res[1]); message.success(`获取 ${res[1].length} 条`); }}>按时间查询</Button>
          <Button onClick={() => { if (!timeIds.length) { message.error("无数据"); return; } exportCsv("stakes-by-time.csv", [["id"], ...timeIds.map((x) => [x.toString()])]); }}>导出CSV</Button>
        </Space>
        <Space style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">第 {timePage} 页 / 共 {Math.max(1, Math.ceil(timeIds.length / timePageSize))} 页</Typography.Text>
          <Button onClick={() => setTimePage(Math.max(1, timePage - 1))}>上一页</Button>
          <Button onClick={() => setTimePage(Math.min(Math.ceil(timeIds.length / timePageSize) || 1, timePage + 1))}>下一页</Button>
        </Space>
        <div style={{ fontSize: 12 }}>{timeIds.length ? `IDs: ${timeIds.slice((timePage - 1) * timePageSize, (timePage - 1) * timePageSize + timePageSize).map((x) => x.toString()).join(",")}` : ""}</div>
        <Divider />
        <Space>
          <Input placeholder="项目钱包地址" value={projectWallet} onChange={(e) => setProjectWallet(e.target.value)} />
          <Button onClick={() => { if (!isAddress(projectWallet)) { message.error("地址无效"); return; } exec("setProjectWallet", [projectWallet]); }}>更新项目钱包</Button>
        </Space>
        <Divider />
        <Space>
          <Button onClick={() => exec("pause", [])}>暂停</Button>
          <Button type="primary" onClick={() => exec("unpause", [])}>恢复</Button>
        </Space>
      </Space>
    </div>
  );
}