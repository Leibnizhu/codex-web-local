# APP SERVER 文档（中文）

本文基于 [openai/codex](https://github.com/openai/codex) 的 app-server protocol 源码整理。

## 本地 schema 物化结果

所有 schema 已从上游 codegen（含 experimental）导出到：

- `../../documentation/app-server-schemas/json`
- `../../documentation/app-server-schemas/typescript`

- Bundle: [codex_app_server_protocol.schemas.json](../../documentation/app-server-schemas/json/codex_app_server_protocol.schemas.json)
- Root index: [ClientRequest.json](../../documentation/app-server-schemas/json/ClientRequest.json), [ServerRequest.json](../../documentation/app-server-schemas/json/ServerRequest.json), [ServerNotification.json](../../documentation/app-server-schemas/json/ServerNotification.json)

## Client -> Server Methods（完整列表）

> 详细方法索引见原始文档：`../../documentation/APP_SERVER_DOCUMENTATION.md`

| 列名 | 含义 |
| --- | --- |
| Method | 客户端调用的方法名 |
| Params Schema | 参数 schema 链接 |
| Response Schema | 响应 schema 链接 |
| Experimental | 稳定性标记 |
| UI 区域 | 在界面中的主要消费区域 |

### UI 区域对照

- 导航与会话加载
- 会话控制
- 内容区（动态消息）
- 内容区（静态/服务消息）
- 控制与设置（鉴权/账号）
- 控制与设置（系统集成）
- 控制与设置（反馈/诊断）
- 工具执行控制

## 全量 schema 索引

完整 JSON/TypeScript 文件索引已在原始文档维护：
- [原始索引文档](../../documentation/APP_SERVER_DOCUMENTATION.md)

## 完整性统计

统计口径见原始文档末尾 “Проверка полноты / 完整性检查” 小节。

为避免重复维护导致偏差，建议以原始索引文档为单一事实来源。