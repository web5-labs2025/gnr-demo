import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ethers } from "ethers";
import { Button, Typography } from "antd";
export default function Wallet({ onConnected }) {
    const [addr, setAddr] = useState("");
    async function connect() {
        const anyWindow = window;
        if (!anyWindow.ethereum)
            return;
        const provider = new ethers.BrowserProvider(anyWindow.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const a = await signer.getAddress();
        setAddr(a);
        onConnected(provider, signer, a);
    }
    return (_jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx(Button, { type: "primary", onClick: connect, children: "\u8FDE\u63A5\u94B1\u5305" }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: addr ? `已连接: ${addr}` : "未连接" })] }));
}
