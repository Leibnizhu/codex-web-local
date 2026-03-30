# AGENTS 与文档系统重整计划（2026-03-30）

## 背景与目标
- 背景：当前仓库已有 `AGENTS.md` 与 `docs/` 分层入口，但代理接手路径仍偏“说明式”，缺少可执行清单、场景路由和统一校验闭环。
- 目标：将 `AGENTS.md + docs/README.md + docs/*/README.md` 升级为“可直接执行”的接手系统，让新 AI agent 在最少上下文下快速找到入口、边界、验证命令与文档更新责任。

## 范围
- 重写并收敛代理入口规则：
  - `AGENTS.md`
- 强化文档导航与维护职责：
  - `docs/README.md`
  - `docs/runtime/README.md`
  - `docs/business/README.md`
  - `docs/contracts/README.md`
  - `docs/plans/README.md`
- 补充一份“代理接手 SOP”文档，作为执行模板：
  - `docs/runtime/agent-handoff.md`（新增）

## 非目标
- 不移动 `documentation/app-server-schemas/` 目录。
- 不调整源码目录与构建脚本。
- 不新增与本次重整无关的业务文档。

## 设计原则
- 最小改动：仅改动与代理接手相关文件，不做纯格式化修改。
- 单一入口：`AGENTS.md` 负责“先做什么”；`docs/` 各目录 README 负责“去哪里看”。
- 触发同步：将“什么变更必须改文档”写成明确规则。
- 可验证：改造后执行 `npm run build`，并检查链接与路径引用。

## 分步执行清单
1. 更新 `AGENTS.md`，增强以下要素：
   - 启动顺序（包含接手第一步检查项）
   - 多场景任务路由（运行类、契约类、重构类）
   - 计划前置条件和执行门禁
   - 验证闭环（构建、路径引用、链接可达）
2. 更新 `docs/README.md`，补充：
   - “按任务类型找文档”的路由表
   - 新文档放置决策规则（避免乱放）
   - 与 `AGENTS.md` 的职责边界
3. 更新 `docs/runtime/README.md`，并新增 `docs/runtime/agent-handoff.md`：
   - 给出代理接手标准流程（检查项、最小验证、交付说明）
   - 与 CLI/运行变更触发规则对齐
4. 更新 `docs/business/README.md`：
   - 明确业务文档最低结构模板（背景、流程、边界、验收）
5. 更新 `docs/contracts/README.md`：
   - 增加“契约变更 -> 文档更新 -> 代码验证”的一致性要求
   - 保留 `documentation/app-server-schemas/` 路径约束说明
6. 更新 `docs/plans/README.md`：
   - 增加计划文档模板约束（目标、范围、步骤、风险、验收）
   - 规范计划关闭标准与复盘要求
7. 全量检查：
   - 搜索旧路径与关键链接是否仍有效
   - 执行 `npm run build` 验证构建未受影响

## 风险与回滚
- 风险：文档规则过重导致执行成本上升。
  - 缓解：保持规则“短、硬、可执行”，避免大而全描述。
- 风险：新增文档与现有 README 职责重叠。
  - 缓解：在每个 README 开头写“本页职责”。
- 回滚：若出现歧义，优先保留当前仓库已有规则，仅下沉新增内容到 `docs/runtime/agent-handoff.md`。

## 验收标准
- 新代理可仅通过 `AGENTS.md` + `docs/README.md` 找到正确文档入口。
- `docs/*/README.md` 均包含：适用场景、更新触发、放置建议（或模板）。
- `documentation/app-server-schemas/` 的保留与维护规则保持明确。
- `npm run build` 通过。
- 关键文档链接可达（无断链）。

## 执行结果（2026-03-30）

### 已完成
1. 已更新 `AGENTS.md`：补充任务路由、计划门禁、验证闭环与契约一致性校验要求。
2. 已更新 `docs/README.md`：增加按任务类型入口、更新触发矩阵与代理接手推荐路径。
3. 已更新 `docs/runtime/README.md` 并新增 `docs/runtime/agent-handoff.md`：形成可执行接手 SOP。
4. 已更新 `docs/business/README.md`：补充业务文档最小模板。
5. 已更新 `docs/contracts/README.md`：补充契约一致性校验流程。
6. 已更新 `docs/plans/README.md`：补充计划关闭标准。

### 计划差异
- 无范围外改动；未调整源码目录、构建脚本或 `documentation/app-server-schemas/` 目录位置。

### 验证结果
- 构建验证通过：`npm run build`
  - `build:frontend` 成功
  - `build:cli` 成功

### 后续待办
- 若后续新增业务设计文档，可按 `docs/business/README.md` 的最小模板落档。
