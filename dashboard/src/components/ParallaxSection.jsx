import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ParallaxSection = ({ 
  children, 
  speed = 0.5,
  offset = ['start end', 'end start'],
  className = '',
  backgroundImage = null,
  overlay = true,
  darkMode = true
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0.3]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {backgroundImage && (
        <motion.div
          className="absolute inset-0 z-0"
          style={{ y }}
        >
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-[120%] object-cover"
            loading="lazy"
          />
          {overlay && (
            <motion.div 
              className={`absolute inset-0 ${
                darkMode ? 'bg-black' : 'bg-white'
              }`}
              style={{ opacity }}
            />
          )}
        </motion.div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ParallaxSection;