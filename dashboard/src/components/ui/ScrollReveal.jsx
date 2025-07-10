'use client';
import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { tileFloat, fluidMorph, elasticScale } from './animations';

export const ScrollReveal = ({ 
  children, 
  animation = 'float',
  threshold = 0.1,
  triggerOnce = true,
  delay = 0,
  className = "",
  ...props 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    amount: threshold,
    once: triggerOnce 
  });

  const animations = {
    float: tileFloat,
    morph: fluidMorph,
    scale: elasticScale,
    slideUp: {
      initial: { opacity: 0, y: 60 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1]
        }
      }
    },
    slideRight: {
      initial: { opacity: 0, x: -60 },
      animate: { 
        opacity: 1, 
        x: 0,
        transition: {
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1]
        }
      }
    },
    slideLeft: {
      initial: { opacity: 0, x: 60 },
      animate: { 
        opacity: 1, 
        x: 0,
        transition: {
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1]
        }
      }
    },
    zoom: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { 
        opacity: 1, 
        scale: 1,
        transition: {
          duration: 0.5,
          delay,
          ease: [0.22, 1, 0.36, 1]
        }
      }
    },
    rotate: {
      initial: { opacity: 0, rotate: -10 },
      animate: { 
        opacity: 1, 
        rotate: 0,
        transition: {
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1]
        }
      }
    }
  };

  const selectedAnimation = animations[animation] || animations.float;

  return (
    <motion.div
      ref={ref}
      initial={selectedAnimation.initial}
      animate={isInView ? selectedAnimation.animate : selectedAnimation.initial}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Staggered reveal for lists
export const StaggeredReveal = ({ 
  children, 
  staggerDelay = 0.1,
  className = "",
  ...props 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.1, once: true });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1]
              }
            }
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ScrollReveal;