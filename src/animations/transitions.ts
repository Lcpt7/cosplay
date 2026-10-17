export const MOTION = {
  duration: {
    fast: 0.2,
    normal: 0.4,
    slow: 0.6,
    page: 0.5,
  },
  spring: {
    soft: { type: 'spring' as const, stiffness: 200, damping: 30 },
    bouncy: { type: 'spring' as const, stiffness: 300, damping: 20 },
    smooth: { type: 'spring' as const, stiffness: 120, damping: 24 },
  },
  delay: {
    stagger: 0.06,
    background: 0,
    content: 0.15,
    title: 0.3,
    cta: 0.5,
  },
};