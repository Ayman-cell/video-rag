'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTeams } from '@/context/TeamsContext';

const RouletteWheel = dynamic(() => import('@/components/RouletteWheel'), {
  ssr: false,
  loading: () => <div className="w-80 h-80 border-4 border-cyan-400 flex items-center justify-center text-cyan-300">Loading...</div>
});

export default function Roulette() {
  const { teams: allTeams, addToWheelHistory } = useTeams();
  const [spinningTeams, setSpinningTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [showingResult, setShowingResult] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initialize spinningTeams on first render
  useEffect(() => {
    if (spinningTeams.length === 0 && results.length === 0 && allTeams.length > 0) {
      setSpinningTeams([...allTeams]);
    }
  }, [allTeams, spinningTeams.length, results.length]);

  const handleSpin = () => {
    if (spinningTeams.length === 0) return;
    setIsSpinning(true);
    setShowingResult(false);
  };

  const handleTeamSelected = (team: string) => {
    setSelectedTeam(team);
    setShowingResult(true);
    setIsSpinning(false);

    // Remove team from wheel and add to results
    const newSpinningTeams = spinningTeams.filter((t) => t !== team);
    const newResults = [...results, team];
    
    setSpinningTeams(newSpinningTeams);
    setResults(newResults);

    // Auto-add last team if only one remains
    if (newSpinningTeams.length === 1) {
      setTimeout(() => {
        setResults([...newResults, newSpinningTeams[0]]);
        setSpinningTeams([]);
      }, 1000);
    }
  };

  const handleReset = () => {
    setSpinningTeams([]);
    setSelectedTeam(null);
    setResults([]);
    setShowingResult(false);
  };

  const handleSave = () => {
    if (results.length === allTeams.length && results.length > 0) {
      addToWheelHistory(results);
      setSaveMessage('Wheel saved to history!');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const teamsForWheel = useMemo(() => spinningTeams, [spinningTeams]);

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
        <h1 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '1rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
          ROULETTE WHEEL
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

          {/* Home Button */}
          <div className="ml-4">
            <Link href="/">
              <div className="border border-cyan-500/60 px-4 py-1 text-cyan-300 font-bold text-xs cursor-pointer hover:bg-cyan-500/30 hover:border-cyan-400 transition-all duration-200 whitespace-nowrap rounded">
                HOME
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative z-20 px-6 py-2 gap-6 overflow-hidden">
        {/* Left: Roulette Wheel */}
        <div className="flex flex-col items-center gap-3">
          <RouletteWheel teams={spinningTeams} onSelect={handleTeamSelected} mustSpin={isSpinning} />
          
          {/* Controls Below Wheel */}
          <div className="flex gap-3">
            <button
              onClick={handleSpin}
              disabled={isSpinning || spinningTeams.length === 0}
              className={`border-2 px-6 py-2 font-bold text-sm transition-colors ${
                isSpinning || spinningTeams.length === 0
                  ? 'border-cyan-700 text-cyan-700 cursor-not-allowed'
                  : 'border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950'
              }`}
            >
              SPIN
            </button>
            {results.length > 0 && (
              <button
                onClick={handleReset}
                className="border-2 border-cyan-400 px-6 py-2 text-cyan-300 font-bold hover:bg-cyan-400 hover:text-blue-950 transition-colors text-sm"
              >
                RESET
              </button>
            )}
            {results.length === allTeams.length && results.length > 0 && (
              <button
                onClick={handleSave}
                className="border-2 border-green-400 px-6 py-2 text-green-300 font-bold hover:bg-green-400 hover:text-blue-950 transition-colors text-sm"
              >
                SAVE
              </button>
            )}
          </div>
        </div>

        {/* Right: Results Display */}
        <div className="border-2 border-cyan-400 p-4 bg-blue-950/40 flex flex-col gap-3 overflow-hidden">
          {/* Save Message */}
          {saveMessage && (
            <div className="border-2 border-green-400 bg-green-400/10 p-3 text-center animate-pulse">
              <p className="text-green-300 font-bold text-sm">{saveMessage}</p>
            </div>
          )}
          
          {/* Current Selection */}
          {showingResult && selectedTeam && (
            <div className="border-2 border-yellow-400 bg-yellow-400/10 p-3 text-center">
              <p className="text-yellow-300 text-xs font-bold mb-1">SELECTED</p>
              <p className="text-white font-bold text-lg">{selectedTeam}</p>
            </div>
          )}
          
          {/* Results List */}
          <div className="flex flex-col gap-2">
            <h3 className="text-cyan-300 font-bold text-xs" style={{ fontFamily: 'Press Start 2P', fontSize: '0.5rem' }}>
              DRAW ORDER
            </h3>
            <div className="space-y-1">
              {results.length > 0 ? (
                results.map((team, idx) => (
                  <div key={idx} className="bg-cyan-400/20 border border-cyan-400 px-3 py-1">
                    <p className="text-cyan-300 text-sm font-bold">
                      {idx + 1}. {team}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-cyan-600 text-xs">No draws yet</p>
              )}
            </div>
          </div>
          
          {/* Stats */}
          {allTeams.length > 0 && (
            <p className="text-cyan-600 text-xs text-center pt-2 border-t border-cyan-600">
              {results.length}/{allTeams.length} drawn
            </p>
          )}
        </div>
      </div>

      {/* 3D Grid Floor - Bottom */}
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
