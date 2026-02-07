'use client';

import { useRaces } from '@/context/RacesContext';
import { useTeams } from '@/context/TeamsContext';

interface TeamTimer {
  team: string;
  centiseconds: number;
  finishedTime: string;
  finished: boolean;
  penalty: number;
  distance: number;
  barrierContactCount: number;
  stopSignalViolationCount: number;
  humanInterventionCount: number;
  // Phase 2 fields
  planInclineComplete?: boolean;
  distanceMeasureComplete?: boolean;
  stairsComplete?: boolean;
  interventionCount?: number;
  distanceCm?: number;
}

const formatTime = (centiseconds: number): string => {
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const centis = centiseconds % 100;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centis.toString().padStart(2, '0')}`;
};

// Phase 1: distance + speed_bonus - penalties
const calculatePhase1Score = (timer: TeamTimer): number => {
  let score = 0;
  const distancePoints = timer.distance || 0;
  score += distancePoints;
  if (timer.finished && timer.centiseconds < 36000) {
    const timeSeconds = timer.centiseconds / 100;
    score += (360 - timeSeconds) * 0.5;
  }
  const totalPenalties =
    (timer.barrierContactCount || 0) * 20 +
    (timer.stopSignalViolationCount || 0) * 30 +
    (timer.humanInterventionCount || 0) * 50;
  score -= totalPenalties;
  return score;
};

// Phase 2: challenges + time_bonus - interventions
const calculatePhase2Score = (timer: TeamTimer): number => {
  let score = 0;
  if (timer.planInclineComplete) score += 150;
  if (timer.distanceMeasureComplete) score += 150;
  if (timer.stairsComplete) score += 150;
  score -= (timer.interventionCount || 0) * 20;
  // Time bonus: (600 - time_seconds) * 0.5 only if finished before 10min
  if (timer.finished && timer.centiseconds < 60000) {
    const timeSeconds = timer.centiseconds / 100;
    score += (600 - timeSeconds) * 0.5;
  }
  return Math.max(0, score);
};

interface Props {
  onClose: () => void;
  phase: 'phase-1' | 'phase-2';
}

export default function GlobalLeaderboard({ onClose, phase }: Props) {
  const { getRacesByPhase } = useRaces();
  const { teams } = useTeams();
  const races = getRacesByPhase(phase);
  const isPhase2 = phase === 'phase-2';

  interface LeaderboardRow {
    team: string;
    time: number;
    timeFormatted: string;
    finished: boolean;
    score: number;
    distance: number;
    totalPenalties: number;
    // Phase 2 specifics
    planIncline: boolean;
    distanceMeasure: boolean;
    stairs: boolean;
    interventions: number;
    distanceCm: number;
  }

  const rows: LeaderboardRow[] = [];

  races.forEach((race) => {
    race.timers.forEach((timer) => {
      const score = isPhase2 ? calculatePhase2Score(timer) : calculatePhase1Score(timer);
      const penaltyTotal = isPhase2
        ? (timer.interventionCount || 0) * 20
        : (timer.barrierContactCount || 0) * 20 +
          (timer.stopSignalViolationCount || 0) * 30 +
          (timer.humanInterventionCount || 0) * 50;

      rows.push({
        team: timer.team,
        time: timer.centiseconds,
        timeFormatted: formatTime(timer.centiseconds),
        finished: timer.finished,
        score,
        distance: timer.distance || 0,
        totalPenalties: penaltyTotal,
        planIncline: timer.planInclineComplete || false,
        distanceMeasure: timer.distanceMeasureComplete || false,
        stairs: timer.stairsComplete || false,
        interventions: timer.interventionCount || 0,
        distanceCm: timer.distanceCm || 0,
      });
    });
  });

  // Add teams that haven't raced
  teams.forEach((team) => {
    if (!rows.some((r) => r.team === team)) {
      rows.push({
        team,
        time: 0,
        timeFormatted: '00:00:00',
        finished: false,
        score: 0,
        distance: 0,
        totalPenalties: 0,
        planIncline: false,
        distanceMeasure: false,
        stairs: false,
        interventions: 0,
        distanceCm: 0,
      });
    }
  });

  // Sort by score descending
  const raced = rows.filter((r) => r.time > 0 || r.score > 0);
  const notRaced = rows.filter((r) => r.time === 0 && r.score === 0);
  raced.sort((a, b) => b.score - a.score);

  const rankings = [...raced, ...notRaced];

  return (
    <div className="h-full flex flex-col px-6 py-4 gap-4 overflow-hidden">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '1rem', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
          GLOBAL LEADERBOARD - {phase.replace('-', ' ').toUpperCase()}
        </h2>
        <button
          onClick={onClose}
          className="border-2 border-cyan-400 text-cyan-300 px-4 py-2 text-xs font-bold hover:bg-cyan-400 hover:text-blue-950 transition-colors"
        >
          CLOSE
        </button>
      </div>

      {rankings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-cyan-400 text-center">No teams available.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {/* Header */}
            <div className={`border-2 border-cyan-400 bg-blue-950/60 p-3 grid ${isPhase2 ? 'grid-cols-8' : 'grid-cols-7'} gap-2 sticky top-0`}>
              <div className="col-span-2">
                <span className="text-cyan-400 text-xs font-bold">TEAM</span>
              </div>
              <div className="text-center">
                <span className="text-cyan-400 text-xs font-bold">TIME</span>
              </div>
              {isPhase2 ? (
                <>
                  <div className="text-center">
                    <span className="text-green-400 text-xs font-bold">CHALLENGES</span>
                  </div>
                  <div className="text-center">
                    <span className="text-orange-400 text-xs font-bold">INTERV.</span>
                  </div>
                  <div className="text-center">
                    <span className="text-green-400 text-xs font-bold">DIST. (cm)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <span className="text-cyan-400 text-xs font-bold">RACES</span>
                  </div>
                  <div className="text-center">
                    <span className="text-green-400 text-xs font-bold">DIST. (cm)</span>
                  </div>
                </>
              )}
              <div className="text-center">
                <span className="text-yellow-400 text-xs font-bold">SCORE</span>
              </div>
              <div className="text-center">
                <span className="text-orange-400 text-xs font-bold">PENALTY</span>
              </div>
            </div>

            {/* Rows */}
            {rankings.map((result, idx) => {
              const hasRaced = result.time > 0 || result.score > 0;
              const isTop = hasRaced && idx === 0;
              const isSecond = hasRaced && idx === 1;

              return (
                <div
                  key={result.team}
                  className={`border-2 p-3 grid ${isPhase2 ? 'grid-cols-8' : 'grid-cols-7'} gap-2 items-center transition-colors ${
                    !hasRaced
                      ? 'border-gray-600 bg-gray-900/40 opacity-50'
                      : isTop
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : isSecond
                          ? 'border-cyan-400 bg-blue-950/40'
                          : 'border-cyan-600 bg-blue-900/40'
                  }`}
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <span className={`font-bold text-lg ${
                      !hasRaced ? 'text-gray-500' : isTop ? 'text-yellow-400' : 'text-cyan-400'
                    }`}>
                      {hasRaced ? `#${idx + 1}` : '--'}
                    </span>
                    <span className={`font-bold ${
                      !hasRaced ? 'text-gray-500' : isTop ? 'text-yellow-300' : 'text-cyan-300'
                    }`}>
                      {result.team}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className={`font-mono font-bold text-xs ${
                      !hasRaced ? 'text-gray-500' : result.finished ? 'text-cyan-300' : 'text-red-400'
                    }`}>
                      {!hasRaced ? '--:--' : result.finished ? result.timeFormatted : `${result.timeFormatted} (DNF)`}
                    </span>
                  </div>

                  {isPhase2 ? (
                    <>
                      <div className="text-center">
                        <span className="text-green-400 text-xs font-bold">
                          {result.planIncline ? 'PI ' : ''}
                          {result.distanceMeasure ? 'DM ' : ''}
                          {result.stairs ? 'ST' : ''}
                          {!result.planIncline && !result.distanceMeasure && !result.stairs ? '--' : ''}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={`font-bold text-sm ${result.interventions > 0 ? 'text-orange-400' : 'text-cyan-600'}`}>
                          {result.interventions > 0 ? `x${result.interventions}` : '0'}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={`font-bold text-sm ${result.distanceCm > 0 ? 'text-green-400' : 'text-cyan-600'}`}>
                          {result.distanceCm > 0 ? `${result.distanceCm}` : '0'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <span className="text-cyan-400 font-bold text-sm">
                          {hasRaced ? '1' : '0'}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={`font-bold text-sm ${result.distance > 0 ? 'text-green-400' : 'text-cyan-600'}`}>
                          {result.distance > 0 ? `${result.distance}` : '0'}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="text-center">
                    <span className="text-yellow-300 font-mono font-bold text-sm">
                      {result.score.toFixed(1)}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className={`font-bold text-sm ${result.totalPenalties > 0 ? 'text-orange-400' : 'text-cyan-600'}`}>
                      {result.totalPenalties > 0 ? `-${result.totalPenalties}` : '0'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
