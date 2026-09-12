# word_edit · AI rewriting for Microsoft Word

[中文](README.md) · [Contributing](CONTRIBUTING.md) · [Data and security](SECURITY.md)

Select content in Word, describe your changes, review the diff, and apply the result with tracked changes. word_edit runs a local backend that calls your installed **Claude Code** or **Codex CLI**, using its existing login.

Currently supports **desktop Microsoft Word on macOS**. Windows and Word for the web are not supported by the installer.

## Features

- Rewrite up to eight separate text or table targets with one instruction.
- Preview insertions and deletions before applying changes.
- Preserve tracked changes and migrate formatting where the document structure permits.
- Edit tables or turn selected text into a table.
- Ask questions about selected content or the document.
- Save drafts and conversation history, attach reference files, and reuse compatible CLI sessions.
- Inspect local CLI paths, versions, and login status; cancel or retry failed requests.

## Data handling

**The selection defines what gets changed, not all of what the model sees.** The first request, or a changed context, provides document text to the selected CLI. Documents beyond approximately 110,000 characters are trimmed around targets. Model inference usually connects to the CLI provider; this is not an offline-only tool. Attachments and CLI conversation history may also contain document information.

The local service binds to `127.0.0.1`. Do not expose it to the internet. See [SECURITY.md](SECURITY.md) for details.

## Install

Requirements: macOS, Microsoft 365 desktop Word, Node.js 22.12+ on the 22.x line or 24+, and at least one installed and authenticated CLI.

Clone and install the repository (access is required while it remains private):

```bash
git clone https://github.com/ZJU-OmniAI/word_edit.git
cd word_edit
./install.sh
```

The installer copies runtime files into `~/.word_edit/app/`, creates a local HTTPS certificate, registers a user-level launchd service, and installs the Word add-in manifest. Initial certificate trust may require your macOS password.

Quit Word completely, reopen it, and select **AI 改写** from the developer add-ins area. The interface is currently in Chinese. The runtime has no external npm dependencies.

## Develop

```bash
npm ci
npm test
npm run preview
```

Preview runs at `http://127.0.0.1:8380/taskpane.html`. Reading or modifying a document requires the actual Word add-in.

The 74 regression checks use a mock CLI and require no model credentials. Optional live tests use synthetic text and may consume account quota:

```bash
npm run test:live
npm run test:live:codex
```

GitHub Actions runs offline tests on Linux and macOS. It does not exercise the real Word application.

## Update

```bash
git pull --ff-only
npm run update
```

The previous runtime directory is backed up. Refresh the Word pane afterward; manifest changes require restarting Word completely.

For configuration, known limitations, and uninstall instructions, see the [Chinese README](README.md). Complex document structures may fall back to plain-text replacement, so review output and formatting before accepting changes.

## License

[MIT](LICENSE). Dependencies, Office.js, and CLI tools remain subject to their own licenses or service terms. This is an independent project, not an official Microsoft, Anthropic, or OpenAI product.
