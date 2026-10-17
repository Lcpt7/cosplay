/**
 * Cloudflare Pages Function — 代理 /st-api/* 到远程 SillyTavern 服务器。
 *
 * 本地开发时由 Vite dev proxy 处理（vite.config.ts），不经过此文件。
 * 线上部署到 Cloudflare Pages 后，Vite proxy 不运行，由此 Function 接管。
 *
 * 环境变量（在 Cloudflare Pages Dashboard → Settings → Environment variables 配置）：
 *   ST_BASIC_USER  — SillyTavern Basic Auth 用户名
 *   ST_BASIC_PASS  — SillyTavern Basic Auth 密码
 *   ST_BACKEND_URL — SillyTavern 服务器地址（可选，有默认值）
 */

interface Env {
  ST_BASIC_USER: string;
  ST_BASIC_PASS: string;
  ST_BACKEND_URL: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  params: { path?: string[] };
}

const DEFAULT_BACKEND = 'http://8.217.107.14:8000';

/** 不转发给上游的请求头（Cloudflare / 代理注入的） */
const DROP_REQUEST_HEADERS = [
  'host',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'cf-ewait-time',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-real-ip',
];

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env, params } = context;

  // ── 构造上游 URL ──────────────────────────────────────────
  const pathSegments = params.path ?? [];
  const backendBase = (env.ST_BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, '');
  const subPath = pathSegments.join('/');
  const upstreamUrl = new URL(`${backendBase}/${subPath}`);
  // 保留 query string
  const reqUrl = new URL(request.url);
  for (const [key, value] of reqUrl.searchParams) {
    upstreamUrl.searchParams.set(key, value);
  }

  // ── 构造请求头 ────────────────────────────────────────────
  const reqHeaders = new Headers(request.headers);
  for (const h of DROP_REQUEST_HEADERS) {
    reqHeaders.delete(h);
  }

  // 注入 Basic Auth（从 Cloudflare 环境变量读取，不硬编码）
  const user = env.ST_BASIC_USER;
  const pass = env.ST_BASIC_PASS;
  if (user && pass && user !== 'your_username') {
    const auth = btoa(`${user}:${pass}`);
    reqHeaders.set('Authorization', `Basic ${auth}`);
  }

  // ── 转发请求 ──────────────────────────────────────────────
  const init: RequestInit = {
    method: request.method,
    headers: reqHeaders,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl.toString(), init);
  } catch (err) {
    return jsonError(502, 'UPSTREAM_UNREACHABLE', `无法连接到 SillyTavern 服务器: ${String(err)}`);
  }

  // ── 处理响应头 ────────────────────────────────────────────
  const resHeaders = new Headers(upstreamRes.headers);

  // 重写 Set-Cookie：去掉 domain 属性，让浏览器使用当前 Pages 域名
  const setCookies = (resHeaders as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  if (setCookies && setCookies.length > 0) {
    resHeaders.delete('Set-Cookie');
    for (const cookie of setCookies) {
      const rewritten = cookie.replace(/;\s*domain=[^;]*/gi, '');
      resHeaders.append('Set-Cookie', rewritten);
    }
  }

  // 保留上游状态码、头和流式 body（SSE 透传）
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  });
}

function jsonError(status: number, code: string, detail: string): Response {
  return new Response(JSON.stringify({ error: code, detail }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}