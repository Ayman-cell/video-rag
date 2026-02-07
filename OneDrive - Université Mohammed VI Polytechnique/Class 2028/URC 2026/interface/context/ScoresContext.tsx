'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface TeamScore {
  name: string;
  score: number;
  position: number;
  totalPenalties: number;
  races: number;
}

interface ScoresContextType {
  teamScores: TeamScore[];
  setTeamScore: (teamName: string, score: number) => void;
  updateTeamScore: (teamName: string, score: number) => void;
  getTeamScore: (teamName: string) => number;
  addTeamPenalties: (teamName: string, penalties: number, raceCount: number) => void;
  getTeamPenalties: (teamName: string) => number;
  getRankedTeams: () => TeamScore[];
  resetScores: () => void;
}

const ScoresContext = createContext<ScoresContextType | undefined>(undefined);

export function ScoresProvider({ children }: { children: React.ReactNode }) {
  const [teamScores, setTeamScoresState] = useState<TeamScore[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load scores from localStorage on mount
  useEffect(() => {
    const savedScores = localStorage.getItem('urc-team-scores');
    if (savedScores) {
      try {
        setTeamScoresState(JSON.parse(savedScores));
      } catch (e) {
        console.error('[v0] Error parsing scores from localStorage:', e);
      }
    }
    setMounted(true);
  }, []);

  // Save scores to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('urc-team-scores', JSON.stringify(teamScores));
    }
  }, [teamScores, mounted]);

  const setTeamScore = (teamName: string, score: number) => {
    setTeamScoresState((prev) => {
      const existing = prev.find((ts) => ts.name === teamName);
      if (existing) {
        return prev.map((ts) =>
          ts.name === teamName ? { ...ts, score } : ts
        );
      }
      return [...prev, { name: teamName, score, position: 0, totalPenalties: 0, races: 0 }];
    });
  };

  const updateTeamScore = (teamName: string, score: number) => {
    setTeamScore(teamName, score);
  };

  const getTeamScore = (teamName: string): number => {
    const team = teamScores.find((ts) => ts.name === teamName);
    return team ? team.score : 0;
  };

  const addTeamPenalties = (teamName: string, penalties: number, raceCount: number) => {
    setTeamScoresState((prev) => {
      const existing = prev.find((ts) => ts.name === teamName);
      if (existing) {
        console.log('[v0] Adding penalties to', teamName, ':', penalties);
        return prev.map((ts) =>
          ts.name === teamName 
            ? { 
                ...ts, 
                totalPenalties: ts.totalPenalties + penalties,
                races: ts.races + raceCount
              } 
            : ts
        );
      }
      return [...prev, { 
        name: teamName, 
        score: 0, 
        position: 0, 
        totalPenalties: penalties,
        races: raceCount
      }];
    });
  };

  const getTeamPenalties = (teamName: string): number => {
    const team = teamScores.find((ts) => ts.name === teamName);
    return team ? team.totalPenalties : 0;
  };

  const getRankedTeams = (): TeamScore[] => {
    const ranked = [...teamScores].sort((a, b) => b.score - a.score);
    return ranked.map((team, idx) => ({
      ...team,
      position: idx + 1
    }));
  };

  const resetScores = () => {
    setTeamScoresState([]);
  };

  return (
    <ScoresContext.Provider
      value={{
        teamScores,
        setTeamScore,
        updateTeamScore,
        getTeamScore,
        addTeamPenalties,
        getTeamPenalties,
        getRankedTeams,
        resetScores
      }}
    >
      {children}
    </ScoresContext.Provider>
  );
}

export function useScores() {
  const context = useContext(ScoresContext);
  if (!context) {
    throw new Error('useScores must be used within ScoresProvider');
  }
  return context;
}
