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

// Macro moving effects for dashboard tiles
export const tileFloat = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  hover: {
    y: -5,
    scale: 1.02,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Parallax scrolling effect
export const parallax = (offset) => ({
  animate: {
    y: offset * -0.5,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 100
    }
  }
});

// Magnetic hover effect
export const magnetic = {
  rest: { x: 0, y: 0 },
  hover: (offset) => ({
    x: offset.x * 0.3,
    y: offset.y * 0.3,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300
    }
  })
};

// Fluid morph transition
export const fluidMorph = {
  initial: { 
    borderRadius: "20px",
    scale: 0.8,
    opacity: 0
  },
  animate: {
    borderRadius: ["20px", "30px", "20px"],
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  }
};

// Cascading card effect
export const cascadeCards = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },
  item: {
    initial: { 
      opacity: 0, 
      x: -30,
      rotateY: -10
    },
    animate: { 
      opacity: 1, 
      x: 0,
      rotateY: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }
};

// Smooth page transition
export const pageTransition = {
  initial: { 
    opacity: 0,
    scale: 0.98,
    filter: "blur(10px)"
  },
  animate: { 
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: { 
    opacity: 0,
    scale: 1.02,
    filter: "blur(10px)",
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// 3D card flip
export const card3D = {
  initial: { rotateY: 180, opacity: 0 },
  animate: { 
    rotateY: 0, 
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  hover: {
    rotateY: 5,
    z: 50,
    transition: { duration: 0.3 }
  }
};

// Elastic scale
export const elasticScale = {
  initial: { scale: 0 },
  animate: { 
    scale: [0, 1.2, 0.9, 1.05, 1],
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

// Smooth counter animation
export const smoothCounter = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Ripple effect
export const ripple = {
  initial: { scale: 0, opacity: 1 },
  animate: {
    scale: 4,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};