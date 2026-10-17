import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { useChatStore } from '@/stores/chatStore';
import { uiText } from '@/config/ui-text';
import {
  fetchCharacterDetails,
  generateReply,
  type STCharacterDetails,
  type ChatCompletionMessage,
} from '@/api/sillytavern';
import type { CharacterConfig } from '@/types';

/** 根据角色卡详情或前端配置构造 system prompt */
function buildSystemPrompt(character: CharacterConfig, details: STCharacterDetails | null): string {
  if (details) {
    const parts: string[] = [`你是${details.name}。`];
    if (details.description) parts.push(details.description);
    if (details.personality) parts.push(`性格：${details.personality}`);
    if (details.scenario) parts.push(`场景：${details.scenario}`);
    parts.push('请保持角色设定，用符合角色性格的语气回复用户。');
    return parts.join('\n\n');
  }
  const parts: string[] = [`你是${character.name}。`];
  if (character.description) parts.push(character.description);
  if (character.personality) parts.push(`性格：${character.personality}`);
  return parts.join('\n\n');
}

export function ChatPage() {
  const navigate = useNavigate();
  const current = useCharacterStore((s) => s.current());
  const { messages, isStreaming, addMessage, appendToMessage, finishStreaming, activeCharacterId } = useChatStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stDetails, setStDetails] = useState<STCharacterDetails | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (current.backendCharacterId) {
      let cancelled = false;
      fetchCharacterDetails(current.backendCharacterId)
        .then((details) => {
          if (cancelled) return;
          setStDetails(details);
          if (messages.length === 0) {
            const firstMsg = details.first_mes || current.firstMessage;
            if (firstMsg) addMessage({ role: 'character', content: firstMsg });
          }
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('角色详情加载失败:', err);
          if (messages.length === 0 && current.firstMessage) {
            addMessage({ role: 'character', content: current.firstMessage });
          }
        });
      return () => { cancelled = true; };
    }
    if (activeCharacterId === current.id && messages.length === 0 && current.firstMessage) {
      addMessage({ role: 'character', content: current.firstMessage });
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText || isStreaming) return;

    addMessage({ role: 'user', content: userText });
    setInput('');

    const charId = addMessage({ role: 'character', content: '', streaming: true });
    const controller = new AbortController();
    abortRef.current = controller;

    const systemPrompt = buildSystemPrompt(current, stDetails);
    const historyMessages: ChatCompletionMessage[] = [{ role: 'system', content: systemPrompt }];
    for (const msg of messages) {
      if (msg.streaming) continue;
      if (msg.role === 'user') {
        historyMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'character') {
        historyMessages.push({ role: 'assistant', content: msg.content });
      }
    }
    historyMessages.push({ role: 'user', content: userText });

    let receivedContent = '';
    try {
      await generateReply(
        { messages: historyMessages, signal: controller.signal },
        (chunk) => {
          receivedContent += chunk;
          appendToMessage(charId, chunk);
        },
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        const errMsg = err instanceof Error ? err.message : '未知错误';
        if (!receivedContent) {
          appendToMessage(charId, `[连接失败: ${errMsg}]`);
        }
        console.error('生成回复失败:', errMsg);
      }
    } finally {
      finishStreaming(charId);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="relative h-full w-full flex flex-col bg-lazer-dark">
      {/* 背景 */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `url(${current.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-black/10" />

      {/* 顶部栏 */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4">
        <button
          onClick={() => navigate('/select')}
          className="px-4 py-2 rounded-full glass-panel text-sm text-white/60 hover:text-white/90 transition-colors"
        >
          {uiText.chat.back}
        </button>
        <h2 className="text-xl font-bold tracking-widest text-white/80">{current.name}</h2>
        <div className="w-20" />
      </div>

      {/* 消息列表 */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-8 py-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] px-5 py-3 rounded-2xl backdrop-blur-xl ${
                msg.role === 'user'
                  ? 'bg-lazer-cyan/15 border border-lazer-cyan/30 text-white/90'
                  : 'bg-white/8 border border-white/15 text-white/90'
              }`}
            >
              <p className="leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {msg.streaming && <span className="inline-block w-2 h-4 ml-1 bg-white/60 animate-pulse align-middle" />}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 输入区 */}
      <div className="relative z-10 px-8 py-6">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={uiText.chat.inputPlaceholder}
            rows={1}
            style={{ color: '#ffffff', caretColor: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            className="flex-1 px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 placeholder:text-white/40 focus:outline-none focus:border-lazer-purple/50 resize-none !text-white text-base"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-lazer-purple/30 to-lazer-pink/30 backdrop-blur-xl border border-white/20 font-bold tracking-widest text-white/90 disabled:opacity-40"
          >
            {uiText.chat.send}
          </motion.button>
        </div>
      </div>
    </div>
  );
}