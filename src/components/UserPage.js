import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Card, Input, Space, message, Typography, Divider, Tag } from "antd";
import saleAbi from "../abi/sale.json";
import erc20Abi from "../abi/erc20.json";
import { formatTxUrl } from "../utils/explorer";
import { exportCsv } from "../utils/csv";
import { parseAmount, isValidAddress } from "../utils/validate";
import { formatAmount } from "../utils/format";
export default function UserPage({ provider, signer, address, saleAddress, gnrAddress, usdtAddress }) {
    const [buyAmt, setBuyAmt] = useState("");
    const [stakeAmt, setStakeAmt] = useState("");
    const [faucetUsdtAmt, setFaucetUsdtAmt] = useState("");
    const [faucetGnrAmt, setFaucetGnrAmt] = useState("");
    const [aprBP, setAprBP] = useState(0);
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
            const apr = await sale.aprBP();
            setAprBP(Number(apr));
            const res = await sale.listUserStakes(address, 0, 100);
            const n = Number(res[0]);
            const items = [];
            for (let i = 0; i < n && i < res[1].length; i++) {
                items.push({ id: res[1][i], amount: res[2][i], start: res[3][i], active: res[4][i], claimable: res[5][i] });
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
    async function reload() {
        if (!ready)
            return;
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const apr = await sale.aprBP();
            setAprBP(Number(apr));
            const res = await sale.listUserStakes(address, 0, 100);
            const n = Number(res[0]);
            const items = [];
            for (let i = 0; i < n && i < res[1].length; i++) {
                items.push({ id: res[1][i], amount: res[2][i], start: res[3][i], active: res[4][i], claimable: res[5][i] });
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
        catch { }
    }
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
        if (!amt) {
            message.error("输入无效");
            return;
        }
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
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
            const hide = message.loading({ content: "质押中...", duration: 0 });
            const tx = await sale.stake(amt);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u8D28\u62BC\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "质押成功");
        }
        catch (e) {
            message.error(e?.message || "质押失败");
        }
    }
    async function onCancel(id) {
        try {
            const sale = new ethers.Contract(saleAddress, saleAbi, signer);
            const hide = message.loading({ content: "取消中...", duration: 0 });
            const tx = await sale.cancelStake(id);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u5DF2\u53D6\u6D88\u8D28\u62BC\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "已取消质押");
        }
        catch (e) {
            message.error(e?.message || "取消失败");
        }
    }
    async function onFaucetUSDT() {
        if (!ready || !faucetUsdtAmt) {
            message.warning("请连接钱包并输入USDT最小单位数量（6位精度）");
            return;
        }
        if (!isValidAddress(usdtAddress)) {
            message.error("USDT地址未配置或无效");
            return;
        }
        const amt = parseAmount(faucetUsdtAmt);
        if (!amt) {
            message.error("金额无效，示例：1000000=1 USDT");
            return;
        }
        try {
            const mockUsdtAbi = [{ inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" }];
            const usdt = new ethers.Contract(usdtAddress, mockUsdtAbi, signer);
            const hide = message.loading({ content: "领取USDT中...", duration: 0 });
            const tx = await usdt.mint(address, amt);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u9886\u53D6USDT\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "领取USDT成功");
            await reload();
        }
        catch (e) {
            message.error(e?.message || "领取USDT失败");
        }
    }
    async function onFaucetGNR() {
        if (!ready || !faucetGnrAmt) {
            message.warning("请连接钱包并输入GNR最小单位数量（18位精度）");
            return;
        }
        if (!isValidAddress(saleAddress) || !isValidAddress(usdtAddress) || !isValidAddress(gnrAddress)) {
            message.error("地址未配置或无效");
            return;
        }
        const gnrWant = parseAmount(faucetGnrAmt);
        if (!gnrWant) {
            message.error("金额无效，示例：1000000000000000000=1 GNR");
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
                    message.error("需在白名单后才能领取GNR");
                    return;
                }
            }
            const bl = await sale.blacklist(address);
            if (bl) {
                message.error("黑名单用户不可领取");
                return;
            }
            const factor = 10n ** BigInt(gnrDec - usdtDec);
            const needUsdt = (gnrWant + factor - 1n) / factor;
            const inv = await sale.remainingInventory();
            if (inv < gnrWant) {
                message.error("库存 GNR 不足");
                return;
            }
            const mockUsdtAbi = [{ inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" }];
            const usdt = new ethers.Contract(usdtAddress, mockUsdtAbi, signer);
            await usdt.mint(address, needUsdt);
            await approveErc20(usdtAddress, saleAddress, needUsdt);
            const hide = message.loading({ content: "领取GNR中...", duration: 0 });
            const tx = await sale.buy(needUsdt);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u9886\u53D6GNR\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "领取GNR成功");
            await reload();
        }
        catch (e) {
            message.error(e?.message || "领取GNR失败");
        }
    }
    return (_jsxs("div", { children: [_jsx(Typography.Paragraph, { type: "secondary", children: "\u8D2D\u4E70\u7528 USDT \u5151\u6362 GNR\uFF1B\u8D28\u62BC\u4E3A\u9501\u5B9A\u6A21\u578B\uFF08\u4F59\u989D\u53EF\u89C1\u4F46\u4E0D\u53EF\u8F6C\uFF09\uFF0C\u53EF\u968F\u65F6\u53D6\u6D88\uFF1B\u5229\u606F\u4E3A\u56FA\u5B9A APR \u7EBF\u6027\u7D2F\u8BA1\uFF0C\u5355\u4F4D GNR\uFF0C\u4EC5\u7528\u4E8E\u5C55\u793A\u4E0E\u5BFC\u51FA\u3002" }), _jsxs(Typography.Paragraph, { children: ["\u6211\u7684\u4F59\u989D GNR: ", gnrBal || "-", " \uFF5C USDT: ", usdtBal || "-"] }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx(Input, { placeholder: "USDT \u6570\u91CF", value: buyAmt, onChange: (e) => setBuyAmt(e.target.value) }), _jsx(Button, { type: "primary", onClick: onBuy, children: "\u8D2D\u4E70" })] }), _jsxs(Space, { wrap: true, style: { marginTop: 8 }, children: [_jsxs(Tag, { color: "blue", children: ["\u8F93\u5165\u91D1\u989D\u8FDB\u884C\u8D28\u62BC\uFF08APR ", aprBP, " / ", (aprBP || 0) / 100, "%\uFF09"] }), _jsx(Input, { placeholder: "GNR \u6570\u91CF", value: stakeAmt, onChange: (e) => setStakeAmt(e.target.value) }), _jsx(Button, { type: "primary", onClick: onStake, children: "\u8D28\u62BC" })] }), _jsx(Divider, {}), _jsxs(Card, { size: "small", title: "\u6D4B\u8BD5\u4EE3\u5E01\u9886\u53D6", children: [_jsx(Typography.Paragraph, { type: "secondary", children: "USDT \u4E3A 6 \u4F4D\u7CBE\u5EA6\uFF0C\u793A\u4F8B\uFF1A1000000 = 1 USDT\uFF1BGNR \u4E3A 18 \u4F4D\u7CBE\u5EA6\uFF0C\u793A\u4F8B\uFF1A1000000000000000000 = 1 GNR\u3002" }), _jsxs(Space, { style: { marginBottom: 8 }, children: [_jsx(Input, { placeholder: "USDT \u6700\u5C0F\u5355\u4F4D\u6570\u91CF\uFF08\u793A\u4F8B\uFF1A1000000=1 USDT\uFF09", value: faucetUsdtAmt, onChange: (e) => setFaucetUsdtAmt(e.target.value) }), _jsx(Button, { onClick: onFaucetUSDT, children: "\u9886\u53D6 USDT" })] }), _jsxs(Space, { children: [_jsx(Input, { placeholder: "GNR \u6700\u5C0F\u5355\u4F4D\u6570\u91CF\uFF08\u793A\u4F8B\uFF1A1000000000000000000=1 GNR\uFF09", value: faucetGnrAmt, onChange: (e) => setFaucetGnrAmt(e.target.value) }), _jsx(Button, { onClick: onFaucetGNR, children: "\u9886\u53D6 GNR" })] })] }), _jsxs("div", { style: { marginTop: 12 }, children: [_jsx(Button, { onClick: () => {
                            const rows = [["id", "amount", "start", "active", "claimable_gnr"], ...stakes.map((s) => [s.id.toString(), s.amount.toString(), s.start.toString(), s.active ? "true" : "false", s.claimable.toString()])];
                            exportCsv(`user-${address}.csv`, rows);
                        }, children: "\u5BFC\u51FA\u6211\u7684\u8D28\u62BC" }), stakes.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map((s) => (_jsxs(Card, { size: "small", style: { marginBottom: 8 }, children: [_jsxs("div", { children: ["\u7F16\u53F7 ", s.id.toString(), " \u91D1\u989D ", formatAmount(BigInt(s.amount.toString()), gnrDec)] }), _jsxs("div", { children: ["\u5F00\u59CB ", s.start.toString(), " \u6D3B\u8DC3 ", s.active ? "是" : "否"] }), _jsxs("div", { children: ["\u53EF\u89C6\u5229\u606F(GNR) ", formatAmount(BigInt(s.claimable.toString()), gnrDec)] }), _jsx(Space, { style: { marginTop: 4 }, children: _jsx(Button, { onClick: () => onCancel(s.id), children: "\u53D6\u6D88\u8D28\u62BC" }) })] }, s.id.toString()))), _jsxs(Space, { style: { marginTop: 8 }, children: [_jsxs(Typography.Text, { type: "secondary", children: ["\u7B2C ", page, " \u9875 / \u5171 ", Math.max(1, Math.ceil(stakes.length / pageSize)), " \u9875"] }), _jsx(Button, { onClick: () => setPage(Math.max(1, page - 1)), children: "\u4E0A\u4E00\u9875" }), _jsx(Button, { onClick: () => setPage(Math.min(Math.ceil(stakes.length / pageSize) || 1, page + 1)), children: "\u4E0B\u4E00\u9875" })] })] })] }));
}
