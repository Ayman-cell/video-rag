'use client';

import { useTeams } from '@/context/TeamsContext';
import { useScores } from '@/context/ScoresContext';
import { useState } from 'react';
import { useRaces } from '@/context/RacesContext';

interface Props {
  onShowResults: () => void;
}

export default function ScoresInput({ onShowResults }: Props) {
  const { teams } = useTeams();
  const { getTeamScore, updateTeamScore, getRankedTeams, getTeamPenalties } = useScores();
  const { getRacesByPhase } = useRaces();
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});

  const rankedTeams = getRankedTeams();

  const handleScoreChange = (teamName: string, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [teamName]: value
    }));
  };

  const handleSaveScore = (teamName: string) => {
    const value = inputs[teamName] || '0';
    const score = parseInt(value, 10) || 0;
    updateTeamScore(teamName, score);
  };

  const handleSaveAll = () => {
    teams.forEach((team) => {
      const value = inputs[team] || getTeamScore(team).toString();
      const score = parseInt(value, 10) || 0;
      updateTeamScore(team, score);
    });
    setInputs({});
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      {/* Title */}
      <h1 className="text-white font-bold text-center" style={{ fontFamily: 'Press Start 2P', fontSize: '1.3rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
        SCORES
      </h1>

      {/* Main Container - Two Columns */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left: Scores Input Panel */}
        <div className="border-2 border-cyan-400 bg-blue-950/40 p-3 flex-1 flex flex-col min-h-0">
          <h2 className="text-cyan-400 font-bold text-xs mb-2">ENTER TEAM SCORES</h2>
          <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto pr-1">
            {teams.length === 0 ? (
              <p className="text-cyan-600 text-xs text-center">No teams added</p>
            ) : (
              teams.map((team) => (
                <div key={team} className="flex gap-1 items-center text-xs">
                  <div className="flex-1 text-cyan-300 font-mono truncate">{team}</div>
                  <input
                    type="number"
                    value={inputs[team] ?? getTeamScore(team)}
                    onChange={(e) => handleScoreChange(team, e.target.value)}
                    className="w-16 bg-blue-900 border border-cyan-400 px-1 py-0.5 text-cyan-300 text-xs font-mono focus:outline-none focus:border-cyan-300"
                    min="0"
                  />
                  <button
                    onClick={() => handleSaveScore(team)}
                    className="border border-cyan-400 px-2 py-0.5 text-cyan-300 text-xs hover:bg-cyan-400 hover:text-blue-950 transition-colors font-bold whitespace-nowrap"
                  >
                    SAVE
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Save All Button */}
          <button
            onClick={handleSaveAll}
            disabled={teams.length === 0}
            className="border-2 border-cyan-400 bg-transparent px-3 py-1 text-cyan-300 text-xs font-bold mt-2 hover:bg-cyan-400 hover:text-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SAVE ALL
          </button>
        </div>

        {/* Right: Ranking Display + Buttons */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {/* Ranking Display */}
          <div className="border-2 border-cyan-400 bg-blue-950/40 p-3 flex-1 flex flex-col min-h-0">
            <h2 className="text-cyan-400 font-bold text-xs mb-2">CURRENT RANKING</h2>
            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {rankedTeams.length === 0 ? (
                <p className="text-cyan-600 text-xs text-center">No scores yet</p>
              ) : (
                rankedTeams.map((team, idx) => {
                  const penalties = getTeamPenalties(team.name);
                  const hasPenalties = penalties < 0;
                  
                  return (
                    <div
                      key={team.name}
                      className={`flex justify-between items-center px-2 py-1 border text-xs flex-col gap-1 ${
                        idx === 0
                          ? 'border-yellow-400 bg-yellow-400/10'
                          : idx === 1
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : idx === 2
                              ? 'border-orange-400 bg-orange-400/10'
                              : 'border-cyan-600 bg-blue-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-1 w-full justify-between">
                        <span className={`font-bold ${
                          idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-cyan-300' : idx === 2 ? 'text-orange-400' : 'text-cyan-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="text-cyan-300 font-mono truncate">{team.name}</span>
                        <span className={`font-bold font-mono ${
                          idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-cyan-300' : idx === 2 ? 'text-orange-400' : 'text-cyan-400'
                        }`}>
                          {team.score}
                        </span>
                      </div>
                      
                      {hasPenalties && (
                        <div className="w-full bg-orange-500/20 px-1 py-0.5 rounded">
                          <span className="text-orange-400 text-xs font-bold">
                            Penalties: {penalties} pts
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Results Button */}
          <button
            onClick={onShowResults}
            disabled={rankedTeams.length === 0}
            className="border-2 border-cyan-400 bg-transparent px-4 py-1 text-cyan-300 font-bold text-xs hover:bg-cyan-400 hover:text-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            DISPLAY RESULTS
          </button>
        </div>
      </div>
    </div>
  );
}
