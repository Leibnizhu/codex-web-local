Language: English | [简体中文](./README.zh-CN.md)

# `npx @leibnizhu/codex-web-local`

A lightweight web interface for [Codex](https://github.com/openai/codex) that replicates the desktop UI and runs on top of the Codex `app-server`. It exposes Codex through a web application, allowing you to access your local Codex instance remotely from any browser.

## Prerequisites

- [Codex CLI](https://github.com/openai/codex) installed and available in your `PATH`

## Installation

```bash
# Run directly with npx (no install required)
npx @leibnizhu/codex-web-local

# Or install globally
npm install -g @leibnizhu/codex-web-local
```

## Usage

```
Usage: codex-web-local [options]

Web interface for Codex app-server

Options:
  -p, --port <port>    port to listen on (default: "3000")
  -d, --daemon         run in background (daemon mode)
  --password <pass>    set a specific password
  --no-password        disable password protection
  -h, --help           display help for command
```

## Examples

```bash
# Start with auto-generated password on default port 3000
codex-web-local

# Start on a custom port
codex-web-local --port 8080

# Start with a specific password
codex-web-local --password my-secret

# Start without password protection (use only on trusted networks)
codex-web-local --no-password

# Start in daemon mode (run in background)
codex-web-local --daemon

# Dev mode (Vite), expose to LAN
npm run dev -- --host 0.0.0.0

# Dev mode in daemon (background)
npm run dev -- --host 0.0.0.0 --daemon
```

When started with password protection (default), the server prints the password to the console. Open the URL in your browser, enter the password, and you're in.

## Daemon Notes

- `codex-web-local --daemon` runs the CLI server in background and prints `PID`.
- `npm run dev -- --daemon` runs the Vite dev server in background and prints `PID`.
- To stop a daemon process:

```bash
kill <PID>
```

## Contributing

Issues and pull requests are welcome! If you have ideas, suggestions, or found a bug, please open an issue on the [GitHub repository](https://github.com/pavel-voronin/codex-web-local/issues).

## License

[MIT](./LICENSE)
