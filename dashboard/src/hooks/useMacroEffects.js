import { useState, useCallback, useRef } from 'react';
import { useSpring, useTransform } from 'framer-motion';

export const useMagneticHover = (strength = 0.3) => {
  const [hovering, setHovering] = useState(false);
  const mouseX = useSpring(0, { stiffness: 300, damping: 20 });
  const mouseY = useSpring(0, { stiffness: 300, damping: 20 });

  const handleMouseMove = useCallback((e) => {
    if (!hovering) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = (e.clientX - centerX) * strength;
    const distanceY = (e.clientY - centerY) * strength;
    
    mouseX.set(distanceX);
    mouseY.set(distanceY);
  }, [hovering, mouseX, mouseY, strength]);

  const handleMouseEnter = useCallback(() => {
    setHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return {
    x: mouseX,
    y: mouseY,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
};

export const use3DRotation = (intensity = 10) => {
  const mouseX = useSpring(0, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(0, { stiffness: 300, damping: 30 });
  
  const rotateX = useTransform(mouseY, [-1, 1], [intensity, -intensity]);
  const rotateY = useTransform(mouseX, [-1, 1], [-intensity, intensity]);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) / (rect.width / 2);
    const y = (e.clientY - centerY) / (rect.height / 2);
    
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return {
    rotateX,
    rotateY,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave
    },
    style: {
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    }
  };
};

export const useParallaxMouse = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef();

  const handleMouseMove = useCallback((e) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    });
  }, []);

  const getParallaxStyle = useCallback((depth = 1) => ({
    transform: `translate(${mousePosition.x * depth * 20}px, ${mousePosition.y * depth * 20}px)`
  }), [mousePosition]);

  return {
    mousePosition,
    handleMouseMove,
    getParallaxStyle
  };
};

export const useGlowEffect = (color = 'blue', intensity = 20) => {
  const [glowing, setGlowing] = useState(false);
  
  const glowStyle = glowing ? {
    boxShadow: `0 0 ${intensity}px rgba(59, 130, 246, 0.5), 0 0 ${intensity * 2}px rgba(59, 130, 246, 0.3)`,
    transition: 'box-shadow 0.3s ease'
  } : {
    boxShadow: 'none',
    transition: 'box-shadow 0.3s ease'
  };

  return {
    glowStyle,
    setGlowing,
    handlers: {
      onMouseEnter: () => setGlowing(true),
      onMouseLeave: () => setGlowing(false)
    }
  };
};