import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useScrollEffects } from '../hooks/useScrollEffects';

const ScrollToTop = ({ 
  showAfter = 300,
  darkMode = true,
  position = { bottom: 20, right: 20 }
}) => {
  const { scrollY, scrollToTop } = useScrollEffects();
  const show = scrollY > showAfter;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className={`fixed z-50 p-3 rounded-full shadow-lg backdrop-blur-sm
            ${darkMode 
              ? 'bg-blue-600/80 hover:bg-blue-600 text-white' 
              : 'bg-blue-500/80 hover:bg-blue-500 text-white'
            } transition-colors duration-200`}
          style={position}
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;