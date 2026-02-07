'use client';

import { useEffect, useRef } from 'react';

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      color: string;
      life: number;
      maxLife: number;
    }

    const particles: Particle[] = [];
    const particleCount = window.innerWidth < 768 ? 80 : 150;

    // Create initial particles
    const createParticles = () => {
      for (let i = 0; i < particleCount; i++) {
        const isFromBottom = Math.random() > 0.5;
        particles.push({
          x: Math.random() * canvas.width,
          y: isFromBottom ? canvas.height + 10 : -10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: isFromBottom ? -Math.random() * 0.4 - 0.15 : Math.random() * 0.4 + 0.15,
          radius: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
          color: ['#00e5ff', '#0099cc', '#00ccff'][Math.floor(Math.random() * 3)],
          life: 0,
          maxLife: Math.random() * 300 + 200,
        });
      }
    };
    createParticles();

    // Animation loop
    const animate = () => {
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(0.5, '#0f1535');
      gradient.addColorStop(1, '#0a0e27');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle grid overlay
      ctx.strokeStyle = 'rgba(0, 149, 204, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let i = 0; i < canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Calculate opacity based on life
        const lifeRatio = p.life / p.maxLife;
        p.opacity = Math.sin(lifeRatio * Math.PI) * 0.6;

        // Helper function to convert hex color to rgba
        const hexToRgba = (hex: string, alpha: number) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Add glow effect
        const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glowGradient.addColorStop(0, hexToRgba(p.color, p.opacity));
        glowGradient.addColorStop(1, hexToRgba(p.color, 0));
        ctx.fillStyle = glowGradient;
        ctx.fillRect(p.x - p.radius * 4, p.y - p.radius * 4, p.radius * 8, p.radius * 8);

        // Draw particle core
        ctx.fillStyle = hexToRgba(p.color, p.opacity);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Remove dead particles and create new ones
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          const isFromBottom = Math.random() > 0.5;
          particles.push({
            x: Math.random() * canvas.width,
            y: isFromBottom ? canvas.height + 10 : -10,
            vx: (Math.random() - 0.5) * 0.5,
            vy: isFromBottom ? -Math.random() * 0.4 - 0.15 : Math.random() * 0.4 + 0.15,
            radius: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.2,
            color: ['#00e5ff', '#0099cc', '#00ccff'][Math.floor(Math.random() * 3)],
            life: 0,
            maxLife: Math.random() * 300 + 200,
          });
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #0f1535 50%, #0a0e27 100%)' }}
    />
  );
}
