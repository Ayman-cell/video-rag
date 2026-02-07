'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface WheelHistory {
  id: string;
  date: string;
  order: string[];
}

interface TeamsContextType {
  teams: string[];
  teamsOrder: string[];
  wheelHistory: WheelHistory[];
  addTeam: (name: string) => void;
  removeTeam: (name: string) => void;
  setTeams: (teams: string[]) => void;
  setTeamsOrder: (order: string[]) => void;
  addToWheelHistory: (order: string[]) => void;
  removeFromWheelHistory: (id: string) => void;
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeamsState] = useState<string[]>([]);
  const [teamsOrder, setTeamsOrderState] = useState<string[]>([]);
  const [wheelHistory, setWheelHistoryState] = useState<WheelHistory[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load teams, order, and history from localStorage on mount
  useEffect(() => {
    const savedTeams = localStorage.getItem('urc-teams');
    const savedOrder = localStorage.getItem('urc-teams-order');
    const savedHistory = localStorage.getItem('urc-wheel-history');
    
    if (savedTeams) {
      try {
        setTeamsState(JSON.parse(savedTeams));
      } catch (e) {
        console.error('[v0] Error parsing teams from localStorage:', e);
      }
    }
    
    if (savedOrder) {
      try {
        setTeamsOrderState(JSON.parse(savedOrder));
      } catch (e) {
        console.error('[v0] Error parsing teams order from localStorage:', e);
      }
    }
    
    if (savedHistory) {
      try {
        setWheelHistoryState(JSON.parse(savedHistory));
      } catch (e) {
        console.error('[v0] Error parsing wheel history from localStorage:', e);
      }
    }
    
    setMounted(true);
  }, []);

  // Save teams to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('urc-teams', JSON.stringify(teams));
    }
  }, [teams, mounted]);

  // Save teams order to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('urc-teams-order', JSON.stringify(teamsOrder));
    }
  }, [teamsOrder, mounted]);

  // Save wheel history to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('urc-wheel-history', JSON.stringify(wheelHistory));
    }
  }, [wheelHistory, mounted]);

  const addTeam = (name: string) => {
    if (name.trim() && !teams.includes(name.trim())) {
      setTeamsState([...teams, name.trim()]);
    }
  };

  const removeTeam = (name: string) => {
    setTeamsState(teams.filter(team => team !== name));
  };

  const setTeams = (newTeams: string[]) => {
    setTeamsState(newTeams);
  };

  const setTeamsOrder = (order: string[]) => {
    setTeamsOrderState(order);
  };

  const addToWheelHistory = (order: string[]) => {
    const newEntry: WheelHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      order: order
    };
    setWheelHistoryState([...wheelHistory, newEntry]);
  };

  const removeFromWheelHistory = (id: string) => {
    setWheelHistoryState(wheelHistory.filter(entry => entry.id !== id));
  };

  return (
    <TeamsContext.Provider value={{ teams, teamsOrder, wheelHistory, addTeam, removeTeam, setTeams, setTeamsOrder, addToWheelHistory, removeFromWheelHistory }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error('useTeams must be used within TeamsProvider');
  }
  return context;
}
