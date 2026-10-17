import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { useChatStore } from '@/stores/chatStore';
import { uiText } from '@/config/ui-text';
import { Button } from '@/components/ui/Button';

// 椭圆轨道参数 — RADIUS_Y 必须足够大让弧形视觉明显
const RADIUS_X = 520;
const RADIUS_Y = 220;
const ANGLE_STEP = Math.PI / 7; // ≈25.7°，让 ±3 不完全消失

interface CarouselStyle {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  blur: number;
  zIndex: number;
  rotateY: number;
}

// 椭圆轨道位置计算：x = rx*sin, y = ry*(1-cos)
// 中心 offset=0 → 最大/最亮/最前；两侧逐渐缩小+淡出+下移+模糊
function getCarouselStyle(offset: number): CarouselStyle {
  const angle = offset * ANGLE_STEP;
  const absOffset = Math.abs(offset);
  return {
    x: RADIUS_X * Math.sin(angle),
    y: RADIUS_Y * (1 - Math.cos(angle)),
    scale: Math.max(0.12, 1 - absOffset * 0.28),
    opacity: Math.max(0, Math.cos(angle)) ** 1.8,
    blur: absOffset * 4,
    zIndex: 100 - Math.round(absOffset * 10),
    rotateY: -angle * (180 / Math.PI) * 0.35,
  };
}

export function CharacterSelectPage() {
  const navigate = useNavigate();
  const list = useCharacterStore((s) => s.list);
  const currentIndex = useCharacterStore((s) => s.currentIndex);
  const current = useCharacterStore((s) => s.current());
  const select = useCharacterStore((s) => s.select);
  const selectNext = useCharacterStore((s) => s.selectNext);
  const selectPrev = useCharacterStore((s) => s.selectPrev);
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);

  const wheelLock = useRef(0);
  const touchStartX = useRef(0);

  // 双缓冲背景层 — 两个固定 img 交替显示，只改 opacity，无 mount/unmount
  const [bgA, setBgA] = useState(current.background);
  const [bgB, setBgB] = useState('');
  const [aVisible, setAVisible] = useState(true);
  const aVisibleRef = useRef(true);
  const prevBg = useRef(current.background);

  const confirm = useCallback(() => {
    if (!current.available) return;
    setActiveCharacter(current.id);
    navigate('/chat');
  }, [navigate, current, setActiveCharacter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); selectPrev(); }
      else if (e.key === 'Enter') confirm();
      else if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectNext, selectPrev, confirm, navigate]);

  // 预加载所有角色背景图 + decode，避免首次切换闪白和 decode 卡顿
  useEffect(() => {
    list.forEach((char) => {
      const img = new Image();
      img.src = char.background;
      img.decode().catch(() => {});
    });
  }, [list]);

  // 角色背景变化时，交替切换双缓冲层（只改 opacity，不 mount/unmount）
  useEffect(() => {
    if (current.background === prevBg.current) return;
    prevBg.current = current.background;
    if (aVisibleRef.current) {
      setBgB(current.background);
      setAVisible(false);
      aVisibleRef.current = false;
    } else {
      setBgA(current.background);
      setAVisible(true);
      aVisibleRef.current = true;
    }
  }, [current.background]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLock.current < 100) return;
    wheelLock.current = now;
    if (e.deltaY > 0) selectNext();
    else if (e.deltaY < 0) selectPrev();
  }, [selectNext, selectPrev]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) { if (delta < 0) selectNext(); else selectPrev(); }
  };

  return (
    <div
      className="relative h-full w-full flex flex-col items-center bg-lazer-dark overflow-hidden"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 双缓冲背景 — 两个固定层，纯 opacity crossfade 650ms，无 scale 无 mount/unmount */}
      <motion.img
        src={bgA}
        animate={{ opacity: aVisible ? 1 : 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <motion.img
        src={bgB}
        animate={{ opacity: aVisible ? 0 : 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* 固定 Overlay — 不随背景切换变化 */}
      <div className="absolute inset-0 bg-black/[0.1]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

      {/* 标题 */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mt-6 text-xs tracking-[0.4em] text-white/50 font-light"
      >
        {uiText.characterSelect.title}
      </motion.p>

      {/* 椭圆轨道 Carousel — 角色图片本身就是选择器，无卡片框 */}
      <div
        className="relative z-10 flex-1 w-full flex items-center justify-center"
        style={{ perspective: '1600px' }}
      >
        {list.map((char, i) => {
          let offset = i - currentIndex;
          const n = list.length;
          if (offset > n / 2) offset -= n;
          if (offset < -n / 2) offset += n;
          const t = getCarouselStyle(offset);
          const isCenter = offset === 0;
          return (
            <motion.div
              key={char.id}
              className="absolute"
              initial={false}
              animate={{
                x: t.x,
                y: t.y,
                scale: t.scale,
                opacity: t.opacity,
                rotateY: t.rotateY,
                zIndex: t.zIndex,
                filter: `blur(${t.blur}px)`,
              }}
              transition={{ type: 'spring', stiffness: 160, damping: 24, mass: 0.8 }}
              style={{ transformStyle: 'preserve-3d', pointerEvents: t.opacity < 0.05 ? 'none' : 'auto' }}
              onClick={() => (isCenter ? confirm() : select(i))}
            >
              <img
                src={char.artwork}
                alt={char.name}
                draggable={false}
                className={
                  isCenter
                    ? 'w-80 h-[32rem] object-cover rounded-2xl cursor-pointer shadow-[0_30px_80px_rgba(0,0,0,0.6)] ring-1 ring-white/20'
                    : 'w-80 h-[32rem] object-cover rounded-2xl cursor-pointer shadow-[0_15px_40px_rgba(0,0,0,0.4)]'
                }
              />
              {!char.available && isCenter && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-red-500/80 text-xs font-bold tracking-widest text-white">
                  {uiText.characterPreview.unavailable}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* 当前角色信息 — 跟随当前角色切换 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + '-info'}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 flex flex-col items-center gap-2 mb-2"
        >
          <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {current.name}
          </h2>
          <div className="flex gap-2">
            {current.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white/70">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-white/50 max-w-lg text-center leading-relaxed line-clamp-1">
            {current.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* 操作提示 + START */}
      <div className="relative z-10 flex flex-col items-center gap-4 mb-8">
        <p className="text-xs text-white/40 tracking-widest">{uiText.characterSelect.hint}</p>
        {current.available ? (
          <Button variant="primary" onClick={confirm}>{uiText.characterPreview.start}</Button>
        ) : (
          <Button variant="disabled">{uiText.characterPreview.unavailable}</Button>
        )}
      </div>
    </div>
  );
}