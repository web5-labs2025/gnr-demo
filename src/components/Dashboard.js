import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, Descriptions, Typography, message } from "antd";
import erc20Abi from "../abi/erc20.json";
import saleAbi from "../abi/sale.json";
import { formatAmount } from "../utils/format";
import { isValidAddress } from "../utils/validate";
import { networkName } from "../utils/explorer";
export default function Dashboard({ provider, saleAddress, gnrAddress }) {
    const [inventory, setInventory] = useState("");
    const [aprBP, setAprBP] = useState(0);
    const [global, setGlobal] = useState(null);
    const [gnrSupply, setGnrSupply] = useState("");
    const [gnrDecimals, setGnrDecimals] = useState(18);
    const [saleActive, setSaleActive] = useState(false);
    const [kycEnabled, setKycEnabled] = useState(false);
    const [userClaimEnabled, setUserClaimEnabled] = useState(false);
    const [allowOnPause, setAllowOnPause] = useState(false);
    const [allowWhenBlacklisted, setAllowWhenBlacklisted] = useState(false);
    const [chainId, setChainId] = useState(null);
    const [netName, setNetName] = useState("");
    useEffect(() => {
        async function load() {
            try {
                const anyWindow = window;
                const rpc = provider ?? (anyWindow?.ethereum ? new ethers.BrowserProvider(anyWindow.ethereum) : null);
                if (!rpc)
                    return;
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
                const g = await sale.summaryGlobal();
                setGlobal({ count: g[0].toString(), locked: g[1].toString(), claimableGnr: g[2].toString() });
                if (isValidAddress(gnrAddress)) {
                    const gnrCode = await rpc.getCode(gnrAddress);
                    if (!gnrCode || gnrCode === "0x") {
                        setGnrSupply("");
                    }
                    else {
                        const gnr = new ethers.Contract(gnrAddress, erc20Abi, rpc);
                        const dec = await gnr.decimals();
                        setGnrDecimals(Number(dec));
                        const sup = await gnr.totalSupply();
                        setGnrSupply(formatAmount(sup, Number(dec)));
                    }
                }
                else {
                    setGnrSupply("");
                }
            }
            catch (e) {
                message.error(e?.message || "加载总览失败");
            }
        }
        load();
    }, [provider, saleAddress]);
    return (_jsxs("div", { children: [_jsx(Card, { size: "small", style: { marginBottom: 12 }, children: _jsxs(Descriptions, { size: "small", column: 1, bordered: true, children: [_jsx(Descriptions.Item, { label: "\u5F53\u524D\u7F51\u7EDC", children: netName ? `${netName}${chainId ? ` (${chainId})` : ""}` : "-" }), _jsx(Descriptions.Item, { label: "\u5E93\u5B58 GNR", children: inventory ? formatAmount(BigInt(inventory), gnrDecimals) : "-" }), _jsx(Descriptions.Item, { label: "GNR \u603B\u91CF", children: gnrSupply || "-" }), _jsx(Descriptions.Item, { label: "Sale \u6FC0\u6D3B", children: saleActive ? "是" : "否" }), _jsx(Descriptions.Item, { label: "KYC", children: kycEnabled ? "开" : "关" }), _jsx(Descriptions.Item, { label: "\u7528\u6237\u9886\u606F", children: userClaimEnabled ? "开" : "关" }), _jsx(Descriptions.Item, { label: "\u6682\u505C\u53EF\u63D0", children: allowOnPause ? "是" : "否" }), _jsx(Descriptions.Item, { label: "\u9ED1\u540D\u5355\u53EF\u63D0", children: allowWhenBlacklisted ? "是" : "否" }), _jsxs(Descriptions.Item, { label: "APR(bps)", children: [aprBP, " \uFF08", (aprBP || 0) / 100, "%\uFF09"] })] }) }), _jsx(Card, { size: "small", style: { marginTop: 12 }, children: _jsxs(Typography.Text, { children: ["\u6C47\u603B \u8D28\u62BC\u6570 ", global?.count || "-", " \u603B\u9501\u5B9A ", global?.locked ? formatAmount(BigInt(global.locked), gnrDecimals) : "-", " \u53EF\u89C6\u5229\u606F(GNR) ", global?.claimableGnr ? formatAmount(BigInt(global.claimableGnr), gnrDecimals) : "-"] }) })] }));
}
