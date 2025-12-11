import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Input, Space, Switch, message, Divider, Typography } from "antd";
import saleAbi from "../abi/sale.json";
import { formatTxUrl } from "../utils/explorer";
import { isAddress, isValidAddress, parseAmount, parseUint } from "../utils/validate";
import { exportCsv } from "../utils/csv";
export default function AdminPage({ provider, signer, address, saleAddress }) {
    const [isOwner, setIsOwner] = useState(false);
    const [ownerAddr, setOwnerAddr] = useState("");
    const [saleActive, setSaleActive] = useState(false);
    const [kycEnabled, setKycEnabled] = useState(false);
    const [aprBP, setAprBP] = useState("0");
    const [onPause, setOnPause] = useState(true);
    const [onBlacklist, setOnBlacklist] = useState(true);
    const [whitelistAddr, setWhitelistAddr] = useState("");
    const [blacklistAddr, setBlacklistAddr] = useState("");
    const [cycleMonths, setCycleMonths] = useState("3");
    const [cycleApr, setCycleApr] = useState("500");
    const [cyclePen, setCyclePen] = useState("500");
    const [depositAmt, setDepositAmt] = useState("");
    const [payIds, setPayIds] = useState("");
    const [projectWallet, setProjectWallet] = useState("");
    const [priceNum, setPriceNum] = useState("");
    const [priceDen, setPriceDen] = useState("");
    const [lpGnr, setLpGnr] = useState("");
    const [lpUsdt, setLpUsdt] = useState("");
    const [lpEnabled, setLpEnabled] = useState(false);
    const [queryStatus, setQueryStatus] = useState("0");
    const [statusIds, setStatusIds] = useState([]);
    const [timeStart, setTimeStart] = useState("");
    const [timeEnd, setTimeEnd] = useState("");
    const [timeIds, setTimeIds] = useState([]);
    const [statusPage, setStatusPage] = useState(1);
    const statusPageSize = 10;
    const [timePage, setTimePage] = useState(1);
    const timePageSize = 10;
    const ready = useMemo(() => !!provider && !!signer && !!address && !!saleAddress, [provider, signer, address, saleAddress]);
    const [adminCycles, setAdminCycles] = useState([]);
    const [adminParams, setAdminParams] = useState({});
    useEffect(() => {
        async function init() {
            if (!ready)
                return;
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const o = await sale.owner();
            setOwnerAddr(o);
            setIsOwner(o.toLowerCase() === address.toLowerCase());
            setSaleActive(Boolean(await sale.saleActive()));
            setKycEnabled(Boolean(await sale.kycEnabled()));
            const apr = await sale.aprBP();
            setAprBP(String(Number(apr)));
            setOnPause(Boolean(await sale.allowWithdrawOnPause()));
            setOnBlacklist(Boolean(await sale.allowWithdrawWhenBlacklisted()));
        }
        init();
    }, [ready, address, saleAddress]);
    async function exec(fn, args) {
        if (!isOwner) {
            message.error("需要管理员权限");
            return;
        }
        if (!isValidAddress(saleAddress)) {
            message.error("Sale 地址未配置或无效");
            return;
        }
        const anyWindow = window;
        const rpc = provider ?? (anyWindow?.ethereum ? new ethers.BrowserProvider(anyWindow.ethereum) : null);
        if (!rpc) {
            message.error("缺少 Provider，请连接钱包");
            return;
        }
        const code = await rpc.getCode(saleAddress);
        if (!code || code === "0x") {
            message.error("Sale 合约在当前网络未部署或地址错误");
            return;
        }
        const sale = new ethers.Contract(saleAddress, saleAbi, signer);
        const hide = message.loading({ content: "执行中...", duration: 0 });
        try {
            const tx = await sale[fn](...args);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u5DF2\u5B8C\u6210\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "已完成");
        }
        catch (e) {
            hide();
            message.error(e?.message || "执行失败");
        }
    }
    return (_jsx("div", { children: _jsxs(Space, { direction: "vertical", size: "middle", style: { width: "100%" }, children: [_jsx(Typography.Paragraph, { type: "secondary", children: "\u7528\u4E8E\u5408\u7EA6\u914D\u7F6E\u4E0E\u7EF4\u62A4\uFF1A\u5148\u786E\u8BA4\u5F00\u5173\u4E0E\u5468\u671F\uFF0C\u518D\u8FDB\u884C\u540D\u5355\u4E0E\u8D44\u91D1\u64CD\u4F5C\uFF1B\u67E5\u8BE2\u533A\u53EF\u6309\u72B6\u6001\u6216\u65F6\u95F4\u68C0\u7D22\u5E76\u5BFC\u51FA\u3002" }), _jsxs(Typography.Text, { type: "secondary", children: ["\u7BA1\u7406\u5458\u5730\u5740: ", ownerAddr || "-", " \uFF5C \u5F53\u524D\u94B1\u5305: ", address || "-", " \uFF5C \u6743\u9650: ", isOwner ? "是" : "否"] }), _jsxs(Space, { children: [_jsx("span", { children: "\u9500\u552E\u5F00\u5173" }), _jsx(Switch, { checked: saleActive, onChange: (v) => setSaleActive(v) }), _jsx(Button, { onClick: () => exec("setSaleActive", [saleActive]), children: "\u66F4\u65B0" })] }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx("span", { children: "KYC \u5F00\u5173" }), _jsx(Switch, { checked: kycEnabled, onChange: (v) => setKycEnabled(v) }), _jsx(Button, { onClick: () => exec("setKycEnabled", [kycEnabled]), children: "\u66F4\u65B0" })] }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx("span", { children: "APR (bps)" }), _jsx(Input, { placeholder: "APR(bps)", value: aprBP, onChange: (e) => setAprBP(e.target.value) }), _jsx(Button, { onClick: () => { const a = parseUint(aprBP); if (a === null || a < 0) {
                                message.error("APR 无效");
                                return;
                            } exec("setAprBP", [a]); }, children: "\u66F4\u65B0" })] }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx("span", { children: "\u5141\u8BB8\u6682\u505C\u65F6\u63D0\u73B0" }), _jsx(Switch, { checked: onPause, onChange: (v) => setOnPause(v) }), _jsx("span", { children: "\u5141\u8BB8\u9ED1\u540D\u5355\u63D0\u73B0" }), _jsx(Switch, { checked: onBlacklist, onChange: (v) => setOnBlacklist(v) }), _jsx(Button, { onClick: () => exec("setWithdrawFlags", [onPause, onBlacklist]), children: "\u66F4\u65B0" })] }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx(Input, { placeholder: "\u767D\u540D\u5355\u5730\u5740", value: whitelistAddr, onChange: (e) => setWhitelistAddr(e.target.value) }), _jsx(Button, { onClick: () => { if (!isAddress(whitelistAddr)) {
                                message.error("地址无效");
                                return;
                            } exec("addWhitelist", [whitelistAddr]); }, children: "\u52A0\u5165" }), _jsx(Button, { onClick: () => { if (!isAddress(whitelistAddr)) {
                                message.error("地址无效");
                                return;
                            } exec("removeWhitelist", [whitelistAddr]); }, children: "\u79FB\u9664" })] }), _jsxs(Space, { children: [_jsx(Input, { placeholder: "\u9ED1\u540D\u5355\u5730\u5740", value: blacklistAddr, onChange: (e) => setBlacklistAddr(e.target.value) }), _jsx(Button, { onClick: () => { if (!isAddress(blacklistAddr)) {
                                message.error("地址无效");
                                return;
                            } exec("addBlacklist", [blacklistAddr]); }, children: "\u52A0\u5165" }), _jsx(Button, { onClick: () => { if (!isAddress(blacklistAddr)) {
                                message.error("地址无效");
                                return;
                            } exec("removeBlacklist", [blacklistAddr]); }, children: "\u79FB\u9664" })] }), _jsx(Typography.Text, { type: "secondary", children: "\u7CFB\u7EDF\u91C7\u7528\u56FA\u5B9A APR\uFF08bps\uFF09\uFF0C\u5229\u606F\u5355\u4F4D\u4E3A GNR\uFF0C\u4EC5\u7528\u4E8E\u89C6\u56FE\u4E0E\u5BFC\u51FA\u3002" }), _jsxs(Space, { children: [_jsx(Input, { placeholder: "priceNum", value: priceNum, onChange: (e) => setPriceNum(e.target.value) }), _jsx(Input, { placeholder: "priceDen", value: priceDen, onChange: (e) => setPriceDen(e.target.value) }), _jsx(Input, { placeholder: "lpGnr", value: lpGnr, onChange: (e) => setLpGnr(e.target.value) }), _jsx(Input, { placeholder: "lpUsdt", value: lpUsdt, onChange: (e) => setLpUsdt(e.target.value) }), _jsx(Switch, { checked: lpEnabled, onChange: (v) => setLpEnabled(v) }), _jsx(Button, { onClick: () => { const pn = parseAmount(priceNum); const pd = parseAmount(priceDen); const lg = parseAmount(lpGnr); const lu = parseAmount(lpUsdt); if (!pn || !pd || !lg || !lu) {
                                message.error("参数无效");
                                return;
                            } exec("setUniswapParams", [pn, pd, lg, lu, lpEnabled]); }, children: "\u8BBE\u7F6EUniswap\u53C2\u6570" })] }), _jsx(Typography.Paragraph, { type: "secondary", children: "\u5956\u52B1\u7531\u7B2C\u4E09\u65B9\u4EE3\u53D1\u5DE5\u5177\u7EBF\u4E0B\u53D1\u653E\uFF1B\u672C\u9875\u4E0D\u63D0\u4F9B\u94FE\u4E0A\u53D1\u5956\u64CD\u4F5C\u3002" }), _jsxs(Space, { children: [_jsx(Input, { placeholder: "\u72B6\u6001(0\u6D3B\u8DC3/1\u5DF2\u53D6\u6D88)", value: queryStatus, onChange: (e) => setQueryStatus(e.target.value) }), _jsx(Button, { onClick: async () => { const st = parseUint(queryStatus); if (st === null || st < 0 || st > 1) {
                                message.error("状态无效");
                                return;
                            } const sale = new ethers.Contract(saleAddress, saleAbi, signer); const res = await sale.listStakesByStatus(st, 0, 100); setStatusIds(res[1]); message.success(`获取 ${res[1].length} 条`); }, children: "\u6309\u72B6\u6001\u67E5\u8BE2" }), _jsx(Button, { onClick: () => { if (!statusIds.length) {
                                message.error("无数据");
                                return;
                            } exportCsv("stakes-by-status.csv", [["id"], ...statusIds.map((x) => [x.toString()])]); }, children: "\u5BFC\u51FACSV" })] }), _jsxs(Space, { style: { marginTop: 8 }, children: [_jsxs(Typography.Text, { type: "secondary", children: ["\u7B2C ", statusPage, " \u9875 / \u5171 ", Math.max(1, Math.ceil(statusIds.length / statusPageSize)), " \u9875"] }), _jsx(Button, { onClick: () => setStatusPage(Math.max(1, statusPage - 1)), children: "\u4E0A\u4E00\u9875" }), _jsx(Button, { onClick: () => setStatusPage(Math.min(Math.ceil(statusIds.length / statusPageSize) || 1, statusPage + 1)), children: "\u4E0B\u4E00\u9875" })] }), _jsx("div", { style: { fontSize: 12 }, children: statusIds.length ? `IDs: ${statusIds.slice((statusPage - 1) * statusPageSize, (statusPage - 1) * statusPageSize + statusPageSize).map((x) => x.toString()).join(",")}` : "" }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx(Input, { placeholder: "\u5F00\u59CB\u65F6\u95F4\u6233", value: timeStart, onChange: (e) => setTimeStart(e.target.value) }), _jsx(Input, { placeholder: "\u7ED3\u675F\u65F6\u95F4\u6233", value: timeEnd, onChange: (e) => setTimeEnd(e.target.value) }), _jsx(Button, { onClick: async () => { const ts = parseUint(timeStart) ?? 0; const te = parseUint(timeEnd) ?? Math.floor(Date.now() / 1000); if (ts < 0 || te <= 0 || ts > te) {
                                message.error("时间范围无效");
                                return;
                            } const sale = new ethers.Contract(saleAddress, saleAbi, signer); const res = await sale.listStakesByTime(ts, te, 0, 100); setTimeIds(res[1]); message.success(`获取 ${res[1].length} 条`); }, children: "\u6309\u65F6\u95F4\u67E5\u8BE2" }), _jsx(Button, { onClick: () => { if (!timeIds.length) {
                                message.error("无数据");
                                return;
                            } exportCsv("stakes-by-time.csv", [["id"], ...timeIds.map((x) => [x.toString()])]); }, children: "\u5BFC\u51FACSV" })] }), _jsxs(Space, { style: { marginTop: 8 }, children: [_jsxs(Typography.Text, { type: "secondary", children: ["\u7B2C ", timePage, " \u9875 / \u5171 ", Math.max(1, Math.ceil(timeIds.length / timePageSize)), " \u9875"] }), _jsx(Button, { onClick: () => setTimePage(Math.max(1, timePage - 1)), children: "\u4E0A\u4E00\u9875" }), _jsx(Button, { onClick: () => setTimePage(Math.min(Math.ceil(timeIds.length / timePageSize) || 1, timePage + 1)), children: "\u4E0B\u4E00\u9875" })] }), _jsx("div", { style: { fontSize: 12 }, children: timeIds.length ? `IDs: ${timeIds.slice((timePage - 1) * timePageSize, (timePage - 1) * timePageSize + timePageSize).map((x) => x.toString()).join(",")}` : "" }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx(Input, { placeholder: "\u9879\u76EE\u94B1\u5305\u5730\u5740", value: projectWallet, onChange: (e) => setProjectWallet(e.target.value) }), _jsx(Button, { onClick: () => { if (!isAddress(projectWallet)) {
                                message.error("地址无效");
                                return;
                            } exec("setProjectWallet", [projectWallet]); }, children: "\u66F4\u65B0\u9879\u76EE\u94B1\u5305" })] }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx(Button, { onClick: () => exec("pause", []), children: "\u6682\u505C" }), _jsx(Button, { type: "primary", onClick: () => exec("unpause", []), children: "\u6062\u590D" })] })] }) }));
}
