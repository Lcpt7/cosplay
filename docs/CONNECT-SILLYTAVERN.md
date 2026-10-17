# 连接 SillyTavern 后端指南

> 让 cosplay 前端通过 SillyTavern API 生成真实 AI 回复（硅基流动模型）

---

## 整体架构

```
浏览器
  ↓
React 前端 (localhost:5173)
  ↓ Vite dev proxy /st-api/*
SillyTavern 后端 (你的服务器:8000)
  ↓ SillyTavern 已配置好的连接
硅基流动 OpenAI 兼容 API (免费模型)
```

**为什么经过 SillyTavern 而不是直连硅基流动？**
- 复用 ST 里已配好的模型、预设、角色卡
- API Key 留在 ST 端，不暴露给前端
- ST 处理 prompt 构建、上下文管理

---

## 第一部分：SillyTavern 端配置

### 1. 确认 ST 允许外部连接

编辑 SillyTavern 根目录的 `config.yaml`（不是 `default/config.yaml`）：

```yaml
# 允许监听外部连接（Docker 通常已开启）
listen: true
```

### 2. 配置访问控制（二选一）

#### 方案 A：白名单（推荐，简单）

```yaml
whitelist:
  - 127.0.0.1
  - ::1
  # 如果你从本机访问 ST
  # 如果前端跑在另一台机器，加上那台机器的 IP
  # 例如：
  # - 192.168.1.100
```

#### 方案 B：Basic Auth

```yaml
basicAuthMode: true
basicAuthUser:
  username: "你的用户名"
  password: "你的密码"
```

### 3. 确认模型已配置

在 SillyTavern 网页界面里：
1. 顶部 API 连接 → 选择 **Chat Completion** 源
2. 选择 **OpenAI** (硅基流动兼容 OpenAI 格式)
3. 填入硅基流动的 API Key
4. 填入硅基流动的 API 地址：`https://api.siliconflow.cn/v1`
5. 选择一个免费模型（如 `Qwen/Qwen2.5-7B-Instruct`）
6. 点连接测试，确认成功

### 4. 在 ST 中创建角色卡（可选但推荐）

为每个 cosplay 角色在 ST 里创建对应角色卡：
1. ST 界面 → 角色管理 → 创建新角色
2. 填入名字、描述、第一条消息、性格等
3. 记住角色的**名字**（后面要填到 `characters.ts` 的 `backendCharacterId`）

> 如果不想在 ST 建角色卡，也可以由前端构建完整 prompt，ST 只当 LLM 代理用。

### 5. 确认 ST 可访问

浏览器打开 `http://你的服务器IP:8000`，应能看到 ST 界面。

---

## 第二部分：前端配置

### 1. 配置 Vite 代理

编辑 `vite.config.ts`，在 `server` 里加 `proxy`：

```ts
export default defineConfig({
  // ...现有配置
  server: {
    port: 5173,
    // ...现有配置
    proxy: {
      '/st-api': {
        target: 'http://你的ST服务器IP:8000',  // ← 改成你的 ST 地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/st-api/, ''),
        // 如果 ST 开了 basicAuth，加 authHeader：
        // headers: {
        //   Authorization: 'Basic ' + Buffer.from('用户名:密码').toString('base64'),
        // },
      },
    },
  },
})
```

> **生产环境**：Vite 代理只在 dev 模式生效。生产时用 Nginx 反代：
> ```nginx
> location /st-api/ {
>   proxy_pass http://你的ST服务器:8000/;
>   proxy_set_header Host $host;
>   proxy_buffering off;  # 流式响应需要
> }
> ```

### 2. 创建环境变量文件

在项目根目录创建 `.env.local`：

```bash
# SillyTavern API 基础路径（经过 Vite 代理）
VITE_ST_BASE=/st-api

# 是否启用真实后端（false 时用 mock 回复）
VITE_USE_REAL_AI=true
```

### 3. 创建 API 调用模块

新建 `src/api/sillytavern.ts`：

```ts
const ST_BASE = import.meta.env.VITE_ST_BASE || '/st-api';
const USE_REAL_AI = import.meta.env.VITE_USE_REAL_AI === 'true';

// CSRF token 缓存
let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${ST_BASE}/csrf-token`);
  const data = await res.json();
  csrfToken = data.token;
  return csrfToken;
}

