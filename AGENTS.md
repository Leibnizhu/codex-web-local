# AGENTS

## 启动顺序
1. 先读本文件，明确工作边界与验证要求。
2. 再读 [docs/README.md](./docs/README.md) 找到目标文档分层。
3. 涉及 API 协议或消息结构时，进入 [docs/contracts/README.md](./docs/contracts/README.md)。
4. 多步骤改造或跨目录重构前，先在 `docs/plans/` 写计划文档。

## 根规则
- 使用中文沟通，提交信息标题使用中文。
- 只做与任务直接相关的最小改动，不做纯格式化修改。
- 不主动回退或覆盖他人变更；如发现冲突，先确认再处理。
- 本仓库当前代码引用 `documentation/app-server-schemas` 作为类型来源，未经明确确认不要移动该目录。

## 什么时候先写计划
满足任一条件时，先在 `docs/plans/` 创建计划文档并获得确认后再动代码：
- 预计改动超过 3 个文件。
- 涉及协议契约、目录结构、构建脚本或发布流程。
- 需要跨前后端联动验证。

## 文档分层
- `docs/runtime/`：运行、调试、排障、部署。
- `docs/business/`：业务流程与设计说明。
- `docs/contracts/`：API/Schema 等机器可读契约与其索引文档。
- `docs/plans/`：多步骤执行计划与复盘。
- 历史产物目录 `documentation/`：当前存放 app-server schema 物料，供代码与文档引用。

## 变更触发的文档同步要求
出现以下变更时，必须同步更新文档：
- CLI 参数、启动命令、运行方式变化：更新 `README.md` 与 `docs/runtime/`。
- 协议字段、事件、方法变化：更新 `docs/contracts/` 与相关契约索引。
- 目录路径变化：更新所有 README 与文档内链接。
- 多步骤方案执行：在 `docs/plans/` 补充过程与结果。

## 按目录工作的规则
- `src/`：功能实现与类型使用。
- `documentation/app-server-schemas/`：协议契约产物（JSON/TS），优先保持可追溯与可复用。
- `docs/`：面向人类的导航、说明、计划，不存放可执行代码。

## 验证要求
- 至少执行一次构建验证：`npm run build`。
- 如涉及路径调整，必须全量搜索旧路径并修正引用。
- 声明完成前，确认新增文档链接可达且层级一致。

## 提交流程约定
- 本次会话默认不执行 `git add`/`git commit`，由用户自行决定提交时机。
- 需要提交说明时，使用 Conventional Commits，`subject` 采用中文并准确描述改动。