/**
 * SillyTavern API 封装
 *
 * 通过 Vite dev proxy /st-api 转发到远程 SillyTavern 服务器。
 * Basic Auth 凭据在 Vite 服务端代理层注入，不进入浏览器 bundle。
 * CSRF Token 运行时动态获取，不硬编码。
 */

const ST_BASE = '/st-api';

// ================================================================
// 渠道配置 — 主备切换
// ================================================================

/** 单个 API 渠道配置 */
interface ChannelConfig {
  name: string;
  customUrl: string;
  model: string;
  /** SillyTavern secret_id — 指定使用哪个已存储的 API Key（UUID，非密钥本身） */
  secretId: string;
}

/** 主渠道：硅基流动 Qwen */
const PRIMARY_CHANNEL: ChannelConfig = {
  name: 'Qwen',
  customUrl: 'https://api.siliconflow.cn/v1',
  model: 'Qwen/Qwen2.5-7B-Instruct',
  secretId: '9c8d45a6-20b4-4245-a740-421ce401bdd5',
};

/** 备用渠道：智谱 GLM */
const FALLBACK_CHANNEL: ChannelConfig = {
  name: 'GLM',
  customUrl: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4.5-air',
  secretId: 'ee7b3c79-905a-4c12-b580-922d41daca68',
};

let csrfToken: string | null = null;

/** 获取 CSRF Token（带缓存） */
export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${ST_BASE}/csrf-token`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`CSRF token 获取失败: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  csrfToken = (data as { token: string }).token;
  return csrfToken;
}

/** SillyTavern 角色信息（列表接口返回的精简字段） */
export interface STCharacter {
  name: string;
  avatar?: string;
  description?: string;
  personality?: string;
  first_mes?: string;
}

/** SillyTavern 角色卡完整数据（/api/characters/get 返回） */
export interface STCharacterDetails {
  name: string;
  avatar: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  tags?: string[];
  creatorcomment?: string;
  talkativeness?: string;
}

/**
 * 调用 POST /api/characters/all 获取 SillyTavern 中的全部角色。
 * 已在服务器端验证该端点可用，当前返回 5 个角色。
 */
