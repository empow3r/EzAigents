import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { scrollAnimations } from '../hooks/useScrollEffects';

const ScrollAnimatedSection = ({ 
  children, 
  animation = 'fadeIn',
  threshold = 0.1,
  triggerOnce = true,
  delay = 0,
  className = '',
  staggerChildren = false
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once: triggerOnce, 
    amount: threshold 
  });

  const variants = scrollAnimations[animation] || scrollAnimations.fadeIn;
  
  const animationVariants = {
    ...variants,
    visible: {
      ...variants.visible,
      transition: {
        ...variants.visible.transition,
        delay
      }
    }
  };

  if (staggerChildren) {
    animationVariants.visible.transition.staggerChildren = 0.1;
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={animationVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollAnimatedSection;