import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCharacterStore } from '@/stores/characterStore';
import { useChatStore } from '@/stores/chatStore';
import { uiText } from '@/config/ui-text';
import { fadeUp } from '@/animations/variants';

export function CharacterPreviewPage() {
  const navigate = useNavigate();
  const current = useCharacterStore((s) => s.current());
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);

  const handleStart = () => {
    if (!current.available) return;
    setActiveCharacter(current.id);
    navigate('/chat');
  };

  return (
    <div className="relative h-full w-full flex bg-lazer-dark">
      {/* 背景 */}
      <motion.div
        key={current.background}
        initial={{ opacity: 0, scale: 1.15 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
        style={{ backgroundImage: `url(${current.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-black/[0.08]" />
      {/* 右侧渐变 — 让信息面板区域更可读，不压暗整个背景 */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black/30 to-transparent" />

      {/* 立绘 */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 flex items-end justify-center w-1/2 h-full"
      >
        <img src={current.artwork} alt={current.name} className="h-full object-contain" />
      </motion.div>

      {/* 信息面板 */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pr-16 gap-6">
        <motion.h1
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-6xl font-black tracking-tight text-gradient-lazer"
        >
          {current.name}
        </motion.h1>

        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex gap-2"
        >
          {current.tags.map((t) => (
            <span key={t} className="px-3 py-1 rounded-full bg-white/10 text-sm text-white/60 backdrop-blur-sm">
              {t}
            </span>
          ))}
        </motion.div>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-lg text-white/70 leading-relaxed max-w-md glass-panel p-6"
        >
          {current.description}
        </motion.p>

        <motion.p
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-sm text-white/50 leading-relaxed max-w-md"
        >
          {current.personality}
        </motion.p>

        {/* 按钮区 */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex gap-4 mt-4"
        >
          <button
            onClick={() => navigate('/select')}
            className="px-8 py-3 rounded-full glass-panel text-sm font-bold tracking-widest text-white/60 hover:text-white/90 transition-colors"
          >
            {uiText.characterPreview.back}
          </button>
          {current.available ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleStart}
              className="px-12 py-3 rounded-full bg-gradient-to-r from-lazer-cyan/30 via-lazer-purple/30 to-lazer-pink/30 backdrop-blur-xl text-lg font-black tracking-[0.2em] text-white border border-white/20 shadow-[0_0_40px_rgba(255,102,170,0.2)]"
            >
              {uiText.characterPreview.start}
            </motion.button>
          ) : (
            <div className="px-12 py-3 rounded-full bg-red-500/20 border border-red-500/40 text-lg font-bold tracking-widest text-red-300/80">
              {uiText.characterPreview.unavailable}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}