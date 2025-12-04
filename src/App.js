import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import { ConfigProvider, Layout, Typography, Row, Col, Card, Space, Button, message } from "antd";
import Wallet from "./components/Wallet";
import AddressConfig from "./components/AddressConfig";
import Dashboard from "./components/Dashboard";
import UserPage from "./components/UserPage";
import AdminPage from "./components/AdminPage";
import VaultPage from "./components/VaultPage";
import { isValidAddress } from "./utils/validate";
import { networkName, switchNetwork } from "./utils/explorer";
export default function App() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [address, setAddress] = useState("");
    const [saleAddress, setSaleAddress] = useState(() => {
        const envV = import.meta.env?.VITE_SALE_ADDRESS || "";
        const lsV = localStorage.getItem("saleAddress") || "";
        return isValidAddress(envV) ? envV : lsV;
    });
    const [vaultAddress, setVaultAddress] = useState(() => {
        const envV = import.meta.env?.VITE_VAULT_ADDRESS || "";
        const lsV = localStorage.getItem("vaultAddress") || "";
        return isValidAddress(envV) ? envV : lsV;
    });
    const [gnrAddress, setGnrAddress] = useState(() => {
        const envV = import.meta.env?.VITE_GNR_ADDRESS || "";
        const lsV = localStorage.getItem("gnrAddress") || "";
        return isValidAddress(envV) ? envV : lsV;
    });
    const [usdtAddress, setUsdtAddress] = useState(() => {
        const envV = import.meta.env?.VITE_USDT_ADDRESS || "";
        const lsV = localStorage.getItem("usdtAddress") || "";
        return isValidAddress(envV) ? envV : lsV;
    });
    const connected = useMemo(() => !!provider && !!signer && !!address, [provider, signer, address]);
    React.useEffect(() => {
        const env = import.meta.env || {};
        const s = env.VITE_SALE_ADDRESS || "";
        const v = env.VITE_VAULT_ADDRESS || "";
        const g = env.VITE_GNR_ADDRESS || "";
        const u = env.VITE_USDT_ADDRESS || "";
        if (isValidAddress(s)) {
            setSaleAddress(s);
            localStorage.setItem("saleAddress", s);
        }
        if (isValidAddress(v)) {
            setVaultAddress(v);
            localStorage.setItem("vaultAddress", v);
        }
        if (isValidAddress(g)) {
            setGnrAddress(g);
            localStorage.setItem("gnrAddress", g);
        }
        if (isValidAddress(u)) {
            setUsdtAddress(u);
            localStorage.setItem("usdtAddress", u);
        }
    }, []);
    const [chainId, setChainId] = useState(null);
    const [netName, setNetName] = useState("");
    const [saleCodeOk, setSaleCodeOk] = useState(true);
    const [switching, setSwitching] = useState(false);
    React.useEffect(() => {
        async function checkNet() {
            const anyWindow = window;
            const rpc = provider ?? (anyWindow?.ethereum ? new ethers.BrowserProvider(anyWindow.ethereum) : null);
            if (!rpc)
                return;
            const net = await rpc.getNetwork();
            setChainId(Number(net.chainId));
            const nn = await networkName(rpc);
            setNetName(nn);
            if (isValidAddress(saleAddress)) {
                const code = await rpc.getCode(saleAddress);
                setSaleCodeOk(!!code && code !== "0x");
            }
            else {
                setSaleCodeOk(false);
            }
        }
        checkNet();
        const anyWindow = window;
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
        }
        catch (e) {
            message.error(e?.message || "切换网络失败");
        }
        finally {
            setSwitching(false);
        }
    }
    return (_jsx(ConfigProvider, { theme: { token: { colorPrimary: "#1677ff", borderRadius: 10, colorBgLayout: "#f6f8fb" } }, children: _jsxs(Layout, { style: { minHeight: "100vh" }, children: [_jsx(Layout.Header, { style: { background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }, children: _jsxs("div", { style: { maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsx(Typography.Title, { level: 3, style: { margin: 0 }, children: "GNR \u5408\u7EA6\u6F14\u793A" }), _jsxs(Space, { children: [_jsx(Typography.Text, { type: "secondary", children: netName ? `${netName}${chainId ? ` (${chainId})` : ""}` : "未识别网络" }), !saleCodeOk && isValidAddress(saleAddress) && (_jsx(Button, { danger: true, loading: switching, onClick: handleSwitchNetwork, children: "\u5207\u6362\u5230BSC\u6D4B\u8BD5\u7F51" })), _jsx(Wallet, { onConnected: (p, s, a) => { setProvider(p); setSigner(s); setAddress(a); } })] })] }) }), _jsxs(Layout.Content, { style: { padding: 24, maxWidth: 1200, margin: "0 auto" }, children: [_jsx(Card, { style: { marginBottom: 16 }, title: "\u5730\u5740\u914D\u7F6E", extra: _jsx(Typography.Text, { type: "secondary", children: "\u4ECE\u73AF\u5883\u53D8\u91CF\u81EA\u52A8\u586B\u5145\uFF0C\u53EF\u5728\u6B64\u4FEE\u6539" }), children: _jsx(AddressConfig, { saleAddress: saleAddress, vaultAddress: vaultAddress, gnrAddress: gnrAddress, usdtAddress: usdtAddress, onChange: (k, v) => {
                                    if (k === "sale") {
                                        setSaleAddress(v);
                                        localStorage.setItem("saleAddress", v);
                                    }
                                    if (k === "vault") {
                                        setVaultAddress(v);
                                        localStorage.setItem("vaultAddress", v);
                                    }
                                    if (k === "gnr") {
                                        setGnrAddress(v);
                                        localStorage.setItem("gnrAddress", v);
                                    }
                                    if (k === "usdt") {
                                        setUsdtAddress(v);
                                        localStorage.setItem("usdtAddress", v);
                                    }
                                } }) }), _jsx(Row, { gutter: 0, children: _jsx(Col, { span: 24, children: _jsx(Card, { title: "\u603B\u89C8", style: { marginBottom: 16 }, children: _jsx(Dashboard, { provider: provider, saleAddress: saleAddress, gnrAddress: gnrAddress }) }) }) }), _jsx(Row, { gutter: 0, children: _jsx(Col, { span: 24, children: _jsx(Card, { title: "\u91D1\u5E93", style: { marginBottom: 16 }, children: _jsx(VaultPage, { provider: provider, signer: signer, vaultAddress: vaultAddress }) }) }) }), _jsx(Row, { gutter: 0, children: _jsx(Col, { span: 24, children: _jsx(Card, { title: "\u7528\u6237", style: { marginBottom: 16 }, children: _jsx(UserPage, { provider: provider, signer: signer, address: address, saleAddress: saleAddress, gnrAddress: gnrAddress, usdtAddress: usdtAddress }) }) }) }), _jsx(Row, { gutter: 0, children: _jsx(Col, { span: 24, children: _jsx(Card, { title: "\u7BA1\u7406\u5458", style: { marginBottom: 16 }, children: _jsx(AdminPage, { provider: provider, signer: signer, address: address, saleAddress: saleAddress }) }) }) }), _jsx(Typography.Paragraph, { style: { marginTop: 24 }, type: "secondary", children: "\u8BF7\u5148\u8FDE\u63A5\u94B1\u5305\u4E0E\u786E\u8BA4\u5730\u5740\u914D\u7F6E\uFF1B\u5982\u9700\u66F4\u6539\u9ED8\u8BA4\u503C\uFF0C\u5728 demo/.env \u66F4\u65B0\u540E\u91CD\u5EFA\u3002" })] })] }) }));
}
