import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useScrollEffects, scrollAnimations } from '../hooks/useScrollEffects';
import ScrollAnimatedSection from './ScrollAnimatedSection';
import ParallaxSection from './ParallaxSection';
import * as Icons from 'lucide-react';

const ScrollEffectsShowcase = ({ darkMode = true }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  // Transform values for various effects
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 1, 1, 0]);

  const features = [
    { 
      icon:Icons.Rocket, 
      title: "Lightning Fast", 
      description: "Optimized performance with lazy loading and code splitting",
      animation: "slideLeft"
    },
    { 
      icon:Icons.Shield, 
      title: "Enterprise Security", 
      description: "Bank-grade encryption and secure API communication",
      animation: "slideRight"
    },
    { 
      icon:Icons.Users, 
      title: "Multi-Agent System", 
      description: "Coordinate 10-100+ AI agents seamlessly",
      animation: "slideUp"
    },
    { 
      icon:Icons.Zap, 
      title: "Real-time Updates", 
      description: "Live WebSocket connections for instant feedback",
      animation: "scale"
    }
  ];

  const stats = [
    { label: "Active Agents", value: "47", trend: "+12%" },
    { label: "Tasks Completed", value: "1,284", trend: "+34%" },
    { label: "Code Generated", value: "156K", trend: "+56%" },
    { label: "Success Rate", value: "99.8%", trend: "+2.3%" }
  ];

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Hero Section with Parallax */}
      <ParallaxSection 
        speed={0.5} 
        className="min-h-screen flex items-center justify-center"
        darkMode={darkMode}
      >
        <ScrollAnimatedSection animation="fadeIn" className="text-center px-4">
          <motion.div
            style={{ scale }}
            className="inline-block mb-8"
          >
            <Icons.Sparkles className={`w-24 h-24 mx-auto ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </motion.div>
          
          <h1 className={`text-5xl md:text-7xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Scroll Effects
          </h1>
          
          <p className={`text-xl md:text-2xl ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          } max-w-3xl mx-auto`}>
            Experience smooth scrolling, parallax effects, and beautiful animations
          </p>
          
          <motion.div 
            className="mt-12"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div className={`w-6 h-10 border-2 rounded-full mx-auto ${
              darkMode ? 'border-white/30' : 'border-gray-400'
            }`}>
              <div className={`w-1.5 h-3 rounded-full mx-auto mt-2 ${
                darkMode ? 'bg-white' : 'bg-gray-600'
              } animate-bounce`} />
            </div>
          </motion.div>
        </ScrollAnimatedSection>
      </ParallaxSection>

      {/* Features Section with Staggered Animations */}
      <section className={`py-20 px-4 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <ScrollAnimatedSection animation="slideUp" className="max-w-6xl mx-auto">
          <h2 className={`text-4xl font-bold text-center mb-16 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Platform Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <ScrollAnimatedSection
                key={index}
                animation={feature.animation}
                delay={index * 0.1}
                className={`p-6 rounded-xl backdrop-blur-sm ${
                  darkMode 
                    ? 'bg-white/5 border border-white/10' 
                    : 'bg-white border border-gray-200'
                }`}
              >
                <feature.icon className={`w-12 h-12 mb-4 ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <h3 className={`text-xl font-semibold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {feature.title}
                </h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {feature.description}
                </p>
              </ScrollAnimatedSection>
            ))}
          </div>
        </ScrollAnimatedSection>
      </section>

      {/* Stats Section with Number Animations */}
      <ParallaxSection 
        speed={0.3}
        className={`py-20 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}
        darkMode={darkMode}
      >
        <ScrollAnimatedSection animation="scale" className="max-w-6xl mx-auto px-4">
          <h2 className={`text-4xl font-bold text-center mb-16 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Platform Statistics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <ScrollAnimatedSection
                key={index}
                animation="slideUp"
                delay={index * 0.1}
                className="text-center"
              >
                <div className={`text-4xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {stat.value}
                </div>
                <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {stat.label}
                </div>
                <div className={`text-sm mt-2 ${
                  stat.trend.startsWith('+') 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {stat.trend}
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </ScrollAnimatedSection>
      </ParallaxSection>

      {/* Code Preview Section */}
      <section className={`py-20 px-4 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <ScrollAnimatedSection animation="rotate" className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className={`text-4xl font-bold mb-6 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Intelligent Code Generation
              </h2>
              <p className={`text-lg mb-8 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Our AI agents collaborate to write clean, efficient, and well-documented code. 
                Each agent specializes in different aspects of development, ensuring comprehensive coverage.
              </p>
              <ScrollAnimatedSection animation="slideRight" delay={0.3}>
                <div className="flex flex-wrap gap-4">
                  <span className={`px-4 py-2 rounded-full text-sm ${
                    darkMode 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    React
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm ${
                    darkMode 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    Node.js
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm ${
                    darkMode 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    Python
                  </span>
                </div>
              </ScrollAnimatedSection>
            </div>
            
            <ScrollAnimatedSection animation="slideLeft" className="relative">
              <motion.div
                style={{ rotate }}
                className="absolute -top-10 -right-10 w-32 h-32 opacity-10"
              >
                <Icons.Code className="w-full h-full" />
              </motion.div>
              <div className={`rounded-xl overflow-hidden shadow-2xl ${
                darkMode ? 'bg-gray-900' : 'bg-gray-100'
              }`}>
                <div className={`p-4 ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-200'
                } flex items-center gap-2`}>
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <pre className={`p-6 overflow-x-auto ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <code>{`function generateSaaS(idea) {
  const agents = deployAgentSwarm();
  const architecture = await agents.claude.design();
  const backend = await agents.gpt.implement();
  const tests = await agents.deepseek.test();
  
  return launchProduct();
}`}</code>
                </pre>
              </div>
            </ScrollAnimatedSection>
          </div>
        </ScrollAnimatedSection>
      </section>

      {/* CTA Section */}
      <motion.section 
        style={{ opacity }}
        className={`py-20 px-4 text-center ${
          darkMode ? 'bg-gradient-to-b from-blue-900 to-purple-900' : 'bg-gradient-to-b from-blue-100 to-purple-100'
        }`}
      >
        <ScrollAnimatedSection animation="scale">
          <h2 className={`text-4xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Ready to Build Your Next SaaS?
          </h2>
          <p className={`text-xl mb-8 ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Deploy your AI agent swarm and ship in 24 hours
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-8 py-4 rounded-lg font-semibold text-lg ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } transition-colors`}
          >
            Get Started
          </motion.button>
        </ScrollAnimatedSection>
      </motion.section>
    </div>
  );
};

export default ScrollEffectsShowcase;