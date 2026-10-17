import type { Variants } from 'framer-motion';
import { MOTION } from './transitions';

export const pageVariants: Variants = {
  initial: { opacity: 0, scale: 1.05, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: MOTION.duration.page, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.3, ease: 'easeIn' } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.duration.normal, delay: i * MOTION.delay.stagger, ease: [0.22, 1, 0.36, 1] },
  }),
};

export const cardHover = {
  whileHover: { y: -4, transition: MOTION.spring.soft },
  whileTap: { scale: 0.98 },
};