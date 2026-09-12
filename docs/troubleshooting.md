# 常见问题

| 症状 | 处理 |
| --- | --- |
| 面板顶部「本机服务未运行」 | `tail -20 ~/.word_edit/server.log` 看原因；重启：`launchctl kickstart -k gui/$(id -u)/com.word_edit.server` |
| 面板整个空白 | ① 证书信任没生效：重跑 `./install.sh`；还不行就双击 `~/.word_edit/cert/localhost-cert.pem` 手动导入钥匙串设「始终信任」，重开 Word。② 系统代理没绕过本机：在代理客户端（Clash 等）的绕过/bypass 列表里确认有 `localhost, 127.0.0.1` |
| 命令行 curl 测服务"连不上" | 本机回环被 shell 里的代理劫持了（curl 会走 `https_proxy`），加 `--noproxy '*'` 再测：`curl -sk --noproxy '*' https://127.0.0.1:8377/api/ping` |
| 「插入→加载项」里找不到 AI 改写 | 确认 `~/Library/.../wef/` 里有 manifest（重跑 install.sh），**完全退出** Word 再开；公司账号可能被管理员禁侧载 |
| claude 报 403/网络错误 | 代理变了，重跑 `./install.sh` 刷新垫片里的代理 |
| 「请求失败：Load failed」 | 连接被网页视图掐断。已加 15 秒心跳保活、45 秒流读取看门狗及默认 5 分钟 CLI 总超时；仍出现时请检查服务日志（看 `~/.word_edit/server.log` 有无 `[uncaught]`）|
| 应用时提示"目标已丢失" | 锚定控件被删了（比如整段被删除），重新选中一段设为目标 |
| 改完发现局部加粗没了 | 看应用后的提示：若显示"按纯文本写入"，是该段结构复杂触发了回退（表格/图片/HTML 对不齐），开修订模式能看到丢了什么，手动补 |
| 换行/分段不对 | 反馈一下具体样例——`\n→\r` 的段落映射在你的 Word 版本上可能有差异 |
