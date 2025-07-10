'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const ParticleField = ({ density = 50, color = '#00D4FF', interactive = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < density; i++) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.8 + 0.2,
          life: Math.random() * 100 + 50,
          maxLife: 150,
          pulse: Math.random() * Math.PI * 2
        });
      }
    };

    initParticles();

    // Mouse tracking
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove);
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      particles.forEach((particle, index) => {
        // Update particle
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.pulse += 0.1;

        // Mouse interaction
        if (interactive) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            const force = (100 - distance) / 100;
            particle.vx += dx * force * 0.01;
            particle.vy += dy * force * 0.01;
            particle.opacity = Math.min(1, particle.opacity + force * 0.02);
          }
        }

        // Boundary collision
        if (particle.x < 0 || particle.x > canvas.offsetWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.offsetHeight) particle.vy *= -1;

        // Reset if dead
        if (particle.life <= 0) {
          particle.x = Math.random() * canvas.offsetWidth;
          particle.y = Math.random() * canvas.offsetHeight;
          particle.life = particle.maxLife;
          particle.opacity = Math.random() * 0.8 + 0.2;
        }

        // Draw particle with glow effect
        const glowSize = particle.size + Math.sin(particle.pulse) * 1;
        const alpha = particle.opacity * (particle.life / particle.maxLife);
        
        // Outer glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, glowSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.shadowBlur = 3;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Connection lines
        particles.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 80) {
              ctx.globalAlpha = (80 - distance) / 80 * 0.2 * alpha;
              ctx.strokeStyle = color;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
            }
          }
        });
      });

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [density, color, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export const HolographicGrid = ({ size = 50, opacity = 0.1, color = '#00D4FF' }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${color}${Math.round(opacity * 255).toString(16)} 1px, transparent 1px),
            linear-gradient(180deg, ${color}${Math.round(opacity * 255).toString(16)} 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
        }}
        animate={{
          x: [0, size],
          y: [0, size],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, ${color}${Math.round(opacity * 50).toString(16)} 100%)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export const DataStream = ({ direction = 'up', speed = 1, density = 10 }) => {
  const streamRef = useRef(null);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const chars = '01';
    const columns = Math.floor(stream.offsetWidth / 20);
    
    for (let i = 0; i < density; i++) {
      const span = document.createElement('span');
      span.style.position = 'absolute';
      span.style.left = `${Math.random() * 100}%`;
      span.style.color = '#00FF41';
      span.style.fontSize = '12px';
      span.style.fontFamily = 'monospace';
      span.style.opacity = '0.7';
      span.style.textShadow = '0 0 5px #00FF41';
      span.textContent = chars[Math.floor(Math.random() * chars.length)];
      
      const animate = () => {
        let y = direction === 'up' ? 100 : -10;
        const animate = () => {
          y += direction === 'up' ? -speed : speed;
          span.style.top = `${y}%`;
          
          if ((direction === 'up' && y < -10) || (direction === 'down' && y > 110)) {
            y = direction === 'up' ? 100 : -10;
            span.style.left = `${Math.random() * 100}%`;
            span.textContent = chars[Math.floor(Math.random() * chars.length)];
          }
          
          requestAnimationFrame(animate);
        };
        animate();
      };
      
      animate();
      stream.appendChild(span);
    }

    return () => {
      while (stream.firstChild) {
        stream.removeChild(stream.firstChild);
      }
    };
  }, [direction, speed, density]);

  return (
    <div
      ref={streamRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
    />
  );
};

export const HolographicScanline = ({ speed = 2, height = 3, color = '#00D4FF' }) => {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `linear-gradient(180deg, transparent 0%, ${color}40 50%, transparent 100%)`,
        height: `${height}px`,
        filter: 'blur(1px)',
        boxShadow: `0 0 20px ${color}`,
      }}
      animate={{
        y: ['-100%', '100vh'],
      }}
      transition={{
        duration: speed,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

export const QuantumField = ({ complexity = 3 }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: complexity }, (_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from ${i * 120}deg, transparent, #00D4FF10, transparent)`,
            borderRadius: '50%',
          }}
          animate={{
            rotate: [0, 360],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};