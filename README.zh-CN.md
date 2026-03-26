语言：简体中文 | [English](./README.md)

# `npx @leibnizhu/codex-web-local`

一个轻量的 [Codex](https://github.com/openai/codex) Web 界面，复刻桌面端交互体验，并运行在 Codex `app-server` 之上。它把本地 Codex 通过 Web 应用暴露出来，让你可以在任意浏览器里远程访问本地 Codex 实例。

## 前置要求

- 已安装 [Codex CLI](https://github.com/openai/codex)，并且可在 `PATH` 中访问

## 安装

```bash
# 直接用 npx 运行（无需安装）
npx @leibnizhu/codex-web-local

# 或全局安装
npm install -g @leibnizhu/codex-web-local
```

## 用法

```
Usage: codex-web-local [options]

Web interface for Codex app-server

Options:
  -p, --port <port>    监听端口（默认: "3000"）
  -d, --daemon         后台运行（守护进程模式）
  --password <pass>    设置固定访问密码
  --no-password        关闭密码保护
  -h, --help           显示帮助
```

## 示例

```bash
# 默认 3000 端口启动，并自动生成访问密码
codex-web-local

# 指定端口启动
codex-web-local --port 8080

# 指定访问密码启动
codex-web-local --password my-secret

# 关闭密码保护（仅建议在可信网络中使用）
codex-web-local --no-password

# 后台启动（守护进程模式）
codex-web-local --daemon

# 开发模式（Vite），监听局域网
npm run dev -- --host 0.0.0.0

# 开发模式后台运行
npm run dev -- --host 0.0.0.0 --daemon
```

默认开启密码保护时，服务会在控制台打印密码。浏览器打开 URL 后输入密码即可访问。

## 守护进程说明

- `codex-web-local --daemon` 会让 CLI 服务在后台运行，并打印 `PID`。
- `npm run dev -- --daemon` 会让 Vite 开发服务在后台运行，并打印 `PID`。
- 停止后台进程：

```bash
kill <PID>
```

## 贡献

欢迎提交 issue 和 PR。如果你有想法、建议或发现了 bug，欢迎在 [GitHub 仓库](https://github.com/pavel-voronin/codex-web-local/issues) 提交反馈。

## 许可证

[MIT](./LICENSE)
