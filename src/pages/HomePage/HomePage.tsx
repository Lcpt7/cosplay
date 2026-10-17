import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';
import { uiText } from '@/config/ui-text';
import { fadeUp } from '@/animations/variants';


export function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      className="relative h-full w-full flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(${siteConfig.homeBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 轻微遮罩 — 保留背景原图清晰度 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(10,10,15,0.25)_100%)]" />

      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <motion.p
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-xs tracking-[0.4em] text-white/40 font-light"
        >
          {uiText.home.welcome}
        </motion.p>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-6xl md:text-8xl font-black tracking-tight text-gradient-lazer"
        >
          {siteConfig.name}
        </motion.h1>

        <motion.button
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/select')}
          className="group relative px-16 py-4 rounded-full glass-panel text-2xl font-bold tracking-[0.2em] text-white/90 hover:text-white transition-colors"

        >
          {uiText.home.play}
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-lazer-cyan/20 via-lazer-purple/20 to-lazer-pink/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
        </motion.button>
      </div>

      {/* 底部 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 text-xs text-white/30 tracking-widest"
      >
        {siteConfig.footer}
      </motion.div>
    </div>
  );
}