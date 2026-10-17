# cosplay — 游戏化 AI Character Chat

> 椭圆轨道角色选择 × Visual Novel 风格 × AI 对话

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（默认 5173）
npm run build    # 类型检查 + 生产构建
```
  
## 你能改什么

所有**无需懂代码**就能修改的内容都在 `src/config/` 下的三个文件里，均已标注 `// USER EDITABLE`。

---

## 1. 角色配置 `src/config/characters.ts`

这是最常改的文件。每个角色是一个对象：

```ts
{
  id: 'sanjiu',              // 唯一标识，英文，不能重复
  name: '三九',              // 显示名称
  available: true,           // ★ 是否可用（见下方说明）
  avatar: '/assets/.../avatar.jpg',    // 头像路径
  artwork: '/assets/.../full.jpg',     // 角色选择页立绘
  background: '/assets/.../background.jpg', // 角色专属背景图
  description: '一位温柔而神秘的女孩……',  // 简介（一行）
  personality: '温柔、知性……',          // 性格描述
  tags: ['温柔', '知性', '神秘'],        // 标签（显示在名字下方）
  firstMessage: '你好呀，今天想聊些什么呢？', // 进入聊天时的第一条消息
  backendCharacterId: '中野三玖.png', // SillyTavern 角色卡文件名，留空则用前端配置
}
```

### 如何设置角色是否可用

改 `available` 字段：

```ts
available: true   // 可进入聊天，按钮显示 START
available: false  // 仍出现在角色选择轮盘，但按钮显示 UNAVAILABLE 且不可点击
```

### 如何添加一个新角色

**第一步：放图片素材**

把 3 张图片放到 `public/assets/charaters/你的角色名/` 下：

```
public/assets/charaters/mychar/
  ├── avatar.jpg       头像（正方形，建议 512×512）
  ├── full.jpg         立绘（竖长图，建议 800×1200，PNG 需透明背景）
  └── ...
```

再放一张背景图到 `public/assets/background/characters/mychar/`：

```
public/assets/background/characters/mychar/
  └── background.jpg   背景（建议 1920×1080，≤500KB）
```

> **图片体积注意**：背景图建议 ≤ 500KB、分辨率 ≤ 1920×1080；立绘建议 ≤ 1MB。过大会导致切换卡顿（项目曾因 6.3MB 背景图掉帧）。

**第二步：在 `characters.ts` 数组里加一项**

```ts
// USER EDITABLE
{
  id: 'mychar',
  name: '我的角色',
  available: true,
  avatar: '/assets/charaters/mychar/avatar.jpg',
  artwork: '/assets/charaters/mychar/full.jpg',
  background: '/assets/background/characters/mychar/background.jpg',
  description: '一段简短描述。',
  personality: '性格关键词。',
  tags: ['标签1', '标签2'],
  firstMessage: '你好！',
  backendCharacterId: '',       // 填 SillyTavern 角色卡文件名（如 'MyChar.png'），留空则用前端配置
},
```

保存后页面自动热更新，新角色立刻出现在选择轮盘上。

### 如何删除角色

在 `characters.ts` 数组中删掉对应对象即可。图片文件可留可删。

### 如何调整角色顺序

数组顺序就是默认排列顺序。把对象挪到数组前面，该角色就会作为初始选中角色。

---

## 2. 网站基础配置 `src/config/site.ts`

```ts
{
  name: 'CHARACTER GAME',        // 首页大标题
  subtitle: 'AI Character World', // 副标题
  welcome: 'WELCOME',            // 首页欢迎语
  playButtonText: 'PLAY',        // 首页按钮文字
  footer: '© 2026 Character Game', // 首页底部版权
  homeBackground: '/assets/background/home/background.jpg', // 首页背景图
}
```

---

## 3. UI 文案配置 `src/config/ui-text.ts`

所有界面文字集中在这里，改这个文件就能换掉所有按钮/提示文案：

```ts
home: {
  title, welcome, play, library, settings   // 首页
}
characterSelect: {
  title: 'SELECT CHARACTER',                // 选择页标题
  hint: '← → 选择角色     ENTER 确认',      // 操作提示
}
characterPreview: {
  start: 'START',                           // 开始按钮
  unavailable: 'UNAVAILABLE',               // 不可用按钮
}
chat: {
  inputPlaceholder: '输入消息…',            // 输入框占位
  send: '发送',                             // 发送按钮
  back: '返回',                             // 返回按钮
}
```

---

## 图片素材目录结构

```
public/assets/
  ├── charaters/                        ← 角色立绘（注意目录名拼写）
  │   ├── sanjiu/
  │   │   ├── avatar.jpg
  │   │   └── full.jpg
  │   ├── shenhe/
  │   │   ├── avatar.jpg
  │   │   └── full.png
  │   └── ...
  └── background/
      ├── home/
      │   └── background.jpg            ← 首页背景
      └── characters/
          ├── sanjiu/
          │   └── background.jpg        ← 角色专属背景
          └── ...
```

> 在 `characters.ts` 里引用路径时，以 `/assets/` 开头（对应 `public/assets/`）。

---

## 页面流程

```
首页 HOME
  └─ 点击 PLAY
      └─ 角色选择 CHARACTER SELECT（椭圆轨道轮盘）
          ├─ ← → / 滚轮 / 点击 切换角色
          └─ 按 ENTER 或点 START
              └─ 聊天 CHAT
                  ├─ 输入消息发送
                  ├─ 收到 AI 实时流式回复（SSE，主备渠道自动切换）
                  └─ 返回角色选择
```

---

## 技术栈

- **Vite** + **React 18** + **TypeScript**
- **Framer Motion** — 动画
- **Zustand** — 状态管理
- **Tailwind CSS v3.4** — 样式
- **React Router v6** — 路由
- **SillyTavern** — 远程 LLM 代理后端（通过 Vite dev proxy 转发）

## AI 对话后端

聊天功能通过远程 SillyTavern 服务器生成回复，采用**主备渠道自动切换**策略：

| 渠道 | 平台 | 模型 | 用途 |
|------|------|------|------|
| 主 | 硅基流动 | `Qwen/Qwen2.5-7B-Instruct` | 默认使用 |
| 备 | 智谱 | `glm-4.5-air` | 主渠道失败时自动切换 |

**切换条件**：主渠道返回 402（余额不足）、429（限流）、5xx（服务端错误）时自动切换到备用渠道。用户主动取消或网络断开不触发切换。

**安全设计**：
- Basic Auth 凭据在 Vite 服务端代理层注入，不进入浏览器 bundle
- CSRF Token 运行时动态获取，不硬编码
- API Key 以 SillyTavern `secret_id`（UUID）间接引用，前端不接触密钥本身

### 环境变量配置

复制 `.env.example` 为 `.env.local` 并填入 SillyTavern Basic Auth 凭据：

```bash
cp .env.example .env.local
```

```env
ST_BASIC_USER=your_username
ST_BASIC_PASS=your_password
```

> 这些变量仅在 Vite dev proxy 层使用，不会被打包进前端产物。

### `backendCharacterId` 说明

在 `characters.ts` 中，`backendCharacterId` 填写 SillyTavern 服务器上角色卡的**文件名**（如 `'中野三玖.png'`）。填写后，聊天页会自动拉取该角色的完整角色卡（description、personality、scenario、first_mes 等）构造 system prompt。留空则仅使用前端 `characters.ts` 中的配置。

## 常见问题

**Q: 切换角色时背景卡顿？**
A: 检查背景图文件大小，确保 ≤ 500KB、分辨率 ≤ 1920×1080。过大的图片（如 5K/6MB）会导致 decode 和 GPU 上传掉帧。

**Q: 角色立绘显示有黑底？**
A: 立绘如果需要透明背景，必须用 PNG 格式（`Format32bppArgb`）。JPEG 不支持透明。

**Q: 新角色没出现？**
A: 检查 `id` 是否重复、图片路径是否正确（以 `/assets/` 开头）、保存后是否热更新。

**Q: 不可用角色能否被选中查看？**
A: 能。`available: false` 的角色仍出现在轮盘上可浏览，只是 START 按钮变为 UNAVAILABLE 不可点击。
**Q: AI 回复为空？**
A: 检查 `.env.local` 中 SillyTavern 凭据是否正确、服务器是否可达。打开浏览器控制台查看 `[generateReply]` 日志确认渠道切换情况。两个渠道均失败时会显示 `[连接失败: ...]`。