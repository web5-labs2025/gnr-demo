import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Card, Input, Space, message, Typography, Divider, Tag } from "antd";
import saleAbi from "../abi/sale.json";
import erc20Abi from "../abi/erc20.json";
import { formatTxUrl } from "../utils/explorer";
import { exportCsv } from "../utils/csv";
import { parseAmount, parseUint, isValidAddress } from "../utils/validate";
import { formatAmount } from "../utils/format";
export default function UserPage({ provider, signer, address, saleAddress, gnrAddress, usdtAddress }) {
    const [buyAmt, setBuyAmt] = useState("");
    const [stakeAmt, setStakeAmt] = useState("");
    const [stakeMonths, setStakeMonths] = useState("3");
    const [userClaimEnabled, setUserClaimEnabled] = useState(false);
    const [stakes, setStakes] = useState([]);
    const [gnrBal, setGnrBal] = useState("");
    const [usdtBal, setUsdtBal] = useState("");
    const [gnrDec, setGnrDec] = useState(18);
    const [usdtDec, setUsdtDec] = useState(6);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const ready = useMemo(() => !!provider && !!signer && !!address && !!saleAddress && !!gnrAddress && !!usdtAddress, [provider, signer, address, saleAddress, gnrAddress, usdtAddress]);
    useEffect(() => {
        async function init() {
            if (!ready)
                return;
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const u = await sale.userClaimEnabled();
            setUserClaimEnabled(Boolean(u));
            const res = await sale.listUserStakes(address, 0, 100);
            const n = Number(res[0]);
            const items = [];
            for (let i = 0; i < n && i < res[1].length; i++) {
                items.push({ id: res[1][i], amount: res[2][i], months: res[3][i], start: res[4][i], end: res[5][i], active: res[6][i], earlyExit: res[7][i], claimable: res[8][i] });
            }
            setStakes(items);
            const erc = new ethers.Contract(gnrAddress, erc20Abi, signer);
            const decG = await erc.decimals();
            setGnrDec(Number(decG));
            const balG = await erc.balanceOf(address);
            setGnrBal(formatAmount(balG, Number(decG)));
            const ercU = new ethers.Contract(usdtAddress, erc20Abi, signer);
            const decU = await ercU.decimals();
            setUsdtDec(Number(decU));
            const balU = await ercU.balanceOf(address);
            setUsdtBal(formatAmount(balU, Number(decU)));
        }
        init();
    }, [ready, address, saleAddress]);
    async function approveErc20(token, spender, amount) {
        if (!isValidAddress(token) || !isValidAddress(spender)) {
            message.error("地址未配置或无效");
            throw new Error("invalid address");
        }
        const c = new ethers.Contract(token, erc20Abi, signer);
        const hide = message.loading({ content: "授权中...", duration: 0 });
        try {
            const tx = await c.approve(spender, amount);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u6388\u6743\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "授权成功");
        }
        catch (e) {
            message.error(e?.message || "授权失败");
            throw e;
        }
        finally {
            hide();
        }
    }
    async function onBuy() {
        if (!ready || !buyAmt) {
            message.warning("请连接钱包并输入金额");
            return;
        }
        if (!isValidAddress(usdtAddress) || !isValidAddress(saleAddress)) {
            message.error("地址未配置或无效");
            return;
        }
        const amt = parseAmount(buyAmt);
        if (!amt) {
            message.error("金额无效");
            return;
        }
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const sa = await sale.saleActive();
            if (!sa) {
                message.error("购买未开启");
                return;
            }
            const ke = await sale.kycEnabled();
            if (ke) {
                const wl = await sale.whitelist(address);
                if (!wl) {
                    message.error("需在白名单后才能购买");
                    return;
                }
            }
            const bl = await sale.blacklist(address);
            if (bl) {
                message.error("黑名单用户不可购买");
                return;
            }
            const ercU = new ethers.Contract(usdtAddress, erc20Abi, signer);
            const balU = await ercU.balanceOf(address);
            if (balU < amt) {
                message.error("USDT 余额不足");
                return;
            }
            const gnrDecNow = gnrDec;
            const usdtDecNow = usdtDec;
            if (gnrDecNow < usdtDecNow) {
                message.error("代币精度异常");
                return;
            }
            const factor = 10n ** BigInt(gnrDecNow - usdtDecNow);
            const needGnr = amt * factor;
            const inv = await sale.remainingInventory();
            if (inv < needGnr) {
                message.error("库存 GNR 不足");
                return;
            }
            await approveErc20(usdtAddress, saleAddress, amt);
            const hide = message.loading({ content: "购买中...", duration: 0 });
            const tx = await sale.buy(amt);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u8D2D\u4E70\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "购买成功");
        }
        catch (e) {
            message.error(e?.message || "购买失败");
        }
    }
    async function onStake() {
        if (!ready || !stakeAmt) {
            message.warning("请连接钱包并输入金额");
            return;
        }
        if (!isValidAddress(gnrAddress) || !isValidAddress(saleAddress)) {
            message.error("地址未配置或无效");
            return;
        }
        const amt = parseAmount(stakeAmt);
        const months = parseUint(stakeMonths);
        if (!amt || !months || months <= 0) {
            message.error("输入无效");
            return;
        }
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const c = await sale.cycleParams(months);
            if (!Boolean(c.allowed)) {
                message.error("该质押周期未开放");
                return;
            }
            const ke = await sale.kycEnabled();
            if (ke) {
                const wl = await sale.whitelist(address);
                if (!wl) {
                    message.error("需在白名单后才能质押");
                    return;
                }
            }
            const bl = await sale.blacklist(address);
            if (bl) {
                message.error("黑名单用户不可质押");
                return;
            }
            await approveErc20(gnrAddress, saleAddress, amt);
            const hide = message.loading({ content: "质押中...", duration: 0 });
            const tx = await sale.stake(amt, months);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u8D28\u62BC\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "质押成功");
        }
        catch (e) {
            message.error(e?.message || "质押失败");
        }
    }
    async function onWithdraw(id) {
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const hide = message.loading({ content: "提现中...", duration: 0 });
            const tx = await sale.withdrawMature(id);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u63D0\u73B0\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "提现成功");
        }
        catch (e) {
            message.error(e?.message || "提现失败");
        }
    }
    async function onEarlyExit(id) {
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const hide = message.loading({ content: "早退中...", duration: 0 });
            const tx = await sale.earlyExit(id);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u65E9\u9000\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "早退成功");
        }
        catch (e) {
            message.error(e?.message || "早退失败");
        }
    }
    async function onClaim(id) {
        if (!userClaimEnabled)
            return;
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const hide = message.loading({ content: "领取中...", duration: 0 });
            const tx = await sale.userClaimRewards(id);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u9886\u53D6\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "领取成功");
        }
        catch (e) {
            message.error(e?.message || "领取失败");
        }
    }
    return (_jsxs("div", { children: [_jsx(Typography.Paragraph, { type: "secondary", children: "\u8D2D\u4E70\u7528 USDT \u5151\u6362 GNR\uFF1B\u8D28\u62BC\u540E\u53EF\u5728\u5230\u671F\u63D0\u73B0\u6216\u9009\u62E9\u65E9\u9000\uFF1B\u9886\u53D6\u5229\u606F\u9700\u7BA1\u7406\u5458\u5F00\u542F\u7528\u6237\u9886\u606F\u5F00\u5173\u3002" }), _jsxs(Typography.Paragraph, { children: ["\u6211\u7684\u4F59\u989D GNR: ", gnrBal || "-", " \uFF5C USDT: ", usdtBal || "-"] }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx(Input, { placeholder: "USDT \u6570\u91CF", value: buyAmt, onChange: (e) => setBuyAmt(e.target.value) }), _jsx(Button, { type: "primary", onClick: onBuy, children: "\u8D2D\u4E70" })] }), _jsxs(Space, { wrap: true, style: { marginTop: 8 }, children: [_jsx(Tag, { color: "blue", children: "\u9009\u62E9\u5468\u671F\u5E76\u8F93\u5165\u91D1\u989D\u8FDB\u884C\u8D28\u62BC" }), _jsx(Input, { placeholder: "GNR \u6570\u91CF", value: stakeAmt, onChange: (e) => setStakeAmt(e.target.value) }), _jsx(Input, { placeholder: "\u8D28\u62BC\u6708\u6570", value: stakeMonths, onChange: (e) => setStakeMonths(e.target.value) }), _jsx(Button, { type: "primary", onClick: onStake, children: "\u8D28\u62BC" })] }), _jsxs("div", { style: { marginTop: 12 }, children: [_jsx(Button, { onClick: () => {
                            const rows = [["id", "amount", "months", "start", "end", "active", "earlyExit", "claimable"], ...stakes.map((s) => [s.id.toString(), s.amount.toString(), s.months.toString(), s.start.toString(), s.end.toString(), s.active ? "true" : "false", s.earlyExit ? "true" : "false", s.claimable.toString()])];
                            exportCsv(`user-${address}.csv`, rows);
                        }, children: "\u5BFC\u51FA\u6211\u7684\u8D28\u62BC" }), stakes.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map((s) => (_jsxs(Card, { size: "small", style: { marginBottom: 8 }, children: [_jsxs("div", { children: ["\u7F16\u53F7 ", s.id.toString(), " \u91D1\u989D ", formatAmount(BigInt(s.amount.toString()), gnrDec), " \u6708\u6570 ", s.months.toString()] }), _jsxs("div", { children: ["\u5230\u671F ", s.end.toString(), " \u6D3B\u8DC3 ", s.active ? "是" : "否", " \u65E9\u9000 ", s.earlyExit ? "是" : "否"] }), _jsxs("div", { children: ["\u53EF\u9886\u5229\u606F ", formatAmount(BigInt(s.claimable.toString()), gnrDec)] }), _jsxs(Space, { style: { marginTop: 4 }, children: [_jsx(Button, { onClick: () => onWithdraw(s.id), children: "\u5230\u671F\u63D0\u73B0" }), _jsx(Button, { onClick: () => onEarlyExit(s.id), children: "\u65E9\u9000" }), _jsx(Button, { disabled: !userClaimEnabled, onClick: () => onClaim(s.id), children: "\u9886\u53D6\u5229\u606F" })] })] }, s.id.toString()))), _jsxs(Space, { style: { marginTop: 8 }, children: [_jsxs(Typography.Text, { type: "secondary", children: ["\u7B2C ", page, " \u9875 / \u5171 ", Math.max(1, Math.ceil(stakes.length / pageSize)), " \u9875"] }), _jsx(Button, { onClick: () => setPage(Math.max(1, page - 1)), children: "\u4E0A\u4E00\u9875" }), _jsx(Button, { onClick: () => setPage(Math.min(Math.ceil(stakes.length / pageSize) || 1, page + 1)), children: "\u4E0B\u4E00\u9875" })] })] })] }));
}
