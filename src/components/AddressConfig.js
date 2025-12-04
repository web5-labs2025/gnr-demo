import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input, Space } from "antd";
export default function AddressConfig({ saleAddress, vaultAddress, gnrAddress, usdtAddress, onChange }) {
    return (_jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsx(Input, { addonBefore: "Sale", value: saleAddress, onChange: (e) => onChange("sale", e.target.value), placeholder: "0x..." }), _jsx(Input, { addonBefore: "Vault", value: vaultAddress, onChange: (e) => onChange("vault", e.target.value), placeholder: "0x..." }), _jsx(Input, { addonBefore: "GNR", value: gnrAddress, onChange: (e) => onChange("gnr", e.target.value), placeholder: "0x..." }), _jsx(Input, { addonBefore: "USDT", value: usdtAddress, onChange: (e) => onChange("usdt", e.target.value), placeholder: "0x..." })] }));
}
