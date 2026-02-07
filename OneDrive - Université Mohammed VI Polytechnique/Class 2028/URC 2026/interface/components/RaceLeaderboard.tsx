'use client';

import { useState } from 'react';
import { useRaces } from '@/context/RacesContext';
import GlobalLeaderboard from './GlobalLeaderboard';

interface TeamTimer {
  team: string;
  centiseconds: number;
  finishedTime: string;
  finished: boolean;
  penalty: number;
  distance?: number;
  barrierContactCount?: number;
  stopSignalViolationCount?: number;
  humanInterventionCount?: number;
}

interface Race {
  id: string;
  timestamp: number;
  participants: string[];
  timers: TeamTimer[];
  finished: boolean;
  phase?: 'phase-1' | 'phase-2';
}

interface Props {
  races: Race[];
  onClose: () => void;
  phase?: 'phase-1' | 'phase-2';
}

const formatTime = (centiseconds: number): string => {
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const centis = centiseconds % 100;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centis.toString().padStart(2, '0')}`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const calculatePhase1Score = (timer: TeamTimer): number => {
  let score = 0;

  // Distance points: 1 point per cm (0-200 cm)
  const distancePoints = timer.distance || 0;
  score += distancePoints;

  // Speed score: ONLY if team is finished AND time_seconds < 360
  let speedScore = 0;
  if (timer.finished && timer.centiseconds < 36000) { // 36000 centiseconds = 360 seconds
    const timeSeconds = timer.centiseconds / 100;
    speedScore = (360 - timeSeconds) * 0.5;
    score += speedScore;
  }

  // Penalties (cumulative, each type cumulates independently)
  const totalPenalties = 
    (timer.barrierContactCount || 0) * 20 +
    (timer.stopSignalViolationCount || 0) * 30 +
    (timer.humanInterventionCount || 0) * 50;
  score -= totalPenalties;

  return score; // Score can be negative based on penalties
};

const calculatePhase2Score = (timer: TeamTimer): number => {
  let score = 0;
  if ((timer as any).planInclineComplete) score += 150;
  if ((timer as any).distanceMeasureComplete) score += 150;
  if ((timer as any).stairsComplete) score += 150;
  score -= ((timer as any).interventionCount || 0) * 20;
  // Time bonus: (600 - time_seconds) * 0.5 only if finished before 10min
  if (timer.finished && timer.centiseconds < 60000) {
    const timeSeconds = timer.centiseconds / 100;
    score += (600 - timeSeconds) * 0.5;
  }
  return Math.max(0, score);
};

const calculateScore = (timer: TeamTimer, phase: string): number => {
  return phase === 'phase-2' ? calculatePhase2Score(timer) : calculatePhase1Score(timer);
};

export default function RaceLeaderboard({
  races,
  onClose,
  phase = 'phase-1'
}: Props) {
  const { deleteRace } = useRaces();
  const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);

  if (showGlobalLeaderboard) {
    return (
      <GlobalLeaderboard
        onClose={() => setShowGlobalLeaderboard(false)}
        phase={phase}
      />
    );
  }

  const getRanking = (race: Race) => {
    const finishedTimers = [...race.timers]
      .filter((t) => t.finished)
      .sort((a, b) => {
        const scoreA = calculateScore(a, phase || 'phase-1');
        const scoreB = calculateScore(b, phase || 'phase-1');
        return scoreB - scoreA;
      });
    
    const notFinished = [...race.timers]
      .filter((t) => !t.finished);
    
    return [...finishedTimers, ...notFinished];
  };

  const calculateFinalTime = (timer: TeamTimer) => {
    // Total time = actual time + penalty converted to centiseconds
    // penalty is negative (e.g., -5), so we add Math.abs(penalty) * 100
    const penaltyCentiseconds = Math.abs(timer.penalty) * 100;
    const totalCentiseconds = timer.centiseconds + penaltyCentiseconds;
    return totalCentiseconds;
  };

  const handleDeleteRace = (raceId: string) => {
    deleteRace(raceId);
  };

  return (
    <div className="h-full flex flex-col px-6 py-4 gap-4 overflow-hidden">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '1rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
          RACE LEADERBOARD
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setShowGlobalLeaderboard(true)}
            className="border-2 border-yellow-400 text-yellow-300 px-4 py-2 text-xs font-bold hover:bg-yellow-400 hover:text-blue-950 transition-colors"
          >
            GLOBAL
          </button>
          <button
            onClick={onClose}
            className="border-2 border-cyan-400 text-cyan-300 px-4 py-2 text-xs font-bold hover:bg-cyan-400 hover:text-blue-950 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
      {races.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-cyan-400 text-center">
            No races recorded yet.<br />
            <span className="text-xs text-cyan-600">Start a new race to see results here</span>
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {races.map((race) => {
            const ranking = getRanking(race);
            const isExpanded = expandedRaceId === race.id;

            return (
              <div key={race.id} className="border-2 border-cyan-400 bg-blue-950/40">
                {/* Race Header */}
                <button
                  onClick={() => setExpandedRaceId(isExpanded ? null : race.id)}
                  className="w-full text-left p-4 hover:bg-cyan-400/10 transition-colors flex justify-between items-center"
                >
                  <div>
                    <p className="text-cyan-300 font-bold">Race @ {formatDate(race.timestamp)}</p>
                    <p className="text-cyan-600 text-xs">
                      {race.timers.length} teams • {ranking.length} finished
                    </p>
                  </div>
                  <span className="text-cyan-300">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-cyan-400 p-4 bg-blue-950/60 space-y-3">
                    {/* Delete Button */}
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => handleDeleteRace(race.id)}
                        className="border-2 border-red-500 text-red-400 px-3 py-1 text-xs font-bold hover:bg-red-500 hover:text-blue-950 transition-colors"
                      >
                        DELETE RACE
                      </button>
                    </div>
                    {/* Rankings */}
                    <div>
                      <h4 className="text-cyan-400 text-xs font-bold mb-2">FINAL RANKING</h4>
                      <div className="space-y-2">
                        {ranking.length > 0 ? (
                          ranking.map((timer, idx) => {
                            const finishedCount = race.timers.filter((t) => t.finished).length;
                            const isNotFinished = !timer.finished;
                            const hasPenalty = timer.penalty < 0;
                            const finalTime = calculateFinalTime(timer);
                            
                            return (
                              <div
                                key={timer.team}
                                className={`border px-3 py-3 flex justify-between items-start flex-col gap-1 ${
                                  isNotFinished
                                    ? 'bg-red-500/10 border-red-500'
                                    : 'bg-blue-900/40 border-cyan-400'
                                }`}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <span className={`font-bold text-lg ${
                                    isNotFinished ? 'text-red-400' : 'text-yellow-400'
                                  }`}>
                                    #{isNotFinished ? '∞' : idx + 1}
                                  </span>
                                  <span className={isNotFinished ? 'text-red-300' : 'text-cyan-300'}>
                                    {timer.team}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 w-full justify-between ml-7">
                                  <div className="flex flex-col gap-1">
                                    <span className={`font-mono font-bold text-sm ${
                                      isNotFinished ? 'text-red-400' : 'text-cyan-300'
                                    }`}>
                                      {isNotFinished ? 'NOT FINISHED' : timer.finishedTime}
                                    </span>
                                    <span className="text-xs text-cyan-600">
                                      Distance: {timer.distance || 0} cm
                                    </span>
                                    {((timer.barrierContactCount || 0) > 0 || (timer.stopSignalViolationCount || 0) > 0 || (timer.humanInterventionCount || 0) > 0) && (
                                      <div className="text-xs text-orange-400 font-bold">
                                        {(timer.barrierContactCount || 0) > 0 ? `🚧 ×${timer.barrierContactCount} ` : ''}
                                        {(timer.stopSignalViolationCount || 0) > 0 ? `⛔ ×${timer.stopSignalViolationCount} ` : ''}
                                        {(timer.humanInterventionCount || 0) > 0 ? `🤚 ×${timer.humanInterventionCount}` : ''}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-yellow-300 font-mono font-bold text-lg">
                                      {calculateScore(timer, phase || 'phase-1').toFixed(1)}
                                    </span>
                                    <span className="text-xs text-yellow-600">pts</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-cyan-600 text-xs">No teams recorded this race</p>
                        )}
                      </div>
                    </div>

                    {/* All Participants */}
                    <div>
                      <h4 className="text-cyan-400 text-xs font-bold mb-2">ALL PARTICIPANTS</h4>
                      <div className="space-y-2">
                        {race.timers.map((timer, idx) => (
                          <div key={timer.team} className="text-cyan-600 text-xs border border-cyan-600/30 p-2 rounded">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-cyan-300">{idx + 1}. {timer.team}</span>
                              <span className={timer.finished ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                {timer.finished ? 'FINISHED' : 'DNF'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-cyan-600">Time:</span>
                                <div className="text-cyan-300 font-mono">
                                  {timer.finished ? timer.finishedTime : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-cyan-600">Distance:</span>
                                <div className="text-cyan-300 font-mono">
                                  {timer.distance > 0 ? `${timer.distance} cm` : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-cyan-600">Score:</span>
                                <div className="text-yellow-300 font-mono font-bold">
                                  {calculateScore(timer, phase || 'phase-1').toFixed(1)}
                                </div>
                              </div>
                            </div>
                            {timer.penalty < 0 && (
                              <div className="mt-1 text-orange-400 font-bold">
                                Penalties: {timer.penalty} pts
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
