import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedTile } from '../src/components/ui/AnimatedTile';
import { ScrollReveal, StaggeredReveal } from '../src/components/ui/ScrollReveal';
import { ParallaxBackground } from '../src/components/ui/ParallaxBackground';
import { useMagneticHover, use3DRotation, useGlowEffect } from '../src/hooks/useMacroEffects';
import {
  tileFloat,
  cascadeCards,
  fluidMorph,
  elasticScale,
  card3D,
  pageTransition,
  ripple
} from '../src/components/ui/animations';

const DemoCard = ({ title, children, darkMode }) => (
  <div className={`p-6 rounded-xl border ${
    darkMode 
      ? 'bg-white/10 border-white/20 backdrop-blur-sm' 
      : 'bg-white border-gray-200 shadow-lg'
  }`}>
    <h3 className={`text-lg font-semibold mb-4 ${
      darkMode ? 'text-white' : 'text-gray-900'
    }`}>{title}</h3>
    {children}
  </div>
);

const MagneticCard = ({ darkMode }) => {
  const { x, y, handlers } = useMagneticHover(0.3);
  
  return (
    <motion.div
      style={{ x, y }}
      {...handlers}
      className={`p-8 rounded-xl cursor-pointer transition-colors ${
        darkMode 
          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white' 
          : 'bg-gradient-to-br from-blue-400 to-purple-400 text-white'
      }`}
    >
      <h4 className="text-xl font-bold mb-2">Magnetic Hover</h4>
      <p className="text-sm opacity-90">Move your mouse over me!</p>
    </motion.div>
  );
};

const Card3DDemo = ({ darkMode }) => {
  const { rotateX, rotateY, handlers } = use3DRotation(15);
  
  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      {...handlers}
      className={`p-8 rounded-xl cursor-pointer ${
        darkMode 
          ? 'bg-gradient-to-br from-green-600 to-teal-600 text-white' 
          : 'bg-gradient-to-br from-green-400 to-teal-400 text-white'
      }`}
    >
      <h4 className="text-xl font-bold mb-2">3D Rotation</h4>
      <p className="text-sm opacity-90">Hover for 3D effect!</p>
    </motion.div>
  );
};

const GlowCard = ({ darkMode }) => {
  const { glowStyle, handlers } = useGlowEffect('blue', 30);
  
  return (
    <div
      style={glowStyle}
      {...handlers}
      className={`p-8 rounded-xl cursor-pointer transition-all ${
        darkMode 
          ? 'bg-gradient-to-br from-pink-600 to-orange-600 text-white' 
          : 'bg-gradient-to-br from-pink-400 to-orange-400 text-white'
      }`}
    >
      <h4 className="text-xl font-bold mb-2">Glow Effect</h4>
      <p className="text-sm opacity-90">Hover for glow!</p>
    </div>
  );
};

export default function MacroEffectsDemo() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <ParallaxBackground darkMode={darkMode}>
      <div className={`min-h-screen ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900/90 via-blue-900/90 to-purple-900/90' 
          : 'bg-gradient-to-br from-gray-50/90 via-blue-50/90 to-purple-50/90'
      }`}>
        {/* Header */}
        <motion.div 
          {...pageTransition}
          className="p-8 text-center"
        >
          <h1 className={`text-4xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Macro Moving Effects Showcase
          </h1>
          <p className={`text-lg mb-6 ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Experience smooth, engaging animations throughout the dashboard
          </p>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-6 py-2 rounded-lg transition-colors ${
              darkMode 
                ? 'bg-white/20 text-white hover:bg-white/30' 
                : 'bg-gray-900/10 text-gray-900 hover:bg-gray-900/20'
            }`}
          >
            Toggle {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </motion.div>

        {/* Animated Tiles Demo */}
        <div className="px-8 py-12">
          <ScrollReveal animation="slideUp">
            <DemoCard title="Animated Tiles with Float Effect" darkMode={darkMode}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((index) => (
                  <AnimatedTile
                    key={index}
                    delay={index * 0.1}
                    className={`p-6 rounded-xl text-center ${
                      darkMode 
                        ? 'bg-white/10 border border-white/20' 
                        : 'bg-white border border-gray-200 shadow-md'
                    }`}
                  >
                    <div className="text-3xl mb-2">🚀</div>
                    <h4 className={`font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>Tile {index + 1}</h4>
                    <p className={`text-sm mt-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Smooth entrance animation with hover effects
                    </p>
                  </AnimatedTile>
                ))}
              </div>
            </DemoCard>
          </ScrollReveal>
        </div>

        {/* Interactive Cards */}
        <div className="px-8 py-12">
          <ScrollReveal animation="slideRight">
            <DemoCard title="Interactive Hover Effects" darkMode={darkMode}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MagneticCard darkMode={darkMode} />
                <Card3DDemo darkMode={darkMode} />
                <GlowCard darkMode={darkMode} />
              </div>
            </DemoCard>
          </ScrollReveal>
        </div>

        {/* Staggered List Demo */}
        <div className="px-8 py-12">
          <ScrollReveal animation="zoom">
            <DemoCard title="Staggered Reveal Animation" darkMode={darkMode}>
              <StaggeredReveal staggerDelay={0.1}>
                {['Performance Metrics', 'Agent Status', 'Task Queue', 'System Health', 'Analytics'].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ x: 10 }}
                    className={`p-4 mb-3 rounded-lg border transition-all cursor-pointer ${
                      darkMode 
                        ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>{item}</span>
                      <span className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>→</span>
                    </div>
                  </motion.div>
                ))}
              </StaggeredReveal>
            </DemoCard>
          </ScrollReveal>
        </div>

        {/* Morphing Cards */}
        <div className="px-8 py-12">
          <ScrollReveal animation="morph">
            <DemoCard title="Fluid Morph Transitions" darkMode={darkMode}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  {...fluidMorph}
                  whileHover={{ scale: 1.05 }}
                  className={`p-8 rounded-xl ${
                    darkMode 
                      ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/20' 
                      : 'bg-gradient-to-br from-blue-100 to-purple-100 border border-gray-200'
                  }`}
                >
                  <h4 className={`text-xl font-bold mb-2 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>Morphing Card</h4>
                  <p className={`${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Watch the smooth border radius animation
                  </p>
                </motion.div>
                
                <motion.div
                  {...elasticScale}
                  whileHover={{ rotate: 5 }}
                  className={`p-8 rounded-xl ${
                    darkMode 
                      ? 'bg-gradient-to-br from-green-600/20 to-teal-600/20 border border-white/20' 
                      : 'bg-gradient-to-br from-green-100 to-teal-100 border border-gray-200'
                  }`}
                >
                  <h4 className={`text-xl font-bold mb-2 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>Elastic Scale</h4>
                  <p className={`${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Bouncy entrance animation
                  </p>
                </motion.div>
              </div>
            </DemoCard>
          </ScrollReveal>
        </div>

        {/* Footer */}
        <div className="p-8 text-center">
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            These effects are now available throughout the EzAigent dashboard
          </p>
        </div>
      </div>
    </ParallaxBackground>
  );
}