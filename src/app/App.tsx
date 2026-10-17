import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HomePage } from '@/pages/HomePage/HomePage';
import { CharacterSelectPage } from '@/pages/CharacterSelectPage/CharacterSelectPage';
import { CharacterPreviewPage } from '@/pages/CharacterPreviewPage/CharacterPreviewPage';
import { ChatPage } from '@/pages/ChatPage/ChatPage';
import { pageVariants } from '@/animations/variants';
import { MOTION } from '@/animations/transitions';
import { motion } from 'framer-motion';

export function App() {
  const location = useLocation();

  return (
    <div className="relative h-full w-full overflow-hidden bg-lazer-dark">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0"
          transition={{ duration: MOTION.duration.page }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/select" element={<CharacterSelectPage />} />
            <Route path="/preview" element={<CharacterPreviewPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}