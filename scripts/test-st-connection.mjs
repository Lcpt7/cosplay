/**
 * 独立测试脚本：验证 SillyTavern 连接并输出角色列表
 *
 * 用法：
 *   1. 确认 .env.local 已填入真实 ST_BASIC_USER / ST_BASIC_PASS
 *   2. 运行：node scripts/test-st-connection.mjs
 *
 * 只输出角色数量和名称，不输出密码、Authorization 头或 CSRF Token。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------- 读取 .env.local ----------
function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  let content = '';
  try {
    content = readFileSync(path, 'utf-8');
  } catch {
    console.error('错误：找不到 .env.local，请先创建并填入 ST_BASIC_USER / ST_BASIC_PASS');
    process.exit(1);
  }
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const ST_URL = 'http://8.217.107.14:8000';
const env = loadEnvLocal();

if (!env.ST_BASIC_USER || !env.ST_BASIC_PASS || env.ST_BASIC_USER === 'your_username') {
  console.error('错误：.env.local 中 ST_BASIC_USER / ST_BASIC_PASS 未填写真实凭据');
  process.exit(1);
}

const auth = Buffer.from(`${env.ST_BASIC_USER}:${env.ST_BASIC_PASS}`).toString('base64');

// ---------- 1. 获取 CSRF Token ----------
let token;
let cookieHeader = '';
try {
  const csrfRes = await fetch(`${ST_URL}/csrf-token`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!csrfRes.ok) {
    console.error(`CSRF token 获取失败: ${csrfRes.status} ${csrfRes.statusText}`);
    process.exit(1);
  }
  // Node fetch 不自动持久化 Cookie，必须手动提取 Set-Cookie 用于后续请求
  // SillyTavern 用 CSRF double-submit cookie：POST 需同时带 X-CSRF-Token header + 对应 cookie
  const setCookies =
    csrfRes.headers.getSetCookie?.() ??
    (csrfRes.headers.get('set-cookie') ? [csrfRes.headers.get('set-cookie')] : []);
  cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
  token = (await csrfRes.json()).token;
} catch (e) {
  console.error('连接 SillyTavern 失败，请检查网络或服务器状态:', e.message);
  process.exit(1);
}

// ---------- 2. 获取角色列表 ----------
try {
  const charRes = await fetch(`${ST_URL}/api/characters/all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      Authorization: `Basic ${auth}`,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
  if (!charRes.ok) {
    console.error(`角色列表获取失败: ${charRes.status} ${charRes.statusText}`);
    process.exit(1);
  }
  const data = await charRes.json();
  const characters = Array.isArray(data) ? data : (data.characters || data.object || []);

  // ---------- 3. 输出结果（只输出角色信息） ----------
  console.log('=== SillyTavern 角色列表 ===');
  console.log(`角色数量: ${characters.length}`);
  console.log('角色名称:');
  for (const c of characters) {
    console.log(`  - ${c.name || c.avatar || '(未命名)'}`);
  }
  console.log('=== 测试完成 ===');
} catch (e) {
  console.error('获取角色列表时出错:', e.message);
  process.exit(1);
}