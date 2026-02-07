'use client';

import React from "react"

import { useState, useEffect, useRef } from 'react';
import RaceLeaderboard from './RaceLeaderboard';
import RaceHistory from './RaceHistory';
import { useRaces } from '@/context/RacesContext';
import { useTeams } from '@/context/TeamsContext';
import { useScores } from '@/context/ScoresContext';

interface TeamTimer {
  team: string;
  centiseconds: number; // internal counter for timing
  finishedTime: string; // formatted MM:SS:CC stored time
  finished: boolean;
  penalty: number; // penalty points (negative values)
  distance: number; // distance covered in cm
  barrierContactCount: number; // cumulative count for barrier contact
  stopSignalViolationCount: number; // cumulative count for stop signal
  humanInterventionCount: number; // cumulative count for human intervention
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
  teams: string[];
  showLeaderboard: boolean;
  setShowLeaderboard: (show: boolean) => void;
  phase: 'phase-1' | 'phase-2';
}

interface WheelSelection {
  id: string;
  date: string;
  order: string[];
}

const formatTime = (centiseconds: number): string => {
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const centis = centiseconds % 100;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centis.toString().padStart(2, '0')}`;
};

export default function RaceManager({ teams, showLeaderboard, setShowLeaderboard, phase }: Props) {
  const { races: savedRaces, addRace, getRacesByPhase } = useRaces();
  const { wheelHistory } = useTeams();
  const { addTeamPenalties } = useScores();
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [raceStarted, setRaceStarted] = useState(false);
  const [showWheelSelector, setShowWheelSelector] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedWheel, setSelectedWheel] = useState<WheelSelection | null>(null);
  const [orderedTeams, setOrderedTeams] = useState<string[]>(teams);
  const [cameraError, setCameraError] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const [races, setRaces] = useState<Race[]>(savedRaces);
  const [timeRemaining, setTimeRemaining] = useState(6000); // 1 minute in centiseconds (60 seconds * 100)
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [finishMessage, setFinishMessage] = useState<string | null>(null);
  const [penaltyFeedback, setPenaltyFeedback] = useState<{ team: string; type: string; timestamp: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const MAX_RACE_TIME = 36000; // 6 minutes in centiseconds (360 seconds * 100)

  // Phase 1 Scoring System (matches Ayman's exact requirements)
  const calculatePhase1Score = (timer: TeamTimer): number => {
    let score = 0;

    // Distance points: 1 point per cm (0-200 cm max)
    const distancePoints = timer.distance;
    score += distancePoints;

    // Speed score: ONLY if team is finished AND time_seconds < 360
    let speedScore = 0;
    if (timer.finished && timer.centiseconds < 36000) { // 36000 centiseconds = 360 seconds (6 minutes)
      const timeSeconds = timer.centiseconds / 100;
      speedScore = (360 - timeSeconds) * 0.5;
      score += speedScore;
    }
    // If time expired (centiseconds >= 36000 or not finished): speedScore = 0
    // Formula: score_vitesse = 6min(360s) - 6min(360s) = 0

    // Penalties (cumulative, each type cumulates independently)
    const totalPenalties = 
      (timer.barrierContactCount * 20) +
      (timer.stopSignalViolationCount * 30) +
      (timer.humanInterventionCount * 50);
    score -= totalPenalties;

    return score; // Score can be negative based on penalties
  };

  // Auto-increment timers and check max time
  useEffect(() => {
    if (!raceStarted || !currentRace) return;

    const interval = setInterval(() => {
      setCurrentRace((prev) => {
        if (!prev || prev.finished) return prev;

        const updatedRace = {
          ...prev,
          timers: prev.timers.map((t) => {
            if (t.finished) return t;
            const newCentiseconds = t.centiseconds + 1;
            return {
              ...t,
              centiseconds: newCentiseconds,
              finishedTime: formatTime(newCentiseconds)
            };
          })
        };

        // Check if any timer has reached max time (60 seconds = 6000 centiseconds)
        const hasTimerExpired = updatedRace.timers.some((t) => t.centiseconds >= MAX_RACE_TIME && !t.finished);
        
        if (hasTimerExpired) {
          // Auto-stop the race but keep the finished status of each team as is
          const finishedRace = {
            ...updatedRace,
            finished: true
          };
          
          // Auto-save the race
          setRaceStarted(false);
          setCurrentRace(null);
          setTimeRemaining(MAX_RACE_TIME);
          addRace({ ...finishedRace, phase });
          
          return finishedRace;
        }

        return updatedRace;
      });

      // Update countdown timer
      setTimeRemaining((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 7.5); // Update every 7.5ms for real-time precision (10ms fraction with 7.5ms UI delay)

    return () => clearInterval(interval);
  }, [raceStarted, currentRace]);

  // Enumerate cameras when race is created
  useEffect(() => {
    if (!currentRace) return;

    const enumerateCameras = async () => {
      try {
        // Request permission first so labels are populated
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        console.log('[v0] Phase1 - Detected cameras:', videoDevices.map((d, i) => `${i}: "${d.label}" (${d.deviceId.slice(0, 12)}...)`));
        setAvailableCameras(videoDevices);

        if (videoDevices.length > 0) {
          // Pick the LAST camera in the list - USB cameras are usually appended at the end
          const preferredId = videoDevices[videoDevices.length - 1].deviceId;
          console.log('[v0] Phase1 - Selecting camera:', videoDevices[videoDevices.length - 1].label);
          setSelectedCameraId(preferredId);
        }
      } catch (err) {
        console.error('[v0] Phase1 - Camera enumeration error:', err);
        setCameraError(true);
      }
    };

    enumerateCameras();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [currentRace]);

  // Start the selected camera - use exact constraint and verify track
  useEffect(() => {
    if (!currentRace || !selectedCameraId) return;

    const startCameraById = async () => {
      setCameraError(false);
      let stream: MediaStream | null = null;

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Strategy 1: Use EXACT deviceId (forces the specific camera)
        if (selectedCameraId) {
          try {
            console.log('[v0] Phase1 - Trying EXACT deviceId:', selectedCameraId.slice(0, 12));
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: selectedCameraId } },
              audio: false,
            });
            const activeTrack = stream.getVideoTracks()[0];
            console.log('[v0] Phase1 - Got stream, track label:', activeTrack?.label, 'settings deviceId:', activeTrack?.getSettings()?.deviceId?.slice(0, 12));
          } catch (e) {
            console.log('[v0] Phase1 - Exact deviceId failed:', (e as Error).message);
            stream = null;
          }
        }

        // Strategy 2: Try with bare deviceId and verify
        if (!stream && selectedCameraId && availableCameras.length > 0) {
          const targetCam = availableCameras.find((c) => c.deviceId === selectedCameraId);
          if (targetCam) {
            try {
              console.log('[v0] Phase1 - Trying bare deviceId for:', targetCam.label);
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: selectedCameraId },
                audio: false,
              });
              const activeTrack = stream.getVideoTracks()[0];
              if (activeTrack && activeTrack.getSettings().deviceId !== selectedCameraId) {
                console.log('[v0] Phase1 - Got wrong camera:', activeTrack.label, '- stopping');
                stream.getTracks().forEach((t) => t.stop());
                stream = null;
              }
            } catch (e) {
              console.log('[v0] Phase1 - Bare deviceId also failed');
              stream = null;
            }
          }
        }

        // Strategy 3: Fallback to any available camera
        if (!stream) {
          console.log('[v0] Phase1 - Falling back to any available camera');
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraError(false);
          const activeTrack = stream.getVideoTracks()[0];
          console.log('[v0] Phase1 - Camera NOW active:', activeTrack?.label, '| deviceId:', activeTrack?.getSettings()?.deviceId?.slice(0, 12));
        }
      } catch (err) {
        console.error('[v0] Phase1 - All camera strategies failed:', err);
        setCameraError(true);
      }
    };

    startCameraById();
  }, [currentRace, selectedCameraId, availableCameras]);

  const handleWheelSelected = (wheel: WheelSelection) => {
    console.log('[v0] Wheel selected:', wheel);
    setSelectedWheel(wheel);
    
    // Get teams that have already raced in this phase
    const racedTeams = getRacesByPhase(phase).flatMap((race) =>
      race.timers.map((timer) => timer.team)
    );
    
    // Filter teams to only those in the wheel that haven't raced, maintaining the wheel order
    const wheelTeams = wheel.order.filter(t => teams.includes(t) && !racedTeams.includes(t));
    console.log('[v0] Ordered teams from wheel (excluding those already raced):', wheelTeams);
    console.log('[v0] Teams already raced in this phase:', racedTeams);
    
    if (wheelTeams.length === 0) {
      alert(`All teams in this wheel have already participated in ${phase.replace('-', ' ').toUpperCase()}. Each team can only race once per phase.`);
      return;
    }
    
    setOrderedTeams(wheelTeams);
    setShowWheelSelector(false);
    setShowSelector(true);
  };

  const handleNoWheel = () => {
    console.log('[v0] Using all teams without wheel order');
    setSelectedWheel(null);
    
    // Get teams that have already raced in this phase
    const racedTeams = getRacesByPhase(phase).flatMap((race) =>
      race.timers.map((timer) => timer.team)
    );
    
    // Filter out teams that have already raced
    const availableTeams = teams.filter(t => !racedTeams.includes(t));
    console.log('[v0] Available teams (excluding those already raced):', availableTeams);
    
    if (availableTeams.length === 0) {
      alert(`All teams have already participated in ${phase.replace('-', ' ').toUpperCase()}. Each team can only race once per phase.`);
      return;
    }
    
    setOrderedTeams(availableTeams);
    setShowWheelSelector(false);
    setShowSelector(true);
  };

  const toggleTeam = (team: string) => {
    setSelected((prev) => {
      if (prev.includes(team)) {
        return prev.filter((t) => t !== team);
      } else if (prev.length < 5) {
        return [...prev, team];
      }
      return prev;
    });
  };

  const handleStartRace = () => {
    if (selected.length === 0) {
      alert('Minimum 1 team required');
      return;
    }
    if (selected.length > 5) {
      alert('Maximum 5 teams allowed');
      return;
    }

    // Check if any team has already participated in a race
    const participatedTeams = selected.filter((team) => {
      return savedRaces.some((race) => 
        race.participants.includes(team) && race.phase === phase
      );
    });

    if (participatedTeams.length > 0) {
      alert(`Team(s) already participated in ${phase}: ${participatedTeams.join(', ')}`);
      return;
    }

    console.log('[v0] Starting race with selected teams:', selected);
    console.log('[v0] Selected wheel:', selectedWheel);

    const newRace: Race = {
      id: `race-${Date.now()}`,
      timestamp: Date.now(),
      participants: selected,
      timers: selected.map((team) => ({
        team,
        centiseconds: 0,
        finishedTime: '00:00:00',
        finished: false,
        penalty: 0,
        distance: 0,
        barrierContactCount: 0,
        stopSignalViolationCount: 0,
        humanInterventionCount: 0
      })),
      finished: false
    };

    setCurrentRace(newRace);
    setSelected([]);
    setShowSelector(false);
    setRaceStarted(false);
  };

  const handleBeginRace = () => {
    setRaceStarted(true);
    setTimeRemaining(MAX_RACE_TIME);
  };

  // Check if all distances are entered and valid
  const allDistancesEntered = (): boolean => {
    if (!currentRace) return false;
    return currentRace.timers.every((timer) => {
      const distance = timer.distance;
      return (
        distance !== undefined && 
        distance !== null && 
        !isNaN(distance) && 
        distance >= 0 && 
        distance <= 200
      );
    });
  };

  const handleFinishRace = () => {
    if (!currentRace) return;
    
    // Check if all distances are entered before showing confirmation
    if (!allDistancesEntered()) {
      alert('⚠️ La distance est obligatoire pour TOUS les participants!\n\nVeuillez entrer une distance (0-200 cm) pour chaque équipe avant de sauvegarder.');
      return;
    }
    
    setShowFinishConfirmation(true);
  };

  const handleConfirmFinish = () => {
    if (!currentRace) return;

    // Validate distance for all teams (finished or not)
    // Distance is mandatory: must be a number between 0 and 200 (inclusive)
    const invalidTeams = currentRace.timers.filter((timer) => {
      const distance = timer.distance;
      // Check if distance is not a valid number or out of range
      return (
        distance === undefined || 
        distance === null || 
        isNaN(distance) || 
        distance < 0 || 
        distance > 200
      );
    });

    if (invalidTeams.length > 0) {
      const teamNames = invalidTeams.map((t) => t.team).join(', ');
      alert(
        `Cannot save race - Invalid or missing distance for team(s): ${teamNames}\n\nDistance is mandatory and must be between 0 and 200 cm`
      );
      console.log('[v0] Invalid distances detected:', invalidTeams);
      return;
    }

    // Save race with finishedTime, distances, and penalties
    const finishedRace = {
      ...currentRace,
      finished: true
    };

    const raceToSave = { ...finishedRace, phase };
    addRace(raceToSave);

    // Validate Phase 1 scoring for all teams
    console.log('[v0] === PHASE 1 SCORING VALIDATION ===');
    console.log('[v0] IMPORTANT: Scoring applies to ALL teams, even non-finishers');
    console.log('[v0] Formula: distance_points + speed_score + penalties');
    console.log('[v0] Non-finishers: speed_score = 0 (no time bonus)');
    console.log('[v0] ---');
    
    currentRace.timers.forEach((timer) => {
      const timeSeconds = timer.centiseconds / 100;
      const distancePoints = timer.distance;
      let speedScore = 0;
      if (timer.finished && timer.centiseconds < 36000) {
        speedScore = (360 - timeSeconds) * 0.5;
      }
      const totalPenalties = 
        (timer.barrierContactCount * 20) +
        (timer.stopSignalViolationCount * 30) +
        (timer.humanInterventionCount * 50);
      const totalScore = distancePoints + speedScore - totalPenalties;
      
      console.log(`[v0] ${timer.team}:`);
      console.log(`  - Finished: ${timer.finished ? 'YES' : 'NO (DNF)'}`);
      console.log(`  - Time: ${timer.finished ? timer.finishedTime + ' (' + timeSeconds + 's)' : 'DNF (360s timeout)'}`);
      console.log(`  - Distance: ${distancePoints} cm → +${distancePoints} pts`);
      console.log(`  - Speed Score: ${speedScore.toFixed(1)} pts (${timer.finished ? 'finished & time < 360' : 'DNF = 0'})`);
      console.log(`  - Penalties: -20×${timer.barrierContactCount} -30×${timer.stopSignalViolationCount} -50×${timer.humanInterventionCount} = -${totalPenalties}`);
      console.log(`  - FINAL SCORE: ${totalScore.toFixed(1)} pts`);
      console.log('[v0] ---');
    });

    // Add penalties to global scores for each team
    currentRace.timers.forEach((timer) => {
      if (timer.finished && timer.penalty < 0) {
        console.log('[v0] Saving penalty for', timer.team, ':', timer.penalty, 'Distance:', timer.distance);
        addTeamPenalties(timer.team, timer.penalty, 1);
      }
    });

    setCurrentRace(null);
    setRaceStarted(false);
    setShowFinishConfirmation(false);
    setFinishMessage('Race saved successfully with all distances and penalties!');
    
    setTimeout(() => setFinishMessage(null), 3000);
  };

  const handleCancelFinish = () => {
    setShowFinishConfirmation(false);
  };

  const handleStopTeam = (teamName: string) => {
    if (!currentRace) return;

    setCurrentRace((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        timers: prev.timers.map((t) =>
          t.team === teamName ? { 
            ...t, 
            finished: true
            // finishedTime already contains the formatted time
          } : t
        )
      };
    });
  };

  const handleSaveTeam = (teamName: string) => {
    if (!currentRace) return;

    // This is called automatically when stopping, but can be extended for individual saves
    handleStopTeam(teamName);
  };

  const handleAddPenalty = (teamName: string, penaltyAmount: number) => {
    if (!currentRace) return;

    console.log('[v0] Adding penalty to', teamName, ':', penaltyAmount);
    setCurrentRace((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        timers: prev.timers.map((t) =>
          t.team === teamName 
            ? { 
                ...t, 
                penalty: t.penalty - penaltyAmount // subtracting (penalty is negative)
              } 
            : t
        )
      };
    });
  };

  const handleSetDistance = (teamName: string, distance: number) => {
    if (!currentRace) return;

    console.log('[v0] Setting distance for', teamName, ':', distance);
    setCurrentRace((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        timers: prev.timers.map((t) =>
          t.team === teamName 
            ? { 
                ...t, 
                distance: Math.max(0, distance)
              } 
            : t
        )
      };
    });
  };

  const handleTogglePenalty = (teamName: string, penaltyType: 'barrier' | 'stopSignal' | 'humanIntervention') => {
    if (!currentRace) return;

    console.log('[v0] Adding penalty type', penaltyType, 'for', teamName);
    let penaltyLabel = '';

    setCurrentRace((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        timers: prev.timers.map((t) => {
          if (t.team === teamName) {
            const newTimer = { ...t };
            if (penaltyType === 'barrier') {
              newTimer.barrierContactCount += 1;
              newTimer.penalty -= 20;
              penaltyLabel = `Barrière -20 (×${newTimer.barrierContactCount})`;
            } else if (penaltyType === 'stopSignal') {
              newTimer.stopSignalViolationCount += 1;
              newTimer.penalty -= 30;
              penaltyLabel = `Signal d'arrêt -30 (×${newTimer.stopSignalViolationCount})`;
            } else if (penaltyType === 'humanIntervention') {
              newTimer.humanInterventionCount += 1;
              newTimer.penalty -= 50;
              penaltyLabel = `Intervention -50 (×${newTimer.humanInterventionCount})`;
            }
            return newTimer;
          }
          return t;
        })
      };
    });

    // Show feedback notification
    setPenaltyFeedback({
      team: teamName,
      type: penaltyLabel,
      timestamp: Date.now()
    });

    // Auto-hide after 2 seconds
    setTimeout(() => {
      setPenaltyFeedback(null);
    }, 2000);
  };

  // Leaderboard view
  if (showLeaderboard) {
    return (
      <RaceLeaderboard
        races={getRacesByPhase(phase)}
        onClose={() => setShowLeaderboard(false)}
        phase={phase as 'phase-1' | 'phase-2'}
      />
    );
  }

  // No race - show Add Race button and saved races
  if (!currentRace) {
    return (
      <div className="h-full flex flex-col px-6 py-4 gap-6">
        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowWheelSelector(true)}
            className="border-4 border-cyan-400 px-16 py-6 text-cyan-300 font-bold text-2xl cursor-pointer hover:bg-cyan-400 hover:text-blue-950 transition-colors"
            style={{ fontFamily: 'Press Start 2P' }}
          >
            ADD RACE
          </button>
        </div>

        {/* Saved Races History */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Press Start 2P' }}>
            SAVED RACES
          </h3>
          <div className="flex-1 overflow-hidden">
            <RaceHistory phase={phase} />
          </div>
        </div>

        {/* Wheel Selection Modal */}
        {showWheelSelector && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="border-4 border-cyan-400 bg-blue-950/95 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '1.2rem' }}>
                  SELECT WHEEL
                </h2>
                <button
                  onClick={() => setShowWheelSelector(false)}
                  className="text-cyan-400 hover:text-red-400 font-bold text-3xl"
                >
                  ×
                </button>
              </div>

              {wheelHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-cyan-400 mb-6">No saved wheels available</p>
                  <button
                    onClick={handleNoWheel}
                    className="px-8 py-3 font-bold border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950 transition-colors text-lg"
                  >
                    USE ALL TEAMS
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 mb-8">
                    {wheelHistory.map((wheel) => (
                      <button
                        key={wheel.id}
                        onClick={() => handleWheelSelected(wheel)}
                        className="p-4 border-2 border-cyan-400 bg-blue-900/40 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-400/20 transition-all text-left"
                      >
                        <div className="font-bold text-sm mb-2">{wheel.date}</div>
                        <div className="text-xs text-cyan-600 text-pretty">
                          {wheel.order.join(' → ')}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={handleNoWheel}
                      className="px-8 py-3 font-bold border-2 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-blue-950 transition-colors text-lg"
                    >
                      USE ALL TEAMS
                    </button>
                    <button
                      onClick={() => setShowWheelSelector(false)}
                      className="px-8 py-3 font-bold border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950 transition-colors text-lg"
                    >
                      CANCEL
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Team Selection Modal */}
        {showSelector && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="border-4 border-cyan-400 bg-blue-950/95 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '1.2rem' }}>
                    SELECT TEAMS
                  </h2>
                  {selectedWheel && (
                    <p className="text-yellow-400 text-xs mt-2">Using Wheel: {selectedWheel.date}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowSelector(false);
                    setSelected([]);
                    setSelectedWheel(null);
                  }}
                  className="text-cyan-400 hover:text-red-400 font-bold text-3xl"
                >
                  ×
                </button>
              </div>

              {orderedTeams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-orange-400 font-bold mb-4">All available teams have already participated in this phase</p>
                  <p className="text-cyan-400 text-xs">Each team can only race once per phase</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {orderedTeams.map((team, index) => (
                      <button
                        key={team}
                        onClick={() => toggleTeam(team)}
                        className={`p-6 border-2 font-bold text-lg transition-all relative ${
                          selected.includes(team)
                            ? 'border-cyan-300 bg-cyan-400/30 text-cyan-100'
                            : 'border-cyan-400 bg-blue-900/40 text-cyan-300 hover:border-cyan-300'
                        }`}
                      >
                        {selectedWheel && (
                          <span className="absolute top-1 right-1 text-xs text-cyan-600 font-bold">#{index + 1}</span>
                        )}
                        {team}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={handleStartRace}
                      disabled={selected.length === 0}
                      className={`px-8 py-3 font-bold border-2 text-lg transition-colors ${
                        selected.length === 0
                          ? 'border-cyan-700 text-cyan-700 cursor-not-allowed'
                          : 'border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950'
                      }`}
                    >
                      START
                    </button>
                    <button
                      onClick={() => {
                        setShowSelector(false);
                        setSelected([]);
                        setShowWheelSelector(true);
                        setSelectedWheel(null);
                      }}
                      className="px-8 py-3 font-bold border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950 transition-colors text-lg"
                    >
                      BACK
                    </button>
                  </div>

                  <p className="text-cyan-600 text-sm text-center mt-4">
                    {selected.length}/5 teams selected
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Finish Confirmation Modal
  if (showFinishConfirmation && currentRace) {
    const teamsWithPenalties = currentRace.timers.filter(t => t.penalty < 0);
    
    return (
      <div className="h-full flex items-center justify-center px-6 py-4">
        <div className="border-4 border-cyan-400 bg-blue-950/95 p-8 max-w-2xl w-full">
          <h2 className="text-white font-bold text-2xl mb-6" style={{ fontFamily: 'Press Start 2P' }}>
            FINISH RACE?
          </h2>

          <div className="space-y-4 mb-8 max-h-96 overflow-y-auto">
            <h3 className="text-cyan-400 font-bold text-sm">RACE SUMMARY & SCORING</h3>
            
            {currentRace.timers.map((timer) => {
              const timeSeconds = timer.centiseconds / 100;
              const distancePoints = timer.distance;
              let speedScore = 0;
              if (timer.finished && timer.centiseconds < 36000) {
                speedScore = (360 - timeSeconds) * 0.5;
              }
              const totalPenalties = 
                (timer.barrierContactCount * 20) +
                (timer.stopSignalViolationCount * 30) +
                (timer.humanInterventionCount * 50);
              const totalScore = distancePoints + speedScore - totalPenalties;
              
              return (
                <div key={timer.team} className={`border-2 p-4 ${
                  timer.finished 
                    ? 'border-yellow-400 bg-yellow-400/10' 
                    : 'border-red-500 bg-red-500/10'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-cyan-300 font-bold">{timer.team}</span>
                    <span className={`font-mono font-bold ${timer.finished ? 'text-yellow-400' : 'text-red-400'}`}>
                      {timer.finished ? timer.finishedTime : 'TIME UP (DNF)'}
                    </span>
                  </div>
                  
                  {/* Score Breakdown */}
                  <div className="bg-blue-950/60 border border-cyan-400 p-2 rounded mt-2 mb-2 text-xs space-y-1">
                    <div className="text-cyan-400">📊 Score Calculation:</div>
                    <div className="text-green-400">Distance: {distancePoints} cm → +{distancePoints} pts</div>
                    <div className={speedScore > 0 ? 'text-cyan-400' : 'text-gray-500'}>
                      Speed: {speedScore.toFixed(1)} pts {timer.finished && timer.centiseconds < 36000 ? `(6min-${timeSeconds}s)×0.5` : '(DNF = 0)'}
                    </div>
                    {totalPenalties > 0 && (
                      <div className="text-red-400">Penalties: -{totalPenalties} pts</div>
                    )}
                    <div className="text-yellow-400 font-bold border-t border-cyan-400 pt-1 mt-1">
                      TOTAL SCORE: {totalScore.toFixed(1)} pts
                    </div>
                  </div>
                  
                  {timer.penalty < 0 && (
                    <div className="bg-red-500/20 border border-red-500 p-2 rounded">
                      <span className="text-red-400 text-xs font-bold">
                        Total Penalty Points: {Math.abs(timer.penalty)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

  <div className="flex gap-4 justify-center">
  <button
  onClick={handleConfirmFinish}
  disabled={!allDistancesEntered()}
  className={`border-4 px-12 py-4 font-bold text-xl transition-colors shadow-lg ${
    allDistancesEntered()
      ? 'border-green-500 text-green-400 hover:bg-green-500 hover:text-blue-950 animate-pulse'
      : 'border-gray-600 text-gray-500 cursor-not-allowed opacity-50'
  }`}
  style={{ fontFamily: 'Press Start 2P', boxShadow: allDistancesEntered() ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none' }}
  >
  SAVE RACE
  </button>
            <button
              onClick={handleCancelFinish}
              className="border-4 border-cyan-400 text-cyan-300 px-8 py-3 font-bold text-lg hover:bg-cyan-400 hover:text-blue-950 transition-colors"
              style={{ fontFamily: 'Press Start 2P' }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Race in progress - show timers and camera
  return (
    <div className="h-full flex flex-col px-6 py-4 gap-4">
      {/* Finish Message */}
      {finishMessage && (
        <div className="bg-green-500/20 border-2 border-green-500 p-3 rounded text-green-400 font-bold text-center animate-pulse">
          {finishMessage}
        </div>
      )}

      {/* Penalty Feedback Toast */}
      {penaltyFeedback && (
        <div className="fixed top-8 right-8 z-40 animate-pulse">
          <div className="border-4 border-red-500 bg-red-500/20 px-6 py-4 text-red-300 font-bold text-center">
            <div className="text-lg">{penaltyFeedback.team}</div>
            <div className="text-sm mt-1">✗ {penaltyFeedback.type}</div>
          </div>
        </div>
      )}

      {/* Main Layout: Left (Control Panel) + Right (Camera) */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* LEFT PANEL - Control */}
        <div className="w-96 flex flex-col gap-3 bg-blue-950/60 border-2 border-cyan-400 p-4 overflow-y-auto">
          {/* Top Controls */}
          <div className="flex flex-col gap-2">
            {!raceStarted ? (
              <button
                onClick={handleBeginRace}
                className="border-2 border-green-500 text-green-400 px-6 py-2 font-bold text-lg hover:bg-green-500 hover:text-blue-950 transition-colors w-full"
              >
                BEGIN RACE
              </button>
            ) : (
              <>
                <button
                  onClick={handleFinishRace}
                  className="border-3 border-red-500 text-red-400 px-6 py-3 font-bold text-lg hover:bg-red-500 hover:text-blue-950 transition-colors shadow-lg animate-pulse w-full"
                  style={{ fontFamily: 'Press Start 2P', fontSize: '0.7rem', boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}
                >
                  FINISH RACE
                </button>
                
                {/* Time Limit Display */}
                <div className={`border-2 px-4 py-2 font-bold ${
                  timeRemaining <= 0
                    ? 'border-red-500 text-red-400 bg-red-500/10'
                    : 'border-cyan-400 text-cyan-300'
                }`}>
                  <div className="text-xs text-cyan-400">TIME LIMIT</div>
                  <div className="text-xl font-mono">{formatTime(timeRemaining)}</div>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-cyan-400/30 pt-3">
            <h3 className="text-cyan-300 font-bold text-xs mb-3" style={{ fontFamily: 'Press Start 2P', fontSize: '0.6rem' }}>
              TEAMS ({currentRace?.timers.length || 0}/5)
            </h3>

            {/* Team Timers Vertical Layout */}
            <div className="flex flex-col gap-3">
              {currentRace?.timers.map((timer, index) => {
                const isTimeExpired = timer.centiseconds >= MAX_RACE_TIME;
                const isFinished = timer.finished;

                return (
                  <div
                    key={timer.team}
                    className={`border-2 p-3 flex flex-col gap-2 ${
                      isFinished
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : isTimeExpired
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-cyan-400 bg-blue-950/40'
                    }`}
                  >
                    {/* Team Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-orange-400 font-bold text-xs">#{index + 1}</div>
                        <h4 className="text-cyan-300 font-bold text-xs truncate">
                          {timer.team}
                        </h4>
                      </div>
                      <div className={`text-lg font-bold font-mono ${
                        isTimeExpired ? 'text-red-400' : 'text-cyan-300'
                      }`}>
                        {timer.finishedTime}
                      </div>
                    </div>

                    {/* Status */}
                    {isFinished && (
                      <span className="text-yellow-400 text-xs font-bold text-center">✓ FINISHED</span>
                    )}
                    {isTimeExpired && !isFinished && (
                      <div className="text-center">
                        <span className="text-red-400 text-xs font-bold block">⏱️ TIME UP (DNF)</span>
                        <span className="text-orange-400 text-xs font-bold mt-1 block">Distance Required!</span>
                      </div>
                    )}

                    {/* Distance Input - Mandatory before save (0-200 cm) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-cyan-400 text-xs font-bold">Distance (cm) *Required</label>
                      <input
                        type="number"
                        value={timer.distance}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          // Round to 2 decimal places to avoid floating point precision issues
                          const rounded = Math.round(value * 100) / 100;
                          handleSetDistance(timer.team, rounded);
                        }}
                        onKeyDown={(e) => {
                          // Allow Enter to confirm distance entry
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            // Distance is validated and auto-calculated
                            const numValue = parseFloat(e.currentTarget.value) || 0;
                            if (numValue >= 0 && numValue <= 200) {
                              console.log('[v0] Distance confirmed for', timer.team, ':', numValue, 'cm');
                            }
                          }
                        }}
                        className={`w-full px-2 py-1 bg-blue-950 border-2 text-cyan-300 text-center text-xs rounded font-bold transition-colors ${
                          timer.distance >= 0 && timer.distance <= 200
                            ? 'border-green-500 text-green-400'
                            : 'border-red-500 text-red-400'
                        }`}
                        placeholder="0-200"
                        min="0"
                        max="200"
                        step="0.01"
                      />
                      {(timer.distance < 0 || timer.distance > 200) && (
                        <span className="text-red-400 text-xs text-center font-bold">⚠ 0-200 cm required</span>
                      )}
                      {timer.distance >= 0 && timer.distance <= 200 && (
                        <span className="text-green-400 text-xs text-center font-bold">✓ Valid: {timer.distance} cm</span>
                      )}
                    </div>

                    {/* Penalties - Horizontal Layout */}
                    <div className="flex gap-1 text-xs">
                      <button
                        onClick={() => handleTogglePenalty(timer.team, 'barrier')}
                        className={`flex-1 border font-bold px-1 py-1 rounded transition-colors ${
                          timer.barrierContactCount > 0
                            ? 'border-red-500 bg-red-500/30 text-red-400'
                            : 'border-cyan-400 text-cyan-300'
                        }`}
                        title="Contact Barrière: -20 points (cumulable)"
                      >
                        🚧 {timer.barrierContactCount > 0 ? `x${timer.barrierContactCount}` : ''}
                      </button>
                      <button
                        onClick={() => handleTogglePenalty(timer.team, 'stopSignal')}
                        className={`flex-1 border font-bold px-1 py-1 rounded transition-colors ${
                          timer.stopSignalViolationCount > 0
                            ? 'border-orange-500 bg-orange-500/30 text-orange-400'
                            : 'border-cyan-400 text-cyan-300'
                        }`}
                        title="Mouvement signal d'arrêt: -30 points (cumulable)"
                      >
                        ⛔ {timer.stopSignalViolationCount > 0 ? `x${timer.stopSignalViolationCount}` : ''}
                      </button>
                      <button
                        onClick={() => handleTogglePenalty(timer.team, 'humanIntervention')}
                        className={`flex-1 border font-bold px-1 py-1 rounded transition-colors ${
                          timer.humanInterventionCount > 0
                            ? 'border-red-600 bg-red-600/30 text-red-400'
                            : 'border-cyan-400 text-cyan-300'
                        }`}
                        title="Intervention humaine: -50 points (cumulable)"
                      >
                        🤚 {timer.humanInterventionCount > 0 ? `x${timer.humanInterventionCount}` : ''}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 text-xs">
                      {!isFinished && !isTimeExpired && (
                        <button
                          onClick={() => handleStopTeam(timer.team)}
                          className="flex-1 border border-red-500 text-red-400 px-1 py-1 font-bold hover:bg-red-500 hover:text-blue-950 transition-colors"
                          disabled={!raceStarted}
                        >
                          STOP
                        </button>
                      )}
                      <button
                        onClick={() => handleSaveTeam(timer.team)}
                        className={`flex-1 border font-bold px-1 py-1 transition-colors ${
                          timer.distance >= 0 && timer.distance <= 200
                            ? isFinished
                              ? 'border-green-500 text-green-400 hover:bg-green-500 hover:text-blue-950'
                              : 'border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950'
                            : 'border-gray-600 text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                        disabled={!raceStarted || timer.distance < 0 || timer.distance > 200}
                        title={timer.distance < 0 || timer.distance > 200 ? 'Distance required (0-200cm)' : ''}
                      >
                        SAVE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Camera Feed */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '0.7rem' }}>
              CAMERA FEED
            </h3>
            {availableCameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-blue-950 border border-cyan-400 text-cyan-300 text-xs px-2 py-1 font-mono max-w-xs truncate"
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex-1 border-4 border-cyan-400 bg-black flex items-center justify-center relative overflow-hidden">
            {!cameraError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onError={() => {
                  console.error('[v0] Video element error occurred');
                  setCameraError(true);
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <svg className="w-24 h-24 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-cyan-400 text-sm text-center font-bold">
                  Camera unavailable
                  <br />
                  <span className="text-xs text-cyan-600">Check USB connection or permissions</span>
                </p>
                <button
                  onClick={async () => {
                    setCameraError(false);
                    // Re-enumerate devices in case USB camera was plugged in after page load
                    try {
                      const devices = await navigator.mediaDevices.enumerateDevices();
                      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
                      console.log('[v0] Phase1 - Retry: Re-detected cameras:', videoDevices.map((d, i) => `${i}: "${d.label}"`));
                      setAvailableCameras(videoDevices);
                      if (videoDevices.length > 0) {
                        const preferredId = videoDevices[videoDevices.length - 1].deviceId;
                        setSelectedCameraId('');
                        setTimeout(() => setSelectedCameraId(preferredId), 100);
                      }
                    } catch (err) {
                      console.error('[v0] Phase1 - Retry enumeration failed:', err);
                      const current = selectedCameraId;
                      setSelectedCameraId('');
                      setTimeout(() => setSelectedCameraId(current), 100);
                    }
                  }}
                  className="border-2 border-cyan-400 text-cyan-300 px-4 py-2 text-xs font-bold hover:bg-cyan-400 hover:text-blue-950 transition-colors"
                >
                  RETRY CAMERA
                </button>
                {availableCameras.length > 0 && (
                  <div className="text-xs text-cyan-600">
                    {availableCameras.length} camera(s) detected - try selecting another
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
