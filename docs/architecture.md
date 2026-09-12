# 技术说明

- **保格式替换的原理**：应用时先 `getHtml()` 拿目标段带格式的 HTML，拍平成"每个字符 + 行内格式链 + 所在段落"，
  与新文本做逐字 diff（中文按单字、英文按词，先掐公共前后缀）：未变字符沿用原格式链，新增字符继承被替换处/左邻格式，
  段落按新文本换行重排并克隆来源段落元素；重建结果**自校验**（拍平回来必须与新文本一字不差）后才 `insertHtml`，
  任何环节失败都退回 `insertText` 纯文本——宁可丢格式不写坏内容。Word 导出 HTML 里的排版性断行有三档容错对齐。
  prompt 里也要求模型"没必要改的词句逐字保留"，改动越少格式锚得越准
- **TCC**：launchd 拉起的 node 读 `~/Desktop` 会被 macOS 隐私权限拦（zsh 的完全磁盘访问罩不住子进程），
  所以 install.sh 把运行文件**拷到 `~/.word_edit/app/` 再跑**，绕开整个问题。改代码后要重跑 install.sh 同步
- **必须 HTTPS**：Word 的任务窗格是 https 上下文，manifest 里的本机地址必须 https 且证书受信任。
  install.sh 用 openssl 自签（SAN=localhost，**有效期 800 天**——macOS 要求 ≤825 天否则拒信）并加入登录钥匙串。
  可以用 `openssl x509 -enddate -noout -in ~/.word_edit/cert/localhost-cert.pem` 查看有效期。过期后：删掉 `~/.word_edit/cert` 重跑 install.sh 即可
- **流式心跳**：codex 的回答常常整块最后才到，中间几十秒零字节；Word 的 WKWebView 对 60 秒没有数据的连接
  按空闲超时掐断（面板报"请求失败：Load failed"）。服务端每 15 秒发一行 `{type:'ping'}` 保活（面板忽略）。
- **代理烤入**：launchd/Word 拉起的进程不带 ~/.zshrc 的代理变量，claude 直连会 403。
  install.sh 把安装时的代理写死进 `~/.word_edit/run.sh`；**代理端口变了就重跑一次**
- **段落符**：Word 内部段落标记是 `\r`、软回车是 `\v`。读出来统一转 `\n` 再比对/发模型，写回时 `\n` 转回 `\r`
- **office.js 必须走微软 CDN**（官方要求）；加载失败面板会提示
- 侧载目录：`~/Library/Containers/com.microsoft.Word/Data/Documents/wef/`，改 manifest 后要完全退出 Word 重开才生效
- 加载项 ID：`357a0a80-3537-4833-b135-a8177994730f`（manifest.xml 里固定，重装不失效）


## 源码结构

- `server/server.js`：HTTPS、本机 API、请求收尾。
- `server/cli.js` / `server/process.js`：CLI 适配、事件解析、进程生命周期。
- `server/models.js` / `server/health.js`：模型列表与本机诊断。
- `server/prompt.js`：全文上下文、多目标改写与续聊提示。
- `taskpane/taskpane.js`：Office.js、目标锚定、格式迁移与面板状态。
- `taskpane/table-utils.js`：表格协议、解析及差异比较。

## 请求流程

首轮携带正文、目标与指令，CLI 完成后保存会话 ID。上下文和进度相符时续聊；明确的会话失效可重建一次。接口通过 NDJSON 返回事件，只有完成且无错误的回答才可应用。