export async function fetchCharactersFromST(): Promise<STCharacter[]> {
  const token = await getCsrfToken();
  const res = await fetch(`${ST_BASE}/api/characters/all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`角色列表获取失败: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // 兼容多种可能返回格式：数组 / { characters: [] } / { object: [] }
  if (Array.isArray(data)) return data as STCharacter[];
  if (Array.isArray((data as { characters?: unknown[] }).characters)) {
    return (data as { characters: STCharacter[] }).characters;
  }
  if (Array.isArray((data as { object?: unknown[] }).object)) {
    return (data as { object: STCharacter[] }).object;
  }
  return [];
}

/**
 * 调用 POST /api/characters/get 获取指定角色的完整角色卡。
 * @param avatar 角色列表中返回的 avatar 字段值（如 "Shenhe.png"）
 */
export async function fetchCharacterDetails(avatar: string): Promise<STCharacterDetails> {
  const token = await getCsrfToken();
  const res = await fetch(`${ST_BASE}/api/characters/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
    credentials: 'include',
    body: JSON.stringify({ avatar_url: avatar }),
  });
  if (!res.ok) {
    throw new Error(`角色详情获取失败: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as STCharacterDetails;
}

// ================================================================
// 聊天生成 API
// ================================================================

/** OpenAI 格式消息 */
export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** generateReply 选项 */
export interface GenerateReplyOptions {
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  signal?: AbortSignal;
}

/**
 * 调用 POST /api/backends/chat-completions/generate 发送聊天生成请求。
 *
 * 默认使用主渠道（硅基流动 Qwen），如果因余额不足、限流、模型不可用等
 * 服务端错误失败，自动切换到备用渠道（智谱 GLM）。
 * 用户主动取消或网络断开不会触发切换。
 *
 * @param options 请求选项
 * @param onChunk 每次收到新内容片段时的回调
 * @returns 完整回复文本（所有 chunk 拼接）
 */
export async function generateReply(
  options: GenerateReplyOptions,
  onChunk: (chunk: string) => void,
): Promise<string> {
  let hasContent = false;
  const trackingOnChunk = (chunk: string) => {
    hasContent = true;
    onChunk(chunk);
  };

  console.info('[generateReply] 尝试主渠道:', PRIMARY_CHANNEL.name, '模型:', PRIMARY_CHANNEL.model);

  try {
    return await tryChannel(PRIMARY_CHANNEL, options, trackingOnChunk);
  } catch (primaryErr) {
    if (options.signal?.aborted) {
      console.info('[generateReply] 用户已取消请求，不切换');
      throw primaryErr;
    }
    if (hasContent) {
      console.info('[generateReply] 主渠道已输出部分内容，不切换');
      throw primaryErr;
    }
    if (!isRetryableError(primaryErr)) {
      console.warn('[generateReply] 主渠道错误不可重试:', primaryErr instanceof Error ? primaryErr.message : primaryErr);
      throw primaryErr;
    }

    console.warn(
      '[generateReply] 主渠道失败，切换到备用渠道:',
      FALLBACK_CHANNEL.name, '模型:', FALLBACK_CHANNEL.model,
      '失败原因:', primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
    );

    try {
      return await tryChannel(FALLBACK_CHANNEL, options, trackingOnChunk);
    } catch (fallbackErr) {
      if (options.signal?.aborted) throw fallbackErr;
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error('[generateReply] 主备渠道均失败:', { primary: primaryMsg, fallback: fallbackMsg });
      throw new Error(`主渠道(${PRIMARY_CHANNEL.name})失败: ${primaryMsg}；备用渠道(${FALLBACK_CHANNEL.name})失败: ${fallbackMsg}`);
    }
  }
}

/**
 * 向单个渠道发送生成请求并解析 SSE 流。
 */
async function tryChannel(
  channel: ChannelConfig,
  options: GenerateReplyOptions,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const token = await getCsrfToken();

  const requestBody = {
    messages: options.messages,
    model: channel.model,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.max_tokens ?? 512,
    stream: true,
    top_p: options.top_p ?? 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    top_k: -1,
    stop: null,
    logit_bias: null,
    seed: null,
    n: 1,
    chat_completion_source: 'custom',
    custom_url: channel.customUrl,
    secret_id: channel.secretId,
  };

  const res = await fetch(`${ST_BASE}/api/backends/chat-completions/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
    credentials: 'include',
    body: JSON.stringify(requestBody),
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err = new Error(`[${channel.name}] HTTP ${res.status} ${res.statusText} ${errText.slice(0, 200)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  if (!res.body) {
    throw new Error(`[${channel.name}] 响应没有可读流`);
  }

  return parseSSEStream(res.body, onChunk, options.signal);
}

/**
 * 判断错误是否适合切换到备用渠道。
 *
 * 可重试：402（余额不足）、429（限流）、5xx（服务端错误）、400（模型不可用等）
 * 不可重试：AbortError（用户取消）、TypeError（网络断开）
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return false;
    if (err.name === 'TypeError') return false;
    const status = (err as Error & { status?: number }).status;
    if (typeof status === 'number') {
      return status === 400 || status === 402 || status === 429 || status >= 500;
    }
  }
  return false;
}

/**
 * 解析标准 OpenAI SSE 流。
 *
 * 处理以下情况：
 * - 一次读取包含多条 data: 事件
 * - 一条事件被拆分到多个网络数据块（用 buffer 缓冲）
 * - data: [DONE] 表示流结束
 * - 空内容或非内容事件（跳过）
 * - 连接中断（reader.read 抛出异常）
 */
async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 事件之间用空行（\n\n）分隔
      const events = buffer.split('\n\n');
      // 最后一段可能不完整，保留在 buffer
      buffer = events.pop() ?? '';

      for (const event of events) {
        const chunk = extractDeltaContent(event);
        if (chunk === null) return fullText; // [DONE]
        if (chunk) {
          fullText += chunk;
          onChunk(chunk);
        }
      }
    }

    // 处理 buffer 中可能残留的最后一个事件
    buffer += decoder.decode();
    if (buffer.trim()) {
      const chunk = extractDeltaContent(buffer);
      if (chunk && chunk !== null) {
        fullText += chunk;
        onChunk(chunk);
      }
    }
  } catch (err) {
    // AbortSignal 取消时 reader.read 会抛出 AbortError，属于正常行为
    if (signal?.aborted) {
      return fullText;
    }
    throw err;
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * 从一个 SSE 事件块中提取所有 delta.content 文本。
 * @returns 拼接后的内容文本；null 表示遇到 [DONE]；空字符串表示无内容
 */
function extractDeltaContent(event: string): string | null {
  let result = '';
  let done = false;

  for (const line of event.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const data = trimmed.slice(5).trim();
    if (!data) continue;
    if (data === '[DONE]') {
      done = true;
      continue;
    }

    try {
      const json = JSON.parse(data);
      const content = json?.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content) {
        result += content;
      }
    } catch {
      // 非 JSON 数据行，跳过
    }
  }

  if (done) return null;
  return result;
}