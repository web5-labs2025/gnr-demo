import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, Descriptions, List, Typography, Tag, Space, message } from "antd";
import erc20Abi from "../abi/erc20.json";
import saleAbi from "../abi/sale.json";
import { formatAmount } from "../utils/format";
import { isValidAddress } from "../utils/validate";
import { networkName } from "../utils/explorer";

export default function Dashboard({ provider, saleAddress, gnrAddress }: { provider: ethers.BrowserProvider | null; saleAddress: string; gnrAddress: string }) {
  const [inventory, setInventory] = useState<string>("");
  const [cycles, setCycles] = useState<number[]>([]);
  const [params, setParams] = useState<Record<number, { aprBP: number; penaltyBP: number; allowed: boolean }>>({});
  const [global, setGlobal] = useState<{ count: string; principal: string; claimable: string } | null>(null);
  const [cycleSummaries, setCycleSummaries] = useState<Record<number, { count: string; principal: string; claimable: string }>>({});
  const [gnrSupply, setGnrSupply] = useState<string>("");
  const [gnrDecimals, setGnrDecimals] = useState<number>(18);
  const [saleActive, setSaleActive] = useState<boolean>(false);
  const [kycEnabled, setKycEnabled] = useState<boolean>(false);
  const [userClaimEnabled, setUserClaimEnabled] = useState<boolean>(false);
  const [allowOnPause, setAllowOnPause] = useState<boolean>(false);
  const [allowWhenBlacklisted, setAllowWhenBlacklisted] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [netName, setNetName] = useState<string>("");
  useEffect(() => {
    async function load() {
      try {
        const anyWindow: any = window as any;
        const rpc = provider ?? (anyWindow?.ethereum ? new ethers.BrowserProvider(anyWindow.ethereum) : null);
        if (!rpc) return;
        const net = await rpc.getNetwork();
        setChainId(Number(net.chainId));
        const nn = await networkName(rpc);
        setNetName(nn);
        if (!isValidAddress(saleAddress)) {
          setInventory("");
          setCycles([]);
          setParams({});
          setGlobal(null);
          setCycleSummaries({});
          message.warning("Sale 地址未配置或无效");
          return;
        }
        const saleCode = await rpc.getCode(saleAddress);
        if (!saleCode || saleCode === "0x") {
          setInventory("");
          setCycles([]);
          setParams({});
          setGlobal(null);
          setCycleSummaries({});
          message.error("Sale 合约在当前网络未部署或地址错误");
          return;
        }
        const sale = new ethers.Contract(saleAddress, saleAbi, rpc);
        const inv = await sale.remainingInventory();
        setInventory(inv.toString());
      const sa = await sale.saleActive();
      const ke = await sale.kycEnabled();
      const ce = await sale.userClaimEnabled();
      const ap = await sale.allowWithdrawOnPause();
      const ab = await sale.allowWithdrawWhenBlacklisted();
      setSaleActive(Boolean(sa));
      setKycEnabled(Boolean(ke));
      setUserClaimEnabled(Boolean(ce));
      setAllowOnPause(Boolean(ap));
      setAllowWhenBlacklisted(Boolean(ab));
      const cs: number[] = await sale.getAllowedCycles();
      setCycles(cs);
      const paramMap: Record<number, { aprBP: number; penaltyBP: number; allowed: boolean }> = {};
      for (const m of cs) {
        const c = await sale.cycleParams(m);
        paramMap[m] = { aprBP: Number(c.aprBP), penaltyBP: Number(c.penaltyBP), allowed: Boolean(c.allowed) };
      }
      setParams(paramMap);
      const g = await sale.summaryGlobal();
      setGlobal({ count: g[0].toString(), principal: g[1].toString(), claimable: g[2].toString() });
      const s: Record<number, { count: string; principal: string; claimable: string }> = {};
      for (const m of cs) {
        const r = await sale.summaryByCycle(m);
        s[m] = { count: r[0].toString(), principal: r[1].toString(), claimable: r[2].toString() };
      }
      setCycleSummaries(s);
      if (isValidAddress(gnrAddress)) {
        const gnrCode = await rpc.getCode(gnrAddress);
        if (!gnrCode || gnrCode === "0x") {
          setGnrSupply("");
        } else {
          const gnr = new ethers.Contract(gnrAddress, erc20Abi, rpc);
          const dec = await gnr.decimals();
          setGnrDecimals(Number(dec));
          const sup = await gnr.totalSupply();
          setGnrSupply(formatAmount(sup, Number(dec)));
        }
      } else {
        setGnrSupply("");
      }
      } catch (e: any) {
        message.error(e?.message || "加载总览失败");
      }
    }
    load();
  }, [provider, saleAddress]);
  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="当前网络">{netName ? `${netName}${chainId ? ` (${chainId})` : ""}` : "-"}</Descriptions.Item>
          <Descriptions.Item label="库存 GNR">{inventory ? formatAmount(BigInt(inventory), gnrDecimals) : "-"}</Descriptions.Item>
          <Descriptions.Item label="GNR 总量">{gnrSupply || "-"}</Descriptions.Item>
          <Descriptions.Item label="Sale 激活">{saleActive ? "是" : "否"}</Descriptions.Item>
          <Descriptions.Item label="KYC">{kycEnabled ? "开" : "关"}</Descriptions.Item>
          <Descriptions.Item label="用户领息">{userClaimEnabled ? "开" : "关"}</Descriptions.Item>
          <Descriptions.Item label="暂停可提">{allowOnPause ? "是" : "否"}</Descriptions.Item>
          <Descriptions.Item label="黑名单可提">{allowWhenBlacklisted ? "是" : "否"}</Descriptions.Item>
          <Descriptions.Item label="周期总数">{cycles.length}</Descriptions.Item>
          <Descriptions.Item label="允许周期">{cycles.length ? cycles.join(", ") : "-"}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card size="small" title={`周期面板（共 ${cycles.length} 个）`} style={{ marginBottom: 12 }}>
        <Typography.Paragraph type="secondary">库存 GNR 为金库持有的可发放/售卖库存；下方展示所有允许周期及其 APR/罚金与汇总。</Typography.Paragraph>
        <List
          size="small"
          dataSource={cycles}
          renderItem={(m) => (
            <List.Item>
              <Space wrap>
                <Tag color="blue">{m} 月</Tag>
                <Tag>APR {params[m]?.aprBP} ( {(params[m]?.aprBP || 0) / 100}% )</Tag>
                <Tag>罚金 {params[m]?.penaltyBP} ( {(params[m]?.penaltyBP || 0) / 100}% )</Tag>
                <Typography.Text>质押数 {cycleSummaries[m]?.count || "-"}</Typography.Text>
                <Typography.Text>本金 {cycleSummaries[m]?.principal ? formatAmount(BigInt(cycleSummaries[m].principal), gnrDecimals) : "-"}</Typography.Text>
                <Typography.Text>可领利息 {cycleSummaries[m]?.claimable ? formatAmount(BigInt(cycleSummaries[m].claimable), gnrDecimals) : "-"}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>
      <Card size="small" style={{ marginTop: 12 }}>
        <Typography.Text>汇总 质押数 {global?.count || "-"} 本金 {global?.principal ? formatAmount(BigInt(global.principal), gnrDecimals) : "-"} 可领利息 {global?.claimable ? formatAmount(BigInt(global.claimable), gnrDecimals) : "-"}</Typography.Text>
      </Card>
    </div>
  );
}