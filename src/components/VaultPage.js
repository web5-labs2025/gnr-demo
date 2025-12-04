import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button, Input, Space, Typography, message } from "antd";
import { formatTxUrl } from "../utils/explorer";
import { isAddress, isValidAddress, parseAmount } from "../utils/validate";
import vaultAbi from "../abi/vault.json";
export default function VaultPage({ provider, signer, vaultAddress }) {
    const ready = useMemo(() => !!provider && !!signer && isValidAddress(vaultAddress), [provider, signer, vaultAddress]);
    const [balance, setBalance] = useState("");
    const [role, setRole] = useState("");
    const [addr, setAddr] = useState("");
    const [has, setHas] = useState(false);
    const [distTo, setDistTo] = useState("");
    const [distAmt, setDistAmt] = useState("");
    const [batchTo, setBatchTo] = useState("");
    const [batchAmt, setBatchAmt] = useState("");
    useEffect(() => {
        async function init() {
            if (!ready)
                return;
            const c = new ethers.Contract(vaultAddress, vaultAbi, signer);
            const b = await c.balance();
            setBalance(b.toString());
            const r = await c.DISTRIBUTOR_ROLE();
            setRole(r);
        }
        init();
    }, [ready, vaultAddress]);
    async function check() {
        const c = new ethers.Contract(vaultAddress, vaultAbi, signer);
        const hide = message.loading({ content: "检查中...", duration: 0 });
        try {
            const v = await c.hasRole(role, addr);
            setHas(Boolean(v));
            hide();
            message.success("检查完成");
        }
        catch (e) {
            hide();
            message.error(e?.message || "检查失败");
        }
    }
    async function grant() {
        const c = new ethers.Contract(vaultAddress, vaultAbi, signer);
        const hide = message.loading({ content: "授予中...", duration: 0 });
        try {
            if (!isAddress(addr)) {
                throw new Error("地址无效");
            }
            const tx = await c.grantRole(role, addr);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u6388\u4E88\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "授予成功");
        }
        catch (e) {
            hide();
            message.error(e?.message || "授予失败");
        }
    }
    async function revoke() {
        const c = new ethers.Contract(vaultAddress, vaultAbi, signer);
        const hide = message.loading({ content: "撤销中...", duration: 0 });
        try {
            if (!isAddress(addr)) {
                throw new Error("地址无效");
            }
            const tx = await c.revokeRole(role, addr);
            const r = await tx.wait();
            const url = await formatTxUrl(provider, tx.hash);
            hide();
            message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u64A4\u9500\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "撤销成功");
        }
        catch (e) {
            hide();
            message.error(e?.message || "撤销失败");
        }
    }
    return (_jsxs("div", { children: [_jsx(Typography.Paragraph, { type: "secondary", children: "\u91D1\u5E93\u7528\u4E8E\u53D1\u653E\u5956\u52B1\uFF1B\u9700\u5177\u5907 DISTRIBUTOR_ROLE \u624D\u80FD\u53D1\u653E\uFF0C\u652F\u6301\u5355\u7B14\u4E0E\u6279\u91CF\u53D1\u653E\u3002" }), _jsxs(Typography.Text, { children: ["\u91D1\u5E93\u4F59\u989D: ", balance || "-"] }), _jsxs(Space, { style: { marginTop: 8 }, children: [_jsx(Input, { placeholder: "\u5730\u5740", value: addr, onChange: (e) => setAddr(e.target.value) }), _jsx(Button, { onClick: check, children: "\u68C0\u67E5\u89D2\u8272" }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: has ? "已拥有 DISTRIBUTOR_ROLE" : "未拥有" })] }), _jsxs(Space, { style: { marginTop: 8 }, children: [_jsx(Button, { type: "primary", onClick: grant, children: "\u6388\u4E88" }), _jsx(Button, { danger: true, onClick: revoke, children: "\u64A4\u9500" })] }), has && (_jsxs(_Fragment, { children: [_jsxs(Space, { style: { marginTop: 8 }, children: [_jsx(Input, { placeholder: "\u53D1\u653E\u5730\u5740", value: distTo, onChange: (e) => setDistTo(e.target.value) }), _jsx(Input, { placeholder: "\u53D1\u653E\u91D1\u989D", value: distAmt, onChange: (e) => setDistAmt(e.target.value) }), _jsx(Button, { onClick: async () => { const c = new ethers.Contract(vaultAddress, vaultAbi, signer); const hide = message.loading({ content: "发放中...", duration: 0 }); try {
                                    if (!isAddress(distTo))
                                        throw new Error("地址无效");
                                    const a = parseAmount(distAmt);
                                    if (!a)
                                        throw new Error("金额无效");
                                    const tx = await c.distribute(distTo, a);
                                    const r = await tx.wait();
                                    const url = await formatTxUrl(provider, tx.hash);
                                    hide();
                                    message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u53D1\u653E\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "发放成功");
                                }
                                catch (e) {
                                    hide();
                                    message.error(e?.message || "发放失败");
                                } }, children: "\u53D1\u653E" })] }), _jsxs(Space, { style: { marginTop: 8 }, children: [_jsx(Input, { placeholder: "\u6279\u91CF\u5730\u5740,\u9017\u53F7\u5206\u9694", value: batchTo, onChange: (e) => setBatchTo(e.target.value) }), _jsx(Input, { placeholder: "\u6279\u91CF\u91D1\u989D,\u9017\u53F7\u5206\u9694", value: batchAmt, onChange: (e) => setBatchAmt(e.target.value) }), _jsx(Button, { onClick: async () => { const c = new ethers.Contract(vaultAddress, vaultAbi, signer); const tos = batchTo.split(",").map((x) => x.trim()).filter(Boolean); const amts = batchAmt.split(",").map((x) => x.trim()).filter(Boolean); const hide = message.loading({ content: "批量发放中...", duration: 0 }); try {
                                    if (!tos.length || tos.length !== amts.length)
                                        throw new Error("数量不一致");
                                    const addrOk = tos.every(isAddress);
                                    if (!addrOk)
                                        throw new Error("地址无效");
                                    const vals = amts.map((x) => parseAmount(x));
                                    if (vals.some((v) => !v))
                                        throw new Error("金额无效");
                                    const tx = await c.distributeBatch(tos, vals);
                                    const r = await tx.wait();
                                    const url = await formatTxUrl(provider, tx.hash);
                                    hide();
                                    message.success(url ? _jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "\u6279\u91CF\u53D1\u653E\u6210\u529F\uFF0C\u67E5\u770B\u4EA4\u6613" }) : "批量发放成功");
                                }
                                catch (e) {
                                    hide();
                                    message.error(e?.message || "批量发放失败");
                                } }, children: "\u6279\u91CF\u53D1\u653E" })] })] }))] }));
}
