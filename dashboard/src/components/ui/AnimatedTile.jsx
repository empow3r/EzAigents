'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { tileFloat, magnetic, ripple } from './animations';

export const AnimatedTile = ({ 
  children, 
  className = "", 
  onClick,
  enableMagnetic = false,
  enableRipple = true,
  delay = 0,
  ...props 
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState([]);

  const handleMouseMove = (e) => {
    if (!enableMagnetic) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  const handleClick = (e) => {
    if (enableRipple) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { x, y, id: Date.now() };
      setRipples([...ripples, newRipple]);
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
    
    if (onClick) onClick(e);
  };

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={tileFloat.initial}
      animate={tileFloat.animate}
      whileHover={enableMagnetic ? undefined : tileFloat.hover}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={enableMagnetic ? {
        x: mousePosition.x * 0.1,
        y: mousePosition.y * 0.1,
      } : {}}
      transition={{
        ...tileFloat.animate.transition,
        delay
      }}
      {...props}
    >
      {children}
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute pointer-events-none bg-white/20"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 40, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
};

export default AnimatedTile;