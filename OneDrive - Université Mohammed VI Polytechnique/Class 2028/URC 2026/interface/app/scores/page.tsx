'use client';

import Link from 'next/link';
import { useState } from 'react';
import ScoresInput from '@/components/ScoresInput';
import ResultsDisplay from '@/components/ResultsDisplay';

export default function ScoresPage() {
  const [showResults, setShowResults] = useState(false);

  return (
    <main className="h-screen text-cyan-300 font-mono overflow-hidden flex flex-col relative z-10">


      {/* Top Navigation */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-2 border-b border-cyan-500/30 bg-gradient-to-r from-transparent via-slate-900/20 to-transparent backdrop-blur-md">
        <Link href="/">
          <button className="border border-cyan-500/60 px-3 py-1 text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 hover:border-cyan-400 transition-all duration-200 rounded">
            ← BACK
          </button>
        </Link>
        <h1 className="text-white font-bold text-center flex-1" style={{ fontFamily: 'Press Start 2P', fontSize: '1rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
          SCORES
        </h1>
        <div className="w-16" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative z-20 px-3 py-3 overflow-hidden">
        <ScoresInput onShowResults={() => setShowResults(true)} />
      </div>

      {/* Results Modal */}
      {showResults && (
        <ResultsDisplay onClose={() => setShowResults(false)} />
      )}

      {/* 3D Grid Floor - Bottom */}
      <div className="relative z-10 h-8 bg-gradient-to-t from-cyan-500/20 via-transparent to-transparent overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 1600 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(0, 229, 255, 0.2)" />
              <stop offset="100%" stopColor="rgba(0, 229, 255, 0.5)" />
            </linearGradient>
          </defs>
          {/* Horizontal lines */}
          {Array.from({ length: 15 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 13} x2="1600" y2={i * 13} stroke="url(#gridGradient)" strokeWidth="1" />
          ))}
          {/* Diagonal lines for perspective */}
          {Array.from({ length: 40 }).map((_, i) => (
            <line key={`d${i}`} x1={i * 40} y1="0" x2={i * 40 - 200} y2="200" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
          ))}
        </svg>
      </div>
    </main>
  );
}
