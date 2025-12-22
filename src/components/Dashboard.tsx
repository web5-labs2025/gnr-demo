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
  const [aprBP, setAprBP] = useState<number>(0);
  const [global, setGlobal] = useState<{ count: string; locked: string; claimableGnr: string } | null>(null);
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
          setAprBP(0);
          setGlobal(null);
          message.warning("Sale 地址未配置或无效");
          return;
        }
        const saleCode = await rpc.getCode(saleAddress);
        if (!saleCode || saleCode === "0x") {
          setInventory("");
          setAprBP(0);
          setGlobal(null);
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
      const apr = await sale.aprBP();
      setAprBP(Number(apr));
      const totals = await sale.summaryTotals();
      let offset: bigint = 0n;
      let lockedPartial: bigint = 0n;
      let claimablePartial: bigint = 0n;
      for (let i = 0; i < 50; i++) { // 最多迭代 50 次，每次扫描上限由合约侧限制
        const res = await sale.summaryGlobalCursor(offset, 1000);
        lockedPartial += BigInt(res[1]);
        claimablePartial += BigInt(res[2]);
        offset = BigInt(res[3]);
        if (offset === BigInt(res[0])) break;
      }
      setGlobal({ count: totals[0].toString(), locked: totals[1].toString(), claimableGnr: claimablePartial.toString() });
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
          <Descriptions.Item label="APR(bps)">{aprBP} （{(aprBP || 0) / 100}%）</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card size="small" style={{ marginTop: 12 }}>
        <Typography.Text>汇总 质押数 {global?.count || "-"} 总锁定 {global?.locked ? formatAmount(BigInt(global.locked), gnrDecimals) : "-"} 可视利息(GNR) {global?.claimableGnr ? formatAmount(BigInt(global.claimableGnr), gnrDecimals) : "-"}</Typography.Text>
      </Card>
    </div>
  );
}