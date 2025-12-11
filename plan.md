# Demo 前端方案与计划

## 1. 功能边界（覆盖所有合约）

- 合约 `GNRToken`（ERC20 代币）
  - 查看总供应与用户余额（读取 `MAX_SUPPLY` 与 `balanceOf`）。源文件：`contracts/GNRToken.sol:7`
  - 质押锁定模型（需求）：钱包余额可见但锁定部分不可转账；由质押合约调用 `lock/unlock`（接口在代币层实现）。
- 合约 `GNRVault`（GNR 发放金库）
  - 展示金库余额（`balance()`）。源文件：`contracts/GNRVault.sol:19`
  - 管理员角色：授予/撤销 `DISTRIBUTOR_ROLE`。函数参考：`contracts/GNRVault.sol:21`, `contracts/GNRVault.sol:27`
  - 发放接口：`distribute`, `distributeBatch`（用于集中发奖）。源文件：`contracts/GNRVault.sol:21`, `contracts/GNRVault.sol:27`
- 合约 `GNRStakingSale`（售卖+质押）
  - 全局状态与参数展示：`saleActive`、`kycEnabled`、金库库存 `remainingInventory()`。
  - 用户操作（需求）：购买 `buy(usdtAmount)`、质押锁定 `stake(amount)`（不选周期）、取消质押 `cancelStake(stakeId)`（随时取消、无罚金）、查询 `listUserStakes`；固定 `APR(BP)` 参数，利息单位 `GNR`，仅视图展示。
  - 管理员操作（需求）：开关与名单管理；导出质押列表；通过金库批量发奖 `distributeBatch`（发奖金额由项目方输入）。

## 2. 页面设计（为演示顺利）

- 顶部连接钱包与网络选择
  - 输入并缓存四个地址：`GNRStakingSale`、`GNRVault`、`GNRToken(GNR)`、`USDT`。
  - 网络通过钱包注入（Metamask），仅演示链上已部署合约。
- 页面结构（四个页签）：
  - 总览 Dashboard
    - 展示：库存（`remainingInventory`）、全量质押概览（活跃数量/总锁定）、基础风控开关状态。
  - 用户交互 User
    - 购买区：输入 USDT 数量 → 执行 `approve(USDT→Sale)` → `buy`。
    - 质押区：输入 GNR 数量 → `approve(GNR→Sale)` → `stake`（锁定，无周期）。
    - 我的质押：`listUserStakes` 展示锁定金额、开始时间、当前状态与可视利息（GNR）。
    - 操作按钮：取消质押 `cancelStake`（随时取消、无罚金）。
  - 管理 Admin（仅当连接账户为合约 `owner` 时显示）
    - 全局开关：`setSaleActive`、`setKycEnabled`。
    - 名单管理：白名单/黑名单增删。
    - 导出质押列表：按筛选条件导出 CSV。
    - 批量发奖：读取 CSV（地址+金额）→ 通过金库 `distributeBatch` 发奖。
    - 项目钱包变更：`setProjectWallet`。
    - 暂停与恢复：`pause`/`unpause`。
  - 金库 Vault
    - 展示金库余额 `balance`。
    - 角色管理：授予/撤销 `DISTRIBUTOR_ROLE`（需要管理员权限）。

## 3. 技术栈选择

- 前端框架：Vite + React + TypeScript（轻量、启动快、易于演示）。
- 链上交互：`ethers v6`（与现有脚本一致的心智模型）。
- UI：简洁组件（例如 Ant Design 或最简单的自定义组件），为避免额外依赖，优先使用原生 CSS + 轻量组件。
- 状态管理：React 内部 `useState`/`useReducer` 足够。
- 连接钱包：原生 `window.ethereum` 注入 + `ethers.BrowserProvider`。
- 合约 ABI：从 `artifacts` 或源码生成；演示阶段可使用预编译生成的 ABI 文件，或在 `demo` 下维护一份独立 ABI JSON（不改动主工程）。

## 4. 实施计划（里程碑）

- M1：搭建 `demo` 工程骨架（Vite + React + TS），建立地址输入与钱包连接模块。
- M2：完成读取页（Dashboard）：库存、全量质押概览与风控开关展示。
- M3：用户操作流：`buy`、`stake`（锁定）、`cancelStake`；包含 `approve` 引导与错误提示。
- M4：管理员面板：开关、名单管理、导出质押列表、批量发奖（金库）。
- M5：金库面板：余额展示与角色管理（grant/revoke）。
- M6：联调与演示脚本：提供本地/测试网地址配置模板与一键演示说明。

## 5. 数据与安全注意事项

- 所有写操作均在调用前检查权限与当前合约状态（例如 `saleActive`、`paused`、`userClaimEnabled`）。
- 对 `approve` 与余额进行前置校验，并在失败时给出明确的提示。
- 管理员操作区域仅在 `owner` 地址连接时显示（读取 `owner()` 进行比对）。
- 避免在前端打印或持久化任何私钥、助记词，地址仅用于交互与缓存（localStorage）。

## 6. 合约功能引用（便于开发联调）

- 购买：`contracts/GNRStakingSale.sol:140`
- 质押（锁定）：`contracts/GNRStakingSale.sol:155`（需求将改为锁定模型）
- 取消质押：`cancelStake(stakeId)`（需求新增，随时取消、无罚金）
- 白/黑名单：`contracts/GNRStakingSale.sol:103`-`contracts/GNRStakingSale.sol:106`
- 开关设置：`contracts/GNRStakingSale.sol:85`-`contracts/GNRStakingSale.sol:88`
- 暂停/恢复：`contracts/GNRStakingSale.sol:100`
- 金库余额：`contracts/GNRVault.sol:19`
- 金库发放：`contracts/GNRVault.sol:21`, `contracts/GNRVault.sol:27`


# 其他
1、一定每一个阶段设计完成之后，自己检查一遍，并自测通过！
2、在每一个阶段完成之后，要与团队成员进行review，确保没有遗漏或错误。
3、在每一个阶段完成之后，要与团队成员进行测试，确保没有问题。
4、在每一个阶段完成之后，要与团队成员进行沟通，确保没有问题。
5、演示前端统一采用成熟UI组件库（Ant Design），避免视觉过于粗糙。
6、提供测试网/本地地址模板与一键填充，减少配置成本。
7、前端所有写操作增加失败提示与状态反馈，便于现场演示。
8、对地址与数值输入进行基本校验与格式化，防止误操作。
9、管理员权限严格比对 `owner()`，非管理员隐藏或禁用相关按钮。
10、ABI 与合约地址的来源与版本需在演示前确认一致，避免调用错误。
11、预览与构建脚本固定：`npm run build`、`npm run preview`，演示使用 `http://localhost:4173/`。
12、如需切换网络或账户，要求现场刷新并重新加载地址配置，保证状态一致。