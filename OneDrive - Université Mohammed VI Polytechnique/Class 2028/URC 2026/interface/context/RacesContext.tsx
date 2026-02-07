'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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
  // Phase 2 specific fields
  planInclineComplete?: boolean;
  distanceMeasureComplete?: boolean;
  stairsComplete?: boolean;
  interventionCount?: number;
  distanceCm?: number; // distance parcourue en cm pour Phase 2
}

interface Race {
  id: string;
  timestamp: number;
  participants: string[];
  timers: TeamTimer[];
  finished: boolean;
  phase: 'phase-1' | 'phase-2';
}

interface RacesContextType {
  races: Race[];
  addRace: (race: Race) => void;
  deleteRace: (raceId: string) => void;
  getRacesByPhase: (phase: 'phase-1' | 'phase-2') => Race[];
  clearRacesByPhase: (phase: 'phase-1' | 'phase-2') => void;
}

const RacesContext = createContext<RacesContextType | undefined>(undefined);

export function RacesProvider({ children }: { children: React.ReactNode }) {
  const [races, setRacesState] = useState<Race[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load races from localStorage on mount
  useEffect(() => {
    const savedRaces = localStorage.getItem('urc-races');
    if (savedRaces) {
      try {
        setRacesState(JSON.parse(savedRaces));
      } catch (e) {
        console.error('[v0] Error parsing races from localStorage:', e);
      }
    }
    setMounted(true);
  }, []);

  // Save races to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('urc-races', JSON.stringify(races));
    }
  }, [races, mounted]);

  const addRace = (race: Race) => {
    setRacesState((prev) => [...prev, race]);
  };

  const deleteRace = (raceId: string) => {
    setRacesState((prev) => prev.filter((race) => race.id !== raceId));
  };

  const getRacesByPhase = (phase: 'phase-1' | 'phase-2') => {
    return races.filter((race) => race.phase === phase);
  };

  const clearRacesByPhase = (phase: 'phase-1' | 'phase-2') => {
    setRacesState((prev) => prev.filter((race) => race.phase !== phase));
  };

  return (
    <RacesContext.Provider value={{ races, addRace, deleteRace, getRacesByPhase, clearRacesByPhase }}>
      {children}
    </RacesContext.Provider>
  );
}

export function useRaces() {
  const context = useContext(RacesContext);
  if (!context) {
    throw new Error('useRaces must be used within RacesProvider');
  }
  return context;
}
