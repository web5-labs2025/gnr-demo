import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, Descriptions, List, Typography, Tag, Space, message } from "antd";
import erc20Abi from "../abi/erc20.json";
import saleAbi from "../abi/sale.json";
import { formatAmount } from "../utils/format";
import { isValidAddress } from "../utils/validate";
import { networkName } from "../utils/explorer";
export default function Dashboard({ provider, saleAddress, gnrAddress }) {
    const [inventory, setInventory] = useState("");
    const [cycles, setCycles] = useState([]);
    const [params, setParams] = useState({});
    const [global, setGlobal] = useState(null);
    const [cycleSummaries, setCycleSummaries] = useState({});
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
                const cs = await sale.getAllowedCycles();
                setCycles(cs);
                const paramMap = {};
                for (const m of cs) {
                    const c = await sale.cycleParams(m);
                    paramMap[m] = { aprBP: Number(c.aprBP), penaltyBP: Number(c.penaltyBP), allowed: Boolean(c.allowed) };
                }
                setParams(paramMap);
                const g = await sale.summaryGlobal();
                setGlobal({ count: g[0].toString(), principal: g[1].toString(), claimable: g[2].toString() });
                const s = {};
                for (const m of cs) {
                    const r = await sale.summaryByCycle(m);
                    s[m] = { count: r[0].toString(), principal: r[1].toString(), claimable: r[2].toString() };
                }
                setCycleSummaries(s);
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
    return (_jsxs("div", { children: [_jsx(Card, { size: "small", style: { marginBottom: 12 }, children: _jsxs(Descriptions, { size: "small", column: 1, bordered: true, children: [_jsx(Descriptions.Item, { label: "\u5F53\u524D\u7F51\u7EDC", children: netName ? `${netName}${chainId ? ` (${chainId})` : ""}` : "-" }), _jsx(Descriptions.Item, { label: "\u5E93\u5B58 GNR", children: inventory ? formatAmount(BigInt(inventory), gnrDecimals) : "-" }), _jsx(Descriptions.Item, { label: "GNR \u603B\u91CF", children: gnrSupply || "-" }), _jsx(Descriptions.Item, { label: "Sale \u6FC0\u6D3B", children: saleActive ? "是" : "否" }), _jsx(Descriptions.Item, { label: "KYC", children: kycEnabled ? "开" : "关" }), _jsx(Descriptions.Item, { label: "\u7528\u6237\u9886\u606F", children: userClaimEnabled ? "开" : "关" }), _jsx(Descriptions.Item, { label: "\u6682\u505C\u53EF\u63D0", children: allowOnPause ? "是" : "否" }), _jsx(Descriptions.Item, { label: "\u9ED1\u540D\u5355\u53EF\u63D0", children: allowWhenBlacklisted ? "是" : "否" }), _jsx(Descriptions.Item, { label: "\u5468\u671F\u603B\u6570", children: cycles.length }), _jsx(Descriptions.Item, { label: "\u5141\u8BB8\u5468\u671F", children: cycles.length ? cycles.join(", ") : "-" })] }) }), _jsxs(Card, { size: "small", title: `周期面板（共 ${cycles.length} 个）`, style: { marginBottom: 12 }, children: [_jsx(Typography.Paragraph, { type: "secondary", children: "\u5E93\u5B58 GNR \u4E3A\u91D1\u5E93\u6301\u6709\u7684\u53EF\u53D1\u653E/\u552E\u5356\u5E93\u5B58\uFF1B\u4E0B\u65B9\u5C55\u793A\u6240\u6709\u5141\u8BB8\u5468\u671F\u53CA\u5176 APR/\u7F5A\u91D1\u4E0E\u6C47\u603B\u3002" }), _jsx(List, { size: "small", dataSource: cycles, renderItem: (m) => (_jsx(List.Item, { children: _jsxs(Space, { wrap: true, children: [_jsxs(Tag, { color: "blue", children: [m, " \u6708"] }), _jsxs(Tag, { children: ["APR ", params[m]?.aprBP, " ( ", (params[m]?.aprBP || 0) / 100, "% )"] }), _jsxs(Tag, { children: ["\u7F5A\u91D1 ", params[m]?.penaltyBP, " ( ", (params[m]?.penaltyBP || 0) / 100, "% )"] }), _jsxs(Typography.Text, { children: ["\u8D28\u62BC\u6570 ", cycleSummaries[m]?.count || "-"] }), _jsxs(Typography.Text, { children: ["\u672C\u91D1 ", cycleSummaries[m]?.principal ? formatAmount(BigInt(cycleSummaries[m].principal), gnrDecimals) : "-"] }), _jsxs(Typography.Text, { children: ["\u53EF\u9886\u5229\u606F ", cycleSummaries[m]?.claimable ? formatAmount(BigInt(cycleSummaries[m].claimable), gnrDecimals) : "-"] })] }) })) })] }), _jsx(Card, { size: "small", style: { marginTop: 12 }, children: _jsxs(Typography.Text, { children: ["\u6C47\u603B \u8D28\u62BC\u6570 ", global?.count || "-", " \u672C\u91D1 ", global?.principal ? formatAmount(BigInt(global.principal), gnrDecimals) : "-", " \u53EF\u9886\u5229\u606F ", global?.claimable ? formatAmount(BigInt(global.claimable), gnrDecimals) : "-"] }) })] }));
}
