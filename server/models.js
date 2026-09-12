// 模型列表：Claude 稳定别名；Codex app-server 分页查询，5 分钟缓存。
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CODEX_BIN, spawnEnv } from './config.js';

// Claude 使用稳定别名，刷新列表不再启动四次模型生成请求。
const CLAUDE_MODELS = [['sonnet', 'Sonnet · 均衡'], ['opus', 'Opus · 深度'], ['haiku', 'Haiku · 快速']];
const PROBE_TIMEOUT = 12000;

// 走 codex app-server 的 JSON-RPC：initialize → model/list，拿到列表即杀进程
function listCodexModels() {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(CODEX_BIN, ['app-server'], { env: spawnEnv(), stdio: ['pipe', 'pipe', 'ignore'] });
    } catch { resolve(null); return; }
    const send = (o) => { try { child.stdin.write(JSON.stringify(o) + '\n'); } catch {} };
    let buf = '';
    let done = false;
    const all = [];
    const cursors = new Set();
    const finish = (val) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { child.kill('SIGKILL'); } catch {}
      resolve(val);
    };
    const timer = setTimeout(() => finish(null), PROBE_TIMEOUT);
    child.stdin.on('error', () => {});
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        let m = null;
        try { m = JSON.parse(line); } catch { continue; }
        if (m && m.id === 1) {
          if (m.error) { finish(null); return; }
          send({ jsonrpc: '2.0', method: 'initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'model/list', params: { includeHidden: false } });
        } else if (m && m.id === 2) {
          const data = m.result && Array.isArray(m.result.data) ? m.result.data : null;
          if (!data) { finish(null); return; }
          all.push(...data.filter((x) => !x.hidden));
          const cursor = m.result.nextCursor;
          if (cursor && !cursors.has(cursor) && cursors.size < 20) {
            cursors.add(cursor);
            send({ jsonrpc: '2.0', id: 2, method: 'model/list', params: { includeHidden: false, cursor } });
          } else finish(all);
        }
      }
    });
    child.on('error', () => finish(null));
    child.on('close', () => finish(null));
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'model-probe', version: '1.0' } } });
  });
}

// ~/.codex/config.toml 里 model = "..."（用户自己配的默认模型，可能不在服务器列表里）
function codexConfigModel() {
  try {
    const t = readFileSync(path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'config.toml'), 'utf8');
    const m = t.match(/^\s*model\s*=\s*"([^"]+)"/m);
    return m ? m[1] : null;
  } catch { return null; }
}

async function fetchModels() {
  const codexData = await listCodexModels();
  const claude = CLAUDE_MODELS;
  const efforts = { codex: {} };

  let codex = null;
  if (codexData) {
    const cfgModel = codexConfigModel();
    const serverDefault = (codexData.find((x) => x.isDefault) || {}).id || null;
    codex = [['(default)', `默认 · ${cfgModel || serverDefault || '按 codex 配置'}`]];
    if (cfgModel && !codexData.some((x) => (x.model || x.id) === cfgModel)) {
      codex.push([cfgModel, `${cfgModel}（配置默认）`]);
    }
    for (const x of codexData) {
      const id = x.model || x.id;
      if (!id) continue;
      codex.push([id, x.displayName || id]);
      const levels = (x.supportedReasoningEfforts || []).map((e) => typeof e === 'string' ? e : e.reasoningEffort).filter(Boolean);
      if (levels.length) efforts.codex[id] = levels;
      if (x.isDefault && levels.length) efforts.codex['(default)'] = levels;
    }
    if (cfgModel) {
      if (efforts.codex[cfgModel]) efforts.codex['(default)'] = efforts.codex[cfgModel];
      else delete efforts.codex['(default)'];
    }
  }

  return {
    claude,
    efforts,
    sources: { claude: 'aliases', codex: codex ? 'cli' : 'unavailable' },
    warnings: codex ? [] : ['Codex 模型列表暂时不可用，保留上次列表；可在连接设置中检查 CLI。'],
    codex,
    fetchedAt: new Date().toISOString(),
  };
}

// 5 分钟缓存 + 进行中的探测只跑一份
let cache = null;
let inflight = null;
export function getModels(force = false) {
  if (!force && cache && Date.now() - cache.at < 5 * 60 * 1000) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = fetchModels()
    .then((data) => {
      if (data.claude || data.codex) cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => { inflight = null; });
  return inflight;
}