export interface ChatMessageLite {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 调用 SillyTavern 的 chat-completions 端点生成回复
 * SillyTavern 会把请求转发到已配置的硅基流动模型
 */
export async function generateReply(
  messages: ChatMessageLite[],
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<string> {
  if (!USE_REAL_AI) {
    // Mock 模式
    const mock = `【Mock 回复】收到：${messages[messages.length - 1].content}`;
    for (const ch of mock) {
      await new Promise((r) => setTimeout(r, 30));
      onChunk(ch);
    }
    return mock;
  }

  const token = await getCsrfToken();

  const res = await fetch(`${ST_BASE}/api/backends/chat-completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
    body: JSON.stringify({
      messages,
      model: options?.model || '',        // 留空则用 ST 当前选中的模型
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 512,
      stream: true,
      chat_completion_source: 'openai',   // 硅基流动兼容 OpenAI
    }),
  });

  if (!res.ok) {
    throw new Error(`ST API 错误: ${res.status} ${res.statusText}`);
  }

  // 处理 SSE 流式响应
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const chunk = json.choices?.[0]?.delta?.content || '';
          if (chunk) {
            full += chunk;
            onChunk(chunk);
          }
        } catch {
          // 非 JSON 行，跳过
        }
      }
    }
  }
  return full;
}

export { USE_REAL_AI };
```

### 4. 修改 ChatPage 使用真实 API

编辑 `src/pages/ChatPage/ChatPage.tsx`，把 `handleSend` 改成：

```ts
import { generateReply, USE_REAL_AI } from '@/api/sillytavern';

// 在组件内：
const handleSend = async () => {
  if (!input.trim() || isStreaming) return;
  const userText = input.trim();
  addMessage({ role: 'user', content: userText });
  setInput('');

  const charId = addMessage({ role: 'character', content: '', streaming: true });

  try {
    // 构建 messages 数组
    const messages = [
      // System prompt：用角色性格设定
      { role: 'system' as const, content: `你是${current.name}。${current.personality}` },
      // 历史消息
      ...messages.map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      // 当前用户消息
      { role: 'user' as const, content: userText },
    ];

    await generateReply(messages, (chunk) => {
      appendToMessage(charId, chunk);
    });
    finishStreaming(charId);
  } catch (err) {
    // 出错时显示错误信息
    appendToMessage(charId, `\n\n[错误] ${err instanceof Error ? err.message : '生成失败'}`);
    finishStreaming(charId);
  }
};
```

> 注意：上面 `messages` 变量名和 chatStore 的 `messages` 冲突了，实际写的时候把构建数组的变量改名，比如 `apiMessages`。

### 5. 配置角色映射

编辑 `src/config/characters.ts`，给每个角色填 `backendCharacterId`：

```ts
{
  id: 'sanjiu',
  name: '三九',
  // ...
  backendCharacterId: '三九',  // ← SillyTavern 里角色卡的名字
}
```

> 如果你不在 ST 建角色卡，而是前端构建 prompt，这个字段可以留空。

---

## 第三部分：调试步骤

### 1. 启动 ST，确认可访问

```bash
# 在 ST 服务器上
docker ps  # 确认 ST 容器在运行
curl http://localhost:8000/csrf-token  # 应返回 {"token":"..."}
```

### 2. 启动前端

```bash
npm run dev
```

### 3. 测试 API 连通

浏览器控制台执行：

```js
fetch('/st-api/csrf-token').then(r => r.json()).then(console.log)
// 应输出 { token: "..." }
```

如果报错：
- **CORS 错误** → Vite 代理没配对，检查 `vite.config.ts` 的 target
- **403 Forbidden** → ST 白名单没加你的 IP
- **Connection refused** → ST 没启动或端口不对

### 4. 测试生成回复

进入聊天页面发消息，看浏览器 Network 面板：
- 请求 `POST /st-api/api/backends/chat-completions`
- 200 状态 + SSE 流式响应 = 成功

### 5. 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `CSRF token mismatch` | 没带 X-CSRF-Token | 确认 getCsrfToken() 被调用 |
| `403 Forbidden` | 白名单未包含 IP | ST config.yaml 加 IP |
| `502 Bad Gateway` | ST 模型未连接 | ST 界面确认硅基流动已连 |
| `Empty response` | 模型名错误或留空但 ST 没选模型 | ST 界面选一个模型 |
| `Stream parse error` | ST 返回格式非标准 SSE | 检查 ST 版本，可能需调整解析 |

---

## 第四部分：生产部署

### Nginx 反代配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/cosplay/dist;
        try_files $uri /index.html;
    }

    # SillyTavern API 代理
    location /st-api/ {
        proxy_pass http://ST服务器:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;          # 流式响应必须关
        proxy_cache off;
        chunked_transfer_encoding on;
    }
}
```

### 环境变量

生产环境 `.env.production`：

```bash
VITE_ST_BASE=/st-api
VITE_USE_REAL_AI=true
```

构建：`npm run build`，把 `dist/` 部署到 Nginx。

---

## 快速检查清单

- [ ] SillyTavern 容器运行正常
- [ ] ST config.yaml `listen: true`
- [ ] ST 白名单包含前端机器 IP
- [ ] ST 界面硅基流动模型连接成功
- [ ] `vite.config.ts` proxy target 指向 ST 地址
- [ ] `.env.local` 有 `VITE_USE_REAL_AI=true`
- [ ] `src/api/sillytavern.ts` 已创建
- [ ] `ChatPage.tsx` handleSend 已改用 generateReply
- [ ] 浏览器能访问 `/st-api/csrf-token`
- [ ] 发消息能收到流式回复