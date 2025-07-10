// Responsive utility functions for the dashboard

export const getResponsiveClasses = {
  // Text sizes
  text: {
    xs: (isMobile) => isMobile ? 'text-xs' : 'text-sm',
    sm: (isMobile) => isMobile ? 'text-sm' : 'text-base',
    md: (isMobile) => isMobile ? 'text-base' : 'text-lg',
    lg: (isMobile) => isMobile ? 'text-lg' : 'text-xl',
    xl: (isMobile) => isMobile ? 'text-xl' : 'text-2xl',
    '2xl': (isMobile) => isMobile ? 'text-xl' : 'text-3xl',
  },
  
  // Spacing
  padding: {
    sm: (isMobile, isTablet) => isMobile ? 'p-2' : isTablet ? 'p-3' : 'p-4',
    md: (isMobile, isTablet) => isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6',
    lg: (isMobile, isTablet) => isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-8',
  },
  
  // Margins
  margin: {
    sm: (isMobile, isTablet) => isMobile ? 'm-2' : isTablet ? 'm-3' : 'm-4',
    md: (isMobile, isTablet) => isMobile ? 'm-3' : isTablet ? 'm-4' : 'm-6',
    lg: (isMobile, isTablet) => isMobile ? 'm-4' : isTablet ? 'm-6' : 'm-8',
  },
  
  // Gaps
  gap: {
    sm: (isMobile) => isMobile ? 'gap-2' : 'gap-3',
    md: (isMobile) => isMobile ? 'gap-3' : 'gap-4',
    lg: (isMobile) => isMobile ? 'gap-4' : 'gap-6',
  },
  
  // Icon sizes
  icon: {
    sm: (isMobile) => isMobile ? 'w-4 h-4' : 'w-5 h-5',
    md: (isMobile) => isMobile ? 'w-5 h-5' : 'w-6 h-6',
    lg: (isMobile) => isMobile ? 'w-6 h-6' : 'w-8 h-8',
  },
  
  // Button sizes
  button: {
    sm: (isMobile) => isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
    md: (isMobile) => isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base',
    lg: (isMobile) => isMobile ? 'px-4 py-2 text-base' : 'px-6 py-3 text-lg',
  },
  
  // Grid systems
  grid: {
    auto: (isMobile, isTablet) => 
      isMobile ? 'grid-cols-1' : 
      isTablet ? 'grid-cols-2' : 
      'grid-cols-3',
    responsive: (mobile = 1, tablet = 2, desktop = 3) => 
      `grid-cols-${mobile} md:grid-cols-${tablet} lg:grid-cols-${desktop}`,
  },
  
  // Flex layouts
  flex: {
    responsive: (isMobile) => 
      isMobile ? 'flex-col space-y-4' : 'flex-row items-center justify-between space-x-4',
    stack: (isMobile) => 
      isMobile ? 'flex-col space-y-2' : 'flex-row items-center space-x-4',
  }
};

export const breakpoints = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
};

import React from 'react';

export const useMediaQuery = (query) => {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export const getScreenType = () => {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getOptimalImageSize = (screenSize) => {
  switch (screenSize) {
    case 'mobile':
      return { width: 300, height: 200 };
    case 'tablet':
      return { width: 500, height: 300 };
    case 'desktop':
    default:
      return { width: 800, height: 500 };
  }
};

export const getTruncatedText = (text, screenSize, maxLength = null) => {
  if (!maxLength) {
    maxLength = screenSize === 'mobile' ? 50 : screenSize === 'tablet' ? 100 : 150;
  }
  
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// CSS-in-JS responsive styles
export const responsiveStyles = {
  container: (screenSize) => ({
    maxWidth: screenSize === 'mobile' ? '100%' : screenSize === 'tablet' ? '768px' : '1200px',
    margin: '0 auto',
    padding: screenSize === 'mobile' ? '0.5rem' : screenSize === 'tablet' ? '1rem' : '1.5rem',
  }),
  
  card: (screenSize) => ({
    borderRadius: screenSize === 'mobile' ? '0.5rem' : '0.75rem',
    padding: screenSize === 'mobile' ? '1rem' : screenSize === 'tablet' ? '1.5rem' : '2rem',
    boxShadow: screenSize === 'mobile' ? 
      '0 1px 3px rgba(0,0,0,0.1)' : 
      '0 4px 6px rgba(0,0,0,0.1)',
  }),
  
  modal: (screenSize) => ({
    width: screenSize === 'mobile' ? '95vw' : screenSize === 'tablet' ? '80vw' : '60vw',
    maxWidth: screenSize === 'mobile' ? 'none' : '800px',
    margin: screenSize === 'mobile' ? '1rem' : '2rem auto',
  }),
};

// Animation variants for Framer Motion
export const responsiveAnimations = {
  slideIn: {
    mobile: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    desktop: {
      initial: { x: -300 },
      animate: { x: 0 },
      exit: { x: -300 },
    },
  },
  
  modal: {
    mobile: {
      initial: { y: '100%', opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 },
    },
    desktop: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 },
    },
  },
  
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

export default {
  getResponsiveClasses,
  breakpoints,
  useMediaQuery,
  getScreenType,
  isTouchDevice,
  getOptimalImageSize,
  getTruncatedText,
  responsiveStyles,
  responsiveAnimations,
};