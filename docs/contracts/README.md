# Contracts 文档

## 目标
记录本项目的机器可读契约及其维护规则，避免协议与实现脱节。

## 契约资产
- 说明文档（中文）：[APP_SERVER_DOCUMENTATION.zh-CN.md](./APP_SERVER_DOCUMENTATION.zh-CN.md)
- schema 产物目录：`documentation/app-server-schemas/`
  - JSON: `documentation/app-server-schemas/json/`
  - TypeScript: `documentation/app-server-schemas/typescript/`

## 为什么保留 `documentation/app-server-schemas`
- `src/api/appServerDtos.ts` 直接从该目录导入 TypeScript 类型。
- 该目录同时作为协议索引文档的链接目标。
- 若直接迁移目录，会影响构建路径与文档链接。

## 何时需要重生成
出现以下情况时，应重新从 upstream 协议生成 schema 并回填该目录：
- 上游 app-server 方法/事件发生新增或变更
- 需要同步新的 experimental 字段
- TypeScript 类型与运行时协议出现不一致

## 生成与落盘规则
- 生成来源：`openai/codex` app-server protocol codegen
- 落盘目录保持为 `documentation/app-server-schemas/`
- 如未来确需迁移，必须同时更新：
  - `src/api/appServerDtos.ts` 导入路径
  - `docs/contracts/` 中所有文档链接
  - 任何脚本里的输出路径