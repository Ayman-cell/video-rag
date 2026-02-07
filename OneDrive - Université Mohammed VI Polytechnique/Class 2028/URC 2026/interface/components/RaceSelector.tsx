'use client';

import { useState } from 'react';
import { useRaces } from '@/context/RacesContext';

interface Props {
  teams: string[];
  onCreateRace: (selectedTeams: string[]) => void;
  phase: 'phase-1' | 'phase-2';
}

export default function RaceSelector({ teams, onCreateRace, phase }: Props) {
  const { getRacesByPhase } = useRaces();
  const [selected, setSelected] = useState<string[]>([]);
  
  // Get teams that have already raced in this phase
  const racedTeams = getRacesByPhase(phase).flatMap((race) =>
    race.timers.map((timer) => timer.team)
  );
  
  // Filter teams to show only those that haven't raced yet in this phase
  const availableTeams = teams.filter((team) => !racedTeams.includes(team));

  const toggleTeam = (team: string) => {
    setSelected((prev) => {
      // Only toggle if team is already selected OR if we haven't reached max (5 teams)
      if (prev.includes(team)) {
        return prev.filter((t) => t !== team);
      } else if (prev.length < 5) {
        return [...prev, team];
      }
      return prev;
    });
  };

  const handleStartRace = () => {
    // Validate: min 1 team, max 5 teams
    if (selected.length === 0) {
      alert('Minimum 1 team required');
      return;
    }
    if (selected.length > 5) {
      alert('Maximum 5 teams allowed');
      return;
    }
    onCreateRace(selected);
  };

  return (
    <div className="h-full flex items-center justify-center px-6 py-4">
      <div className="border-2 border-cyan-400 bg-blue-950/40 p-8 max-w-2xl w-full">
        <h2 className="text-white font-bold mb-6 text-center" style={{ fontFamily: 'Press Start 2P', fontSize: '1.2rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
          CREATE RACE
        </h2>

        <p className="text-cyan-300 text-sm mb-6 text-center">
          Select up to 5 teams to participate in {phase.replace('-', ' ').toUpperCase()}
        </p>

        {availableTeams.length === 0 ? (
          <div className="text-cyan-400 text-center py-8">
            <p>{teams.length === 0 ? 'No teams available. Add teams from the home page first.' : `All teams have already participated in ${phase.replace('-', ' ').toUpperCase()}. Each team can only race once per phase.`}</p>
          </div>
        ) : (
          <>
            {racedTeams.length > 0 && (
              <div className="bg-orange-500/20 border border-orange-500 p-3 mb-4 rounded text-xs text-orange-400 text-center">
                {racedTeams.length} team(s) have already raced in this phase
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {availableTeams.map((team) => (
                <button
                  key={team}
                  onClick={() => toggleTeam(team)}
                  className={`p-4 border-2 font-bold transition-all ${
                    selected.includes(team)
                      ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-lg shadow-cyan-400/50'
                      : 'border-cyan-400 bg-blue-950/40 text-cyan-300 hover:border-cyan-300'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleStartRace}
                disabled={selected.length === 0}
                className={`px-8 py-3 font-bold border-2 transition-colors ${
                  selected.length === 0
                    ? 'border-cyan-700 text-cyan-700 cursor-not-allowed'
                    : 'border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950'
                }`}
              >
                START RACE
              </button>
            </div>

            <p className="text-cyan-600 text-xs text-center mt-4">
              {selected.length}/5 teams selected
            </p>
          </>
        )}
      </div>
    </div>
  );
}
