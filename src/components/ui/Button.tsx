import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'disabled';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-lazer-cyan/30 via-lazer-purple/30 to-lazer-pink/30 backdrop-blur-xl border border-white/20 text-white shadow-[0_0_40px_rgba(255,102,170,0.2)] hover:shadow-[0_0_50px_rgba(255,102,170,0.35)]',
  secondary:
    'bg-white/5 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/10',
  disabled:
    'bg-red-500/15 border border-red-500/30 text-red-300/60 cursor-not-allowed',
};

export function Button({ children, onClick, variant = 'primary', className }: ButtonProps) {
  const isDisabled = variant === 'disabled';
  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.05 }}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        'px-12 py-3 rounded-full text-lg font-black tracking-[0.2em] transition-colors',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </motion.button>
  );
}