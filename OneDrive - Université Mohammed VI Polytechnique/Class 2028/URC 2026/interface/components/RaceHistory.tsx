'use client';

import { useRaces } from '@/context/RacesContext';

interface TeamTimer {
  team: string;
  centiseconds?: number;
  finishedTime?: string;
  time?: number;
  finished: boolean;
}

interface Race {
  id: string;
  timestamp: number;
  participants: string[];
  timers: TeamTimer[];
  finished: boolean;
  phase: 'phase-1' | 'phase-2';
}

interface Props {
  phase: 'phase-1' | 'phase-2';
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR');
};

export default function RaceHistory({ phase }: Props) {
  const { getRacesByPhase } = useRaces();
  const races = getRacesByPhase(phase);

  if (races.length === 0) {
    return (
      <div className="text-cyan-400 text-center py-4 text-sm">
        No saved races yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
      {races.map((race) => (
        <div key={race.id} className="border border-cyan-400 bg-blue-950/30 p-2">
          <div className="flex justify-between items-start mb-1">
            <span className="text-cyan-300 font-bold text-xs">
              {formatDate(race.timestamp)}
            </span>
            <span className="text-cyan-400 text-xs">
              {race.participants.length} teams
            </span>
          </div>
          
          <div className="grid grid-cols-5 gap-1 text-xs">
            {race.timers.map((timer) => (
              <div
                key={timer.team}
                className={`text-center px-1 py-1 border ${
                  timer.finished
                    ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5'
                    : 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                }`}
              >
                <div className="font-mono text-xs font-bold">{timer.finishedTime || '00:00:00'}</div>
                <div className="text-xs truncate">{timer.team}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
