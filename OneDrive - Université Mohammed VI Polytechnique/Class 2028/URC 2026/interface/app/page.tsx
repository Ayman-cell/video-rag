'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTeams } from '@/context/TeamsContext';

export default function Home() {
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [teamInput, setTeamInput] = useState('');
  const [showTeamsPanel, setShowTeamsPanel] = useState(false);
  const { teams, addTeam, removeTeam } = useTeams();

  return (
    <main className="h-screen text-cyan-300 font-mono overflow-hidden flex flex-col relative z-10">
      {/* Glow orbs - decorative background elements */}
      <div className="fixed top-1/4 right-1/4 w-96 h-96 pointer-events-none z-0 opacity-20" style={{
        background: 'radial-gradient(circle, rgba(0, 229, 255, 0.3) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'subtle-shift 8s ease-in-out infinite'
      }} />
      <div className="fixed bottom-1/3 left-1/3 w-80 h-80 pointer-events-none z-0 opacity-15" style={{
        background: 'radial-gradient(circle, rgba(0, 153, 204, 0.3) 0%, transparent 70%)',
        filter: 'blur(35px)',
        animation: 'subtle-shift 10s ease-in-out infinite reverse'
      }} />

      {/* Top: Logos aligned horizontally - Full Width */}
      <div className="relative z-20 flex items-center justify-center gap-6 px-6 py-4 border-b border-cyan-500/30 bg-gradient-to-r from-transparent via-slate-900/20 to-transparent backdrop-blur-md">
        {/* EMINES Logo */}
        <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
          <img src="/logo-emines.png" alt="EMINES School of Industrial Management" className="h-32 w-auto object-contain" />
        </div>

        {/* URC Logo */}
        <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
          <img src="/logo-urc.png" alt="URC" className="h-32 w-auto object-contain" />
        </div>

        {/* SOLE Logo */}
        <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
          <img src="/logo-sole.png" alt="UM6P SOLE" className="max-h-full max-w-full object-contain" />
        </div>

        {/* Tech Club Logo */}
        <div className="border border-cyan-500/40 p-3 bg-slate-900/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center h-24 w-56 rounded backdrop-blur-sm">
          <img src="/logo-tech.png" alt="Tech Club" className="max-h-full max-w-full object-contain" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center relative z-20 px-6 gap-8 overflow-hidden">
        {/* Left: Teams Panel (toggleable) */}
        {showTeamsPanel && (
          <div className="border border-cyan-500/40 p-4 bg-slate-900/40 max-w-sm w-full h-full flex flex-col rounded backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-cyan-300 font-bold text-sm" style={{ fontFamily: 'Press Start 2P', fontSize: '0.6rem' }}>
                TEAMS
              </h2>
              <button
                onClick={() => setShowTeamsPanel(false)}
                className="text-cyan-400 hover:text-red-400 font-bold text-lg"
              >
                ×
              </button>
            </div>
            
            {/* Team Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={teamInput}
                onChange={(e) => {
                  if (e.target.value.length <= 20) setTeamInput(e.target.value);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && teamInput && teams.length < 15) {
                    addTeam(teamInput);
                    setTeamInput('');
                  }
                }}
                placeholder="Team name (max 15)..."
                className="flex-1 bg-slate-900/50 border border-cyan-500/40 px-2 py-1 text-cyan-300 text-xs placeholder-cyan-600 focus:outline-none focus:border-cyan-400 transition-colors rounded"
                maxLength={20}
              />
              <button
                onClick={() => {
                  if (teamInput && teams.length < 15) {
                    addTeam(teamInput);
                    setTeamInput('');
                  }
                }}
                disabled={teams.length >= 15}
                className="border border-cyan-500/60 px-2 py-1 text-cyan-300 text-xs hover:bg-cyan-500/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                ADD
              </button>
            </div>

            {/* Teams List */}
            <div className="flex flex-wrap gap-2 flex-1 overflow-y-auto">
              {teams.map((team) => (
                <div
                  key={team}
                  className="bg-cyan-500/20 border border-cyan-500/50 px-2 py-1 text-cyan-300 text-xs flex items-center gap-2 rounded hover:bg-cyan-500/30 transition-colors"
                >
                  {team}
                  <button
                    onClick={() => removeTeam(team)}
                    className="text-cyan-400 hover:text-red-400 cursor-pointer font-bold transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {teams.length === 0 && (
              <p className="text-cyan-600 text-xs text-center mt-4">No teams added</p>
            )}
            <p className="text-cyan-600 text-xs text-center mt-2">{teams.length}/15 teams</p>
          </div>
        )}

        {/* Center: Menu */}
        <div className="flex flex-col gap-4 items-center justify-center">
          <h1 className="text-white font-bold mb-2" style={{ fontFamily: 'Press Start 2P', fontSize: '1.8rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
            START GAME
          </h1>

          {/* Teams Button */}
          <button
            onClick={() => setShowTeamsPanel(!showTeamsPanel)}
            className={`cursor-pointer transition-all duration-300 px-10 py-3 border font-bold text-base rounded ${
              showTeamsPanel
                ? 'border-cyan-300 text-cyan-100 shadow-lg shadow-cyan-500/50 bg-cyan-500/20'
                : 'border-cyan-500/60 text-cyan-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30'
            }`}
          >
            TEAMS
          </button>

          {/* Roulette */}
          <Link href="/roulette">
            <div
              className={`cursor-pointer transition-all duration-300 px-10 py-3 border font-bold text-base rounded ${
                hoveredMenu === 'roulette'
                  ? 'border-cyan-300 text-cyan-100 shadow-lg shadow-cyan-500/50 bg-cyan-500/20'
                  : 'border-cyan-500/60 text-cyan-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30'
              }`}
              onMouseEnter={() => setHoveredMenu('roulette')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              Roulette Wheel
            </div>
          </Link>

          {/* Phase 1 */}
          <Link href="/phase-1">
            <div
              className={`cursor-pointer transition-all duration-300 px-10 py-3 border font-bold text-base rounded ${
                hoveredMenu === 'phase1'
                  ? 'border-cyan-300 text-cyan-100 shadow-lg shadow-cyan-500/50 bg-cyan-500/20'
                  : 'border-cyan-500/60 text-cyan-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30'
              }`}
              onMouseEnter={() => setHoveredMenu('phase1')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              Phase 1
            </div>
          </Link>

          {/* Phase 2 */}
          <Link href="/phase-2">
            <div
              className={`cursor-pointer transition-all duration-300 px-10 py-3 border font-bold text-base rounded ${
                hoveredMenu === 'phase2'
                  ? 'border-cyan-300 text-cyan-100 shadow-lg shadow-cyan-500/50 bg-cyan-500/20'
                  : 'border-cyan-500/60 text-cyan-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30'
              }`}
              onMouseEnter={() => setHoveredMenu('phase2')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              Phase 2
            </div>
          </Link>

          {/* Scores */}
          <Link href="/scores">
            <div
              className={`cursor-pointer transition-all duration-300 px-10 py-3 border font-bold text-base rounded ${
                hoveredMenu === 'scores'
                  ? 'border-cyan-300 text-cyan-100 shadow-lg shadow-cyan-500/50 bg-cyan-500/20'
                  : 'border-cyan-500/60 text-cyan-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30'
              }`}
              onMouseEnter={() => setHoveredMenu('scores')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              Scores
            </div>
          </Link>
        </div>
      </div>

      {/* 3D Grid Floor - Bottom */}
      <div className="relative z-10 h-12 bg-gradient-to-t from-cyan-500/20 via-transparent to-transparent overflow-hidden">
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
