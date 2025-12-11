前端部署与集成指南（BSC 测试网与本地开发）

概览
- 目标链：BSC 测试网（chainId=97）与本地 Hardhat（chainId=31337）
- 合约组件：GNRToken（包含锁定逻辑）、GNRVault（库存发放）、GNRStakingSale（买入/质押/视图）、MockUSDT（6 位精度，测试用）
- 页面行为：自动检测网络与合约部署状态，必要时提示“Sale 合约在当前网络未部署或地址错误”并提供切换按钮

环境准备
- Node.js 18+、npm
- 仓库根目录运行一次依赖安装：`npm install`
- 前端依赖在 demo 目录：首次开发时 `cd demo && npm install`

地址配置（demo/.env）
- 必填：
  - `VITE_SALE_ADDRESS`：GNRStakingSale 地址
  - `VITE_VAULT_ADDRESS`：GNRVault 地址
  - `VITE_GNR_ADDRESS`：GNRToken 地址
  - `VITE_USDT_ADDRESS`：USDT 或 MockUSDT 地址（6 位精度）
  - `VITE_TARGET_CHAIN_ID`：目标链 ID（BSC 测试网=97，本地=31337）
- BSC 测试网当前演示地址：
  - `VITE_SALE_ADDRESS=0x97eC496eF14CC2cdEbE6Ff7fDdBB52A1CE11EA7a`
  - `VITE_VAULT_ADDRESS=0xCdFa904D4E72a16E2141b3f8e5fF24d1876350EB`
  - `VITE_GNR_ADDRESS=0x1A00EaCC9206C50D50AdA9c4C864C5B20b8ef8E5`
  - `VITE_USDT_ADDRESS=0x62aFDD110bebA849A84cDADfd1386e0a12f0679C`
  - `VITE_TARGET_CHAIN_ID=97`

启动与网络
- 本地启动：`cd demo && npm run dev`
- 页面右上角显示当前网络与链 ID；当链 ID 与 `VITE_TARGET_CHAIN_ID` 不一致或 `Sale` 未部署时，显示错误提示与“切换到目标网络”按钮
- 连接钱包后，页面将使用钱包网络与签名器进行交互

功能验证流程
- 地址配置卡片：从环境变量自动填充，可在页面内手动修改并写入 localStorage
- 买入 GNR：
  - 通过 USDT 支付，`usdtAmount` 为最小单位（6 位精度）。示例：`1000000 = 1 USDT`
  - 先 `approve` USDT 给 `Sale`，再调用 `buy(usdtAmount)`；页面的 Faucet GNR 流程会自动完成这两步
- 质押与取消：
  - `stake(amount)` 将锁定对应数量的 GNR，期间用户仅能转移未锁定余额
  - `cancelStake(stakeId)` 取消后解锁余额，可正常转账
- 利息查看：
  - `claimableInterestGNR(stakeId)` 返回基于固定 APR 的可领取利息（仅视图，不发放）
  - APR 由后端在部署或运维脚本中设置（例如 `APR_BP=500` 表示 5%）

Faucet（测试代币领取）
- USDT 领取：
  - 输入最小单位数量（示例：`1000000` 表示 `1 USDT`）
  - 调用 MockUSDT 的 `mint(address, amount)` 完成发放
- GNR 领取：
  - 自动 `approve` USDT 给 `Sale`，随后调用 `buy(usdtAmount)` 获得等额 GNR（按精度换算）
- 交互提示：成功后展示交易链接（浏览器支持时）并自动刷新页面数据

常见提示与处理
- “Sale 合约在当前网络未部署或地址错误”：
  - 检查 `demo/.env` 地址是否正确；确认钱包所连网络与 `VITE_TARGET_CHAIN_ID` 一致
  - 点击切换按钮以切换到目标网络（BSC 测试网=97）
- 买入失败或回滚：
  - 确认已对 `Sale` 合约执行 USDT 的 `approve`
  - 后端可能启用了 `KYC_ENABLED` 或黑名单：需要后端放行
- 利息显示为 0：
  - 后端未设置 APR；由后端调用 `setAprBP` 后，间隔一段时间再查看

本地开发网络（可选）
- 启动：根目录运行 `npx hardhat node`
- 部署：根目录运行 `npx hardhat run scripts/deploy.ts --network localhost`
- 将输出地址填入 `demo/.env` 并设置 `VITE_TARGET_CHAIN_ID=31337`，然后 `npm run dev`

注意事项
- 不要在主网使用 MockUSDT；仅用于测试/演示
- 前端仅需要公开地址与链 ID；后端 `.env` 中的私钥不应出现在前端代码或配置中