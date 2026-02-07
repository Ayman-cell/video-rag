'use client';

import { useScores } from '@/context/ScoresContext';
import { useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
}

interface Confetti {
  id: number;
  left: number;
  delay: number;
  duration: number;
}

export default function ResultsDisplay({ onClose }: Props) {
  const { getRankedTeams } = useScores();
  const rankedTeams = getRankedTeams().slice(0, 4);
  const [currentPlace, setCurrentPlace] = useState(0); // 0: 4th, 1: 3rd, 2: 2nd, 3: 1st
  const [showAnimation, setShowAnimation] = useState(true);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const placeOrder = [3, 2, 1, 0]; // 4th, 3rd, 2nd, 1st

  // Generate confetti
  useEffect(() => {
    const newConfetti: Confetti[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1
    }));
    setConfetti(newConfetti);
  }, [currentPlace]);

  // Play victory music
  useEffect(() => {
    const playVictoryMusic = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioContext.currentTime;

        const notes = [
          { freq: 262, time: 0, duration: 0.3 },
          { freq: 262, time: 0.3, duration: 0.3 },
          { freq: 330, time: 0.6, duration: 0.3 },
          { freq: 392, time: 0.9, duration: 0.5 },
          { freq: 523, time: 1.4, duration: 0.5 },
          { freq: 523, time: 1.9, duration: 0.3 },
          { freq: 523, time: 2.2, duration: 0.3 },
          { freq: 523, time: 2.5, duration: 0.8 },
        ];

        notes.forEach(({ freq, time, duration }) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.frequency.value = freq;
          osc.type = 'sine';

          gain.gain.setValueAtTime(0.3, now + time);
          gain.gain.exponentialRampToValueAtTime(0.01, now + time + duration);

          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.start(now + time);
          osc.stop(now + time + duration);
        });
      } catch (e) {
        console.error('[v0] Error playing victory music:', e);
      }
    };

    playVictoryMusic();
  }, [currentPlace]);

  // Handle keyboard navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPlace]);

  const handleNext = () => {
    if (currentPlace < 3) {
      setShowAnimation(false);
      setTimeout(() => {
        setCurrentPlace(currentPlace + 1);
        setShowAnimation(true);
      }, 300);
    } else {
      onClose();
    }
  };

  const placeIndex = placeOrder[currentPlace];
  const team = rankedTeams[placeIndex];

  if (!team) return null;

  const placeLabels = ['4TH PLACE', '3RD PLACE', '2ND PLACE', 'CHAMPION'];
  const medalEmojis = ['', '🥉', '🥈', '👑'];
  const colors = ['cyan', 'orange', 'cyan', 'yellow'];
  const borderColors = {
    cyan: 'border-cyan-600',
    orange: 'border-orange-400',
    yellow: 'border-yellow-400'
  };
  const textColors = {
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400'
  };
  const podiumHeights = ['h-16', 'h-24', 'h-32', 'h-40'];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-950 to-black overflow-hidden z-50 flex flex-col">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-cyan-400 hover:text-red-400 font-bold text-3xl z-60"
      >
        ×
      </button>

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="fixed pointer-events-none animate-fall"
          style={{
            left: `${c.left}%`,
            top: '-20px',
            width: '10px',
            height: '10px',
            backgroundColor: ['#00D9FF', '#FFD700', '#FF69B4', '#00FF00'][Math.floor(Math.random() * 4)],
            opacity: 0,
            animation: `fall ${c.duration}s linear ${c.delay}s forwards`,
          }}
        />
      ))}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 relative">
        {/* Title */}
        <h1
          className={`text-white font-bold transition-all duration-500 ${showAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
          style={{
            fontFamily: 'Press Start 2P',
            fontSize: '2.5rem',
            textShadow: '0 0 40px rgba(0, 217, 255, 0.9)'
          }}
        >
          {placeLabels[currentPlace]}
        </h1>

        {/* Podium Display */}
        <div
          className={`flex flex-col items-center gap-6 transition-all duration-500 ${showAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
        >
          {/* Medal/Trophy */}
          <div className="text-9xl animate-bounce" style={{ animationDuration: '1s' }}>
            {medalEmojis[currentPlace] || '🏆'}
          </div>

          {/* Team Name */}
          <div className={`text-center font-mono font-bold text-4xl ${textColors[colors[currentPlace]]}`}>
            {team.name}
          </div>

          {/* Score */}
          <div className={`text-center font-mono font-bold text-5xl ${textColors[colors[currentPlace]]}`}>
            {team.score}
          </div>

          {/* Podium Block */}
          <div className={`border-4 ${borderColors[colors[currentPlace]]} bg-blue-900/60 w-40 flex items-end justify-center ${podiumHeights[currentPlace]} relative`}>
            <span className={`font-bold text-3xl ${textColors[colors[currentPlace]]}`}>
              #{4 - currentPlace}
            </span>

            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 animate-pulse" style={{ background: `linear-gradient(135deg, transparent, ${colors[currentPlace] === 'yellow' ? 'rgba(255, 215, 0, 0.3)' : `rgba(0, 217, 255, 0.3)`})` }} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-6 border-t-2 border-cyan-600 bg-blue-900/40">
        <div className="text-cyan-400 font-mono font-bold text-sm">
          {currentPlace + 1} / 4
        </div>
        <button
          onClick={handleNext}
          className="border-2 border-cyan-400 bg-transparent px-8 py-3 text-cyan-300 font-bold text-base hover:bg-cyan-400 hover:text-blue-950 transition-colors"
        >
          {currentPlace === 3 ? 'FINISH' : 'NEXT'}
        </button>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
