// Reusable Framer Motion Animation Presets

export const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.3 }
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3 }
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3 }
};

export const bounce = {
  initial: { opacity: 0, scale: 0.3 },
  animate: { 
    opacity: 1, 
    scale: [0.3, 1.1, 0.9, 1],
    transition: { duration: 0.6 }
  },
  exit: { opacity: 0, scale: 0.3 }
};

export const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const hover = {
  scale: 1.05,
  transition: { duration: 0.2 }
};

export const tap = {
  scale: 0.95,
  transition: { duration: 0.1 }
};

// Background gradient animation
export const gradientAnimation = {
  animate: {
    background: [
      'radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%)',
      'radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)',
      'radial-gradient(circle at 40% 60%, rgba(120, 219, 255, 0.1) 0%, transparent 50%)'
    ],
    transition: { duration: 8, repeat: Infinity, repeatType: 'reverse' }
  }
};

// Pulse animation for active elements
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 2, repeat: Infinity }
  }
};

// Loading skeleton animation
export const skeleton = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.5, repeat: Infinity }
  }
};