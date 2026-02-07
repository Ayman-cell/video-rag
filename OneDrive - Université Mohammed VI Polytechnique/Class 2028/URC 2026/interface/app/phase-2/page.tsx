'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTeams } from '@/context/TeamsContext';
import Phase2Manager from '@/components/Phase2Manager';

export default function Phase2() {
  const { teams } = useTeams();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <main className="h-screen text-cyan-300 font-mono overflow-hidden flex flex-col relative z-10">


      {/* Top: Logos and Navigation */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-gradient-to-r from-transparent via-slate-900/20 to-transparent backdrop-blur-md">
        {/* Left Side: 2 Logos */}
        <div className="flex items-center gap-6">
          {/* EMINES Logo */}
          <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
            <img src="/logo-emines.png" alt="EMINES" className="h-32 w-auto object-contain" />
          </div>

          {/* URC Logo */}
          <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
            <img src="/logo-urc.png" alt="URC" className="h-32 w-auto object-contain" />
          </div>
        </div>

        {/* Center: Title */}
        <h1 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '0.8rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
          PHASE 2
        </h1>

        {/* Right Side: 2 Logos + Navigation */}
        <div className="flex items-center gap-6">
          {/* UM6P Logo */}
          <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
            <img src="/logo-sole.png" alt="UM6P" className="max-h-full max-w-full object-contain" />
          </div>

          {/* Tech Club Logo */}
          <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
            <img src="/logo-tech.png" alt="Tech Club" className="max-h-full max-w-full object-contain" />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="border border-cyan-500/60 px-3 py-1 text-cyan-300 font-bold text-xs cursor-pointer hover:bg-cyan-500/30 hover:border-cyan-400 transition-all duration-200 bg-transparent whitespace-nowrap rounded"
            >
              LEADERBOARD
            </button>
            <Link href="/">
              <div className="border-2 border-cyan-400 px-3 py-1 text-cyan-300 font-bold text-xs cursor-pointer hover:bg-cyan-400 hover:text-blue-950 transition-colors whitespace-nowrap">
                HOME
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-20 overflow-hidden">
        <Phase2Manager teams={teams} showLeaderboard={showLeaderboard} setShowLeaderboard={setShowLeaderboard} phase="phase-2" />
      </div>

      {/* 3D Grid Floor */}
      <div className="relative z-10 h-4 bg-gradient-to-t from-cyan-600/30 via-blue-800/40 to-transparent overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 1600 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(0, 217, 255, 0.3)" />
              <stop offset="100%" stopColor="rgba(0, 217, 255, 0.8)" />
            </linearGradient>
          </defs>
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 10} x2="1600" y2={i * 10} stroke="url(#gridGradient)" strokeWidth="1" />
          ))}
          {Array.from({ length: 40 }).map((_, i) => (
            <line key={`d${i}`} x1={i * 40} y1="0" x2={i * 40 - 200} y2="50" stroke="rgba(0, 217, 255, 0.4)" strokeWidth="1" />
          ))}
        </svg>
      </div>
    </main>
  );
}
