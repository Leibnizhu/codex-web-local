# 文档总览

本目录提供项目文档入口，优先按下面顺序查阅：

1. [运行与调试](./runtime/README.md)
2. [业务与设计](./business/README.md)
3. [协议与契约](./contracts/README.md)
4. [实施计划](./plans/README.md)

## 分层原则
- 运行问题优先看 `runtime/`。
- 协议字段、消息结构、schema 索引优先看 `contracts/`。
- 复杂改造先在 `plans/` 写计划，再执行。

## 新文档放置规则
- 启动、部署、联调、排障：`runtime/`
- 业务流程、模块设计、约束说明：`business/`
- OpenAPI / JSON Schema / 事件协议 / 生成规则：`contracts/`
- 多步骤任务拆解、里程碑、验收：`plans/`

## 文档更新触发
- 命令行参数或运行命令变更：同步更新 `README.md` 与 `runtime/`。
- 契约或 schema 变更：同步更新 `contracts/`。
- 目录/文件路径变更：同步更新所有引用链接。