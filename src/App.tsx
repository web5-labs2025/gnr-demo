import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import { ConfigProvider, Layout, Typography, Row, Col, Divider, Card, Space, Button, message } from "antd";
import Wallet from "./components/Wallet";
import AddressConfig from "./components/AddressConfig";
import Dashboard from "./components/Dashboard";
import UserPage from "./components/UserPage";
import AdminPage from "./components/AdminPage";
import VaultPage from "./components/VaultPage";
import { isValidAddress } from "./utils/validate";
import { networkName, switchNetwork } from "./utils/explorer";

export default function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [saleAddress, setSaleAddress] = useState<string>(() => {
    const envV = (import.meta as any).env?.VITE_SALE_ADDRESS || "";
    const lsV = localStorage.getItem("saleAddress") || "";
    return isValidAddress(envV) ? envV : lsV;
  });
  const [vaultAddress, setVaultAddress] = useState<string>(() => {
    const envV = (import.meta as any).env?.VITE_VAULT_ADDRESS || "";
    const lsV = localStorage.getItem("vaultAddress") || "";
    return isValidAddress(envV) ? envV : lsV;
  });
  const [gnrAddress, setGnrAddress] = useState<string>(() => {
    const envV = (import.meta as any).env?.VITE_GNR_ADDRESS || "";
    const lsV = localStorage.getItem("gnrAddress") || "";
    return isValidAddress(envV) ? envV : lsV;
  });
  const [usdtAddress, setUsdtAddress] = useState<string>(() => {
    const envV = (import.meta as any).env?.VITE_USDT_ADDRESS || "";
    const lsV = localStorage.getItem("usdtAddress") || "";
    return isValidAddress(envV) ? envV : lsV;
  });
  const connected = useMemo(() => !!provider && !!signer && !!address, [provider, signer, address]);
  React.useEffect(() => {
    const env = (import.meta as any).env || {};
    const s = env.VITE_SALE_ADDRESS || "";
    const v = env.VITE_VAULT_ADDRESS || "";
    const g = env.VITE_GNR_ADDRESS || "";
    const u = env.VITE_USDT_ADDRESS || "";
    if (isValidAddress(s)) { setSaleAddress(s); localStorage.setItem("saleAddress", s); }
    if (isValidAddress(v)) { setVaultAddress(v); localStorage.setItem("vaultAddress", v); }
    if (isValidAddress(g)) { setGnrAddress(g); localStorage.setItem("gnrAddress", g); }
    if (isValidAddress(u)) { setUsdtAddress(u); localStorage.setItem("usdtAddress", u); }
  }, []);
  const [chainId, setChainId] = useState<number | null>(null);
  const [netName, setNetName] = useState<string>("");
  const [saleCodeOk, setSaleCodeOk] = useState<boolean>(true);
  const [switching, setSwitching] = useState<boolean>(false);
  React.useEffect(() => {
    async function checkNet() {
      const anyWindow: any = window as any;
      const rpc = provider ?? (anyWindow?.ethereum ? new ethers.BrowserProvider(anyWindow.ethereum) : null);
      if (!rpc) return;
      const net = await rpc.getNetwork();
      setChainId(Number(net.chainId));
      const nn = await networkName(rpc);
      setNetName(nn);
      if (isValidAddress(saleAddress)) {
        const code = await rpc.getCode(saleAddress);
        setSaleCodeOk(!!code && code !== "0x");
      } else {
        setSaleCodeOk(false);
      }
    }
    checkNet();
    const anyWindow: any = window as any;
    const onChainChanged = () => { checkNet(); };
    if (anyWindow?.ethereum && anyWindow.ethereum.on) {
      anyWindow.ethereum.on("chainChanged", onChainChanged);
    }
    return () => {
      if (anyWindow?.ethereum && anyWindow.ethereum.removeListener) {
        anyWindow.ethereum.removeListener("chainChanged", onChainChanged);
      }
    };
  }, [provider, saleAddress]);
  async function handleSwitchNetwork() {
    try {
      setSwitching(true);
      await switchNetwork(97);
      message.success("已切换到 BSC 测试网");
    } catch (e: any) {
      message.error(e?.message || "切换网络失败");
    } finally {
      setSwitching(false);
    }
  }
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff", borderRadius: 10, colorBgLayout: "#f6f8fb" } }}>
      <Layout style={{ minHeight: "100vh" }}>
        <Layout.Header style={{ background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>GNR 合约演示</Typography.Title>
            <Space>
              <Typography.Text type="secondary">{netName ? `${netName}${chainId ? ` (${chainId})` : ""}` : "未识别网络"}</Typography.Text>
              {!saleCodeOk && isValidAddress(saleAddress) && (
                <Button danger loading={switching} onClick={handleSwitchNetwork}>切换到BSC测试网</Button>
              )}
              <Wallet onConnected={(p, s, a) => { setProvider(p); setSigner(s); setAddress(a); }} />
            </Space>
          </div>
        </Layout.Header>
        <Layout.Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          <Card style={{ marginBottom: 16 }} title="地址配置" extra={<Typography.Text type="secondary">从环境变量自动填充，可在此修改</Typography.Text>}>
            <AddressConfig saleAddress={saleAddress} vaultAddress={vaultAddress} gnrAddress={gnrAddress} usdtAddress={usdtAddress} onChange={(k, v) => {
              if (k === "sale") { setSaleAddress(v); localStorage.setItem("saleAddress", v); }
              if (k === "vault") { setVaultAddress(v); localStorage.setItem("vaultAddress", v); }
              if (k === "gnr") { setGnrAddress(v); localStorage.setItem("gnrAddress", v); }
              if (k === "usdt") { setUsdtAddress(v); localStorage.setItem("usdtAddress", v); }
            }} />
          </Card>
        <Row gutter={0}>
          <Col span={24}>
            <Card title="总览" style={{ marginBottom: 16 }}>
              <Dashboard provider={provider} saleAddress={saleAddress} gnrAddress={gnrAddress} />
            </Card>
          </Col>
        </Row>
        <Row gutter={0}>
          <Col span={24}>
            <Card title="金库" style={{ marginBottom: 16 }}>
              <VaultPage provider={provider} signer={signer} vaultAddress={vaultAddress} />
            </Card>
          </Col>
        </Row>
        <Row gutter={0}>
          <Col span={24}>
            <Card title="用户" style={{ marginBottom: 16 }}>
              <UserPage provider={provider} signer={signer} address={address} saleAddress={saleAddress} gnrAddress={gnrAddress} usdtAddress={usdtAddress} />
            </Card>
          </Col>
        </Row>
        <Row gutter={0}>
          <Col span={24}>
            <Card title="管理员" style={{ marginBottom: 16 }}>
              <AdminPage provider={provider} signer={signer} address={address} saleAddress={saleAddress} />
            </Card>
          </Col>
        </Row>
          <Typography.Paragraph style={{ marginTop: 24 }} type="secondary">请先连接钱包与确认地址配置；如需更改默认值，在 demo/.env 更新后重建。</Typography.Paragraph>
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  );
}