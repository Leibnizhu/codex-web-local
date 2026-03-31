# Model Reasoning Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让推理程度下拉只展示当前模型真实支持的选项，并在模型切换时自动回退到有效默认值。

**Architecture:** 以 `model/list` 返回的模型能力作为单一事实来源，在 API 层缓存每个模型支持的推理程度和默认值。状态层在模型切换和初始化时校验当前选择，展示层只渲染当前模型支持的选项，并在发送请求前做一次兜底过滤。

**Tech Stack:** Vue 3、TypeScript、Codex app-server schema、Vite

---

### Task 1: 接入模型推理能力

**Files:**
- Modify: `src/api/appServerDtos.ts`
- Modify: `src/api/codexGateway.ts`

**Steps:**
1. 在 `src/api/appServerDtos.ts` 补充 `Model` 与 `ReasoningEffortOption` 类型导出。
2. 在 `src/api/codexGateway.ts` 定义模型推理能力缓存结构。
3. 在 `getAvailableModelIds()` 中读取 `supportedReasoningEfforts` 和 `defaultReasoningEffort` 并缓存。
4. 暴露查询当前模型推理能力的只读方法。

### Task 2: 校验状态与回退

**Files:**
- Modify: `src/composables/useDesktopState.ts`

**Steps:**
1. 增加基于当前模型校验 `selectedReasoningEffort` 的辅助函数。
2. 在模型列表刷新完成后执行一次校验和回退。
3. 在用户切换模型时执行同样的校验和回退。

### Task 3: 按模型动态展示

**Files:**
- Modify: `src/components/content/ThreadComposer.vue`

**Steps:**
1. 使用模型能力查询接口生成当前模型的推理程度选项。
2. 不支持的选项直接隐藏。
3. 若当前模型没有推理能力数据或可选项为空，隐藏推理下拉。

### Task 4: 请求兜底与验证

**Files:**
- Modify: `src/api/codexGateway.ts`

**Steps:**
1. 在 `startThreadTurn()` 中仅当当前模型支持时才发送 `params.effort`。
2. 执行 `npm run build` 验证前端与 CLI 构建。
3. 如有需要，在计划文档补充实际执行结果。

### 风险与回滚

- 风险：模型能力缓存与当前选中模型不同步，导致下拉短暂为空或错误回退。
- 回滚：移除缓存与动态过滤逻辑，恢复静态下拉与原始 `turn/start` 参数行为。

### 验收与验证

- 切换不同模型时，推理程度下拉只显示该模型支持项。
- 当前已选推理程度不受新模型支持时，自动回退到该模型默认值。
- `turn/start` 对无效推理程度不再发送 `effort` 字段。
- 验证命令：`npm run build`

## 实际执行结果

- 已完成：`src/api/appServerDtos.ts` 增加模型能力类型导出。
- 已完成：`src/api/codexGateway.ts` 接入模型推理能力缓存，并在 `turn/start` 前过滤无效 `effort`。
- 已完成：`src/composables/useDesktopState.ts` 在模型切换和模型配置刷新后回退到有效推理程度。
- 已完成：`src/components/content/ThreadComposer.vue` 只展示当前模型支持的推理程度；无可用能力时隐藏下拉。

## 与原计划差异

- 无功能性偏差，按原计划完成。

## 验证结果

- 已执行：`npm run build`
- 结果：前端构建与 CLI 构建均通过。
