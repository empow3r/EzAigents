import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

const SmoothScrollContainer = ({ 
  children, 
  className = '',
  enabled = true,
  damping = 30,
  stiffness = 100
}) => {
  const scrollRef = useRef(null);
  const scrollY = useSpring(0, { damping, stiffness });

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      scrollY.set(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, scrollY]);

  const transform = useTransform(scrollY, (value) => `translateY(${-value}px)`);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={scrollRef} className={`${className} will-change-transform`}>
      <motion.div style={{ transform }}>
        {children}
      </motion.div>
    </div>
  );
};

export default SmoothScrollContainer;