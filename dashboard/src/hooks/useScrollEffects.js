import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpring, useScroll } from 'framer-motion';

export const useScrollEffects = (options = {}) => {
  const {
    parallaxEnabled = true,
    smoothScrollEnabled = true,
    scrollProgressEnabled = true,
    scrollAnimationsEnabled = true,
    scrollThreshold = 50,
    parallaxSpeed = 0.5
  } = options;

  const [scrollDirection, setScrollDirection] = useState('up');
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);

  // Framer Motion scroll hooks
  const { scrollYProgress } = useScroll();
  const smoothScrollY = useSpring(scrollY, { stiffness: 100, damping: 30 });

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      // Determine scroll direction
      if (currentScrollY > lastScrollY.current && currentScrollY > scrollThreshold) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up');
      }
      lastScrollY.current = currentScrollY;

      // Set scrolling state
      setIsScrolling(true);
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout.current);
    };
  }, [scrollThreshold]);

  // Smooth scroll to element
  const scrollToElement = useCallback((elementId, offset = 0) => {
    const element = document.getElementById(elementId);
    if (element && smoothScrollEnabled) {
      const y = element.getBoundingClientRect().top + window.pageYOffset + offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [smoothScrollEnabled]);

  // Smooth scroll to top
  const scrollToTop = useCallback(() => {
    if (smoothScrollEnabled) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [smoothScrollEnabled]);

  // Parallax effect calculator
  const calculateParallax = useCallback((speed = parallaxSpeed) => {
    if (!parallaxEnabled) return 0;
    return smoothScrollY.get() * speed;
  }, [parallaxEnabled, parallaxSpeed, smoothScrollY]);

  // Scroll-triggered animation detector
  const isInViewport = useCallback((element, threshold = 0) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return (
      rect.top <= windowHeight * (1 - threshold) &&
      rect.bottom >= windowHeight * threshold
    );
  }, []);

  // Create scroll-triggered animation hook
  const useScrollAnimation = (ref, threshold = 0.2) => {
    const [isVisible, setIsVisible] = useState(false);
    const hasAnimated = useRef(false);

    useEffect(() => {
      if (!scrollAnimationsEnabled || !ref.current) return;

      const checkVisibility = () => {
        if (ref.current && isInViewport(ref.current, threshold) && !hasAnimated.current) {
          setIsVisible(true);
          hasAnimated.current = true;
        }
      };

      checkVisibility();
      window.addEventListener('scroll', checkVisibility, { passive: true });
      return () => window.removeEventListener('scroll', checkVisibility);
    }, [ref, threshold]);

    return isVisible;
  };

  return {
    scrollY,
    smoothScrollY,
    scrollYProgress,
    scrollDirection,
    isScrolling,
    scrollToElement,
    scrollToTop,
    calculateParallax,
    isInViewport,
    useScrollAnimation
  };
};

// Preset animations for scroll-triggered elements
export const scrollAnimations = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } }
  },
  slideUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  },
  slideDown: {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  },
  slideLeft: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
  },
  slideRight: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } }
  },
  rotate: {
    hidden: { opacity: 0, rotate: -10 },
    visible: { opacity: 1, rotate: 0, transition: { duration: 0.6 } }
  },
  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

// Parallax wrapper component
export const ParallaxWrapper = ({ children, speed = 0.5, className = '' }) => {
  const { calculateParallax } = useScrollEffects();
  const parallaxY = calculateParallax(speed);

  return (
    <div 
      className={className}
      style={{ transform: `translateY(${parallaxY}px)` }}
    >
      {children}
    </div>
  );
};