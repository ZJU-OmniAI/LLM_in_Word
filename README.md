# word_edit · Word AI 改写助手

[English](README.en.md) · [安装与排错](docs/troubleshooting.md) · [技术说明](docs/architecture.md) · [参与开发](CONTRIBUTING.md)

在 Microsoft Word 中选中内容，用自然语言提出修改要求，预览差异后再写回文档。
支持本机 **Claude Code** 与 **Codex CLI**，沿用各自已登录的账户，可选择模型和思考强度。

> 当前支持 **macOS 桌面版 Word**。Windows 与 Word 网页版的安装流程尚未实现。

## 主要功能

- **多处一起改**：最多选择 8 处正文或表格，一条指令统一处理。
- **先预览再应用**：展示删除与新增内容，逐处应用或应用全部。
- **Word 修订**：默认保留修订，尽量迁移原有字体、加粗和段落格式。
- **表格编辑**：改单元格、增删行，也可把文字整理成表格；列数变化时可能重建表格。
- **文档问答**：针对所选内容或全文提问。
- **连续协作**：会话历史、输入草稿、参考附件、快捷指令及拖拽上传。
- **连接诊断**：查看 CLI 路径、版本、登录状态和可操作的错误提示。
- **可靠收尾**：支持流式输出、心跳、超时与取消；未完成的回答不能一键写入文档。

## 文档会发送哪些内容？

**选区限定修改范围，全文用于理解上下文。** 首轮或上下文变化时，正文会交给所选 CLI；超过约 11 万字符时，按目标附近截取。连续对话在上下文一致时复用 CLI 会话。

模型推理通常需要连接服务提供方，**本机后端不等于离线推理**。附件也会提供给所选 CLI。对话历史、草稿和 CLI 会话可能保存在本机。更多信息见 [数据与安全说明](SECURITY.md)。

## 安装

需要：

- macOS 与 Microsoft 365 桌面版 Word；修订 API 需相应 WordApi 支持。
- Node.js **22.12+（22.x）或 24+**。
- 至少安装并登录 Claude Code 或 Codex CLI，确认它能在终端正常运行。
- Git（通过克隆获取源码时）。

克隆本仓库后，在项目目录执行：

```bash
cd word_edit
./install.sh
```

安装会将运行代码复制到 `~/.word_edit/app/`，创建并信任 localhost HTTPS 证书，注册用户级 launchd 常驻服务，最后侧载 Word 加载项清单。首次信任证书可能需要输入 macOS 登录密码。

安装后：

1. 完全退出 Word（⌘Q），再重新打开。
2. 在「插入 → 加载项」的开发人员区域选择 **AI 改写**。
3. 此后可通过「开始」功能区的 **AI 改写** 按钮打开侧栏。

运行后端只使用 Node.js 内置模块，**首次使用无需安装 npm 依赖**。`npm ci` 用于安装测试所需的开发依赖。

## 使用

1. 在 Word 中选中文字，点侧栏的 **添加 Word 选中内容**；可重复添加多个目标。编辑表格时，将光标放入表格后添加。
2. 选择后端、模型和思考强度，输入指令，或选择润色、精简等快捷指令。
3. 点 **生成改写**。Enter 发送，Shift + Enter 换行。
4. 检查每处目标的差异预览，再点 **应用**。开启「保留修订」时，可在 Word 审阅中逐项接受或拒绝。
5. 应用成功的目标会自动移除；要继续修改该段，重新选中添加即可。

文档问答模式不会写回文档。参考附件支持 txt、md、csv、PDF 和常见图片格式；PDF 建议使用 Claude Code。

点击顶部连接状态可重新检测两个 CLI。检测只检查本机启动与登录状态，不调用模型生成，也不保证外部网络一定可用。

## 更新

拉取代码后运行：

```bash
git pull --ff-only
npm run update
```

已有运行目录会备份到 `~/.word_edit/app.backup.<时间>/`。更新模式沿用证书，不修改钥匙串。完成后在 Word 面板点 **⟳**；若加载项清单有变化，需要完全退出并重新打开 Word。

代理或 CLI 路径变更后，也可重新运行更新命令。

## 开发与测试

```bash
npm ci
npm test                 # 74 项回归检查；使用模拟 CLI，不需要账户或模型额度
npm run preview          # http://127.0.0.1:8380/taskpane.html
```

浏览器预览可检查界面与连接；实际读取和写回文档需要在 Word 加载项中操作。

真实后端测试使用合成内容，会调用已登录账户的模型，可能消耗额度：

```bash
npm run test:live         # Claude：生成、续聊、多目标、表格
npm run test:live:codex    # Codex：同上
node tools/test-server.js --wrapper  # 验证本机正式 HTTPS 安装
```

GitHub Actions 在 Linux 与 macOS 上运行离线回归测试，不配置模型凭证。它不测试真实 Word 的写回行为。

## 配置

| 环境变量 | 用途 | 默认值 |
| --- | --- | --- |
| `WORD_EDIT_CLAUDE_BIN` | Claude Code 可执行文件 | 自动发现 |
| `WORD_EDIT_CODEX_BIN` | Codex 可执行文件 | 自动发现 |
| `WORD_EDIT_TIMEOUT_MS` | 单次 CLI 总超时 | `300000` |
| `WORD_EDIT_MAX_CHARS` | 服务端正文上限 | `120000` |
| `WORD_EDIT_DATA_DIR` | 应用数据目录 | `~/.word_edit` |
| `WORD_EDIT_CERT_DIR` | HTTPS 证书目录 | `~/.word_edit/cert` |
| `WORD_EDIT_PORT` | 本机服务端口 | `8377` |

直接启动服务时可设置环境变量。launchd 安装模式由 `~/.word_edit/run.sh` 提供环境；手动修改后需重启服务。安装脚本默认端口固定为 8377，修改端口需要同时调整脚本和 `manifest.xml`。

## 限制

- 复杂的图片、域代码、文本框或无法对齐的 HTML 可能退回纯文本替换，部分格式需手动恢复。
- 合并单元格、跨正文与表格的混合选区暂不支持；表格应单独添加为目标。
- 模型返回的文字需要人工审阅，尤其是数据、引用和专业表述。
- CLI 行为可能随版本变化；本项目通过本机 CLI 调用，不提供 Microsoft、Anthropic 或 OpenAI 官方支持。
- 服务仅用于单用户本机运行，不应暴露到公网。

排错方式见 [常见问题](docs/troubleshooting.md)，更新记录见 [CHANGELOG](CHANGELOG.md)。

## 卸载

以下操作会删除本工具的运行目录、日志及运行目录备份：

```bash
launchctl bootout gui/$(id -u)/com.word_edit.server
rm -rf ~/.word_edit
rm -f ~/Library/LaunchAgents/com.word_edit.server.plist
rm -f ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/word_edit-manifest.xml
```

可在「钥匙串访问」中手动删除 `word_edit-localhost` 证书。CLI 自身保存的会话不随本工具卸载而删除。

## 许可证

本项目采用 [MIT License](LICENSE)。依赖、Office.js 及各 CLI 受各自许可证或服务条款约束。
