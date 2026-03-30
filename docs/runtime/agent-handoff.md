# Agent Handoff SOP（运行与交付）

## 使用场景
- 新代理刚接手本仓库，不确定先看什么、先验什么。
- 任务涉及运行方式、CLI 参数、文档入口或跨目录协作。

## 接手步骤（按顺序）
1. 读取根目录 `AGENTS.md`，确认边界与门禁规则。
2. 读取 `docs/README.md`，定位任务入口目录。
3. 若任务满足计划条件（超过 3 个文件、涉及契约/目录/构建），先在 `docs/plans/` 写计划并确认。
4. 仅做与任务直接相关的最小改动，不做纯格式化修改。
5. 若涉及协议或消息结构，先检查 `docs/contracts/README.md` 与 `documentation/app-server-schemas/` 约束。
6. 若涉及运行命令或 CLI 参数，同时更新 `README.md`、`README.zh-CN.md` 与 `docs/runtime/`。
7. 修改完成后执行 `npm run build`。
8. 如有路径变化，用全文搜索确认旧路径引用已清理。
9. 检查新增或变更的文档链接可达。
10. 交付说明中写清：改了什么、为什么改、如何验证。

## 快速口径
- 入口：`AGENTS.md` + `docs/README.md`
- 门禁：命中计划条件先写 `docs/plans/`
- 验证：至少执行一次 `npm run build`
- 红线：不移动 `documentation/app-server-schemas/`

## 最小交付清单
- 变更范围明确（文件列表可追踪）。
- 文档更新与代码变更一致。
- 构建验证通过。
- 未触碰 `documentation/app-server-schemas/` 目录位置。
