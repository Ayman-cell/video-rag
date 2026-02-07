'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import RaceLeaderboard from './RaceLeaderboard';
import { useRaces } from '@/context/RacesContext';

interface Props {
  teams: string[];
  showLeaderboard: boolean;
  setShowLeaderboard: (show: boolean) => void;
  phase: 'phase-1' | 'phase-2';
}

const formatTime = (centiseconds: number): string => {
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const centis = centiseconds % 100;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centis.toString().padStart(2, '0')}`;
};

export default function Phase2Manager({ teams, showLeaderboard, setShowLeaderboard, phase }: Props) {
  const { addRace, getRacesByPhase } = useRaces();
  const [currentTeam, setCurrentTeam] = useState<string | null>(null);
  const [raceStarted, setRaceStarted] = useState(false);
  const [centiseconds, setCentiseconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [dnf, setDnf] = useState(false); // Did Not Finish (gave up or time expired)

  // Challenge checkboxes
  const [planInclineComplete, setPlanInclineComplete] = useState(false);
  const [distanceMeasureComplete, setDistanceMeasureComplete] = useState(false);
  const [stairsComplete, setStairsComplete] = useState(false);

  // Intervention count
  const [interventionCount, setInterventionCount] = useState(0);

  // Distance in cm - stored as string for exact input
  const [distanceCm, setDistanceCm] = useState('');

  // Camera
  const [cameraError, setCameraError] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Save message
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Timer refs for Date.now()-based accurate timing
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const MAX_RACE_TIME = 60000; // 10 minutes in centiseconds
  const PLAN_INCLINE_POINTS = 150;
  const DISTANCE_MEASURE_POINTS = 150;
  const STAIRS_POINTS = 150;
  const INTERVENTION_PENALTY = 20;

  const savedRaces = getRacesByPhase(phase);

  // Accurate timer using Date.now() + requestAnimationFrame
  const updateTimer = useCallback(() => {
    if (!startTimeRef.current) return;
    const elapsed = Date.now() - startTimeRef.current;
    const cs = Math.floor(elapsed / 10); // convert ms to centiseconds
    if (cs >= MAX_RACE_TIME) {
      setCentiseconds(MAX_RACE_TIME);
      setRaceStarted(false);
      setDnf(true); // Time expired = did not finish
      return;
    }
    setCentiseconds(cs);
    animFrameRef.current = requestAnimationFrame(updateTimer);
  }, []);

  useEffect(() => {
    if (raceStarted && !finished && !dnf) {
      startTimeRef.current = Date.now() - (centiseconds * 10); // account for existing time
      animFrameRef.current = requestAnimationFrame(updateTimer);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [raceStarted, finished, dnf, updateTimer]);

  // Enumerate cameras when team selected
  useEffect(() => {
    if (!currentTeam) return;

    const enumerateCameras = async () => {
      try {
        // Request permission first so labels are populated
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        console.log('[v0] Phase2 - Detected cameras:', videoDevices.map((d, i) => `${i}: "${d.label}" (${d.deviceId.slice(0, 12)}...)`));
        setAvailableCameras(videoDevices);

        if (videoDevices.length > 0) {
          // Pick the LAST camera in the list - USB cameras are usually appended at the end
          const preferredId = videoDevices[videoDevices.length - 1].deviceId;
          console.log('[v0] Phase2 - Selecting camera:', videoDevices[videoDevices.length - 1].label);
          setSelectedCameraId(preferredId);
        }
      } catch (err) {
        console.error('[v0] Phase2 - Camera enumeration error:', err);
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
  }, [currentTeam]);

  // Start the selected camera - use exact constraint and verify track
  const startCameraById = useCallback(async (deviceId: string) => {
    setCameraError(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;

      // Strategy 1: Use EXACT deviceId (forces the specific camera)
      if (deviceId) {
        try {
          console.log('[v0] Phase2 - Trying EXACT deviceId:', deviceId.slice(0, 12));
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false,
          });
          const activeTrack = stream.getVideoTracks()[0];
          console.log('[v0] Phase2 - Got stream, track label:', activeTrack?.label, 'settings deviceId:', activeTrack?.getSettings()?.deviceId?.slice(0, 12));
        } catch (e) {
          console.log('[v0] Phase2 - Exact deviceId failed:', (e as Error).message);
          stream = null;
        }
      }

      // Strategy 2: If exact failed, try each camera one by one until we find the right one
      if (!stream && deviceId && availableCameras.length > 0) {
        const targetCam = availableCameras.find((c) => c.deviceId === deviceId);
        if (targetCam) {
          // Try with just the deviceId, no other constraints
          try {
            console.log('[v0] Phase2 - Trying bare deviceId for:', targetCam.label);
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: deviceId },
              audio: false,
            });
            const activeTrack = stream.getVideoTracks()[0];
            // Verify we got the right camera
            if (activeTrack && activeTrack.getSettings().deviceId !== deviceId) {
              console.log('[v0] Phase2 - Got wrong camera:', activeTrack.label, '- stopping and retrying');
              stream.getTracks().forEach((t) => t.stop());
              stream = null;
            }
          } catch (e) {
            console.log('[v0] Phase2 - Bare deviceId also failed');
            stream = null;
          }
        }
      }

      // Strategy 3: Fallback to any available camera
      if (!stream) {
        console.log('[v0] Phase2 - Falling back to any available camera');
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
        console.log('[v0] Phase2 - Camera NOW active:', activeTrack?.label, '| deviceId:', activeTrack?.getSettings()?.deviceId?.slice(0, 12));
      }
    } catch (err) {
      console.error('[v0] Phase2 - All camera strategies failed:', err);
      setCameraError(true);
    }
  }, [availableCameras]);

  // When selectedCameraId changes, start that camera
  useEffect(() => {
    if (!currentTeam || !selectedCameraId) return;
    startCameraById(selectedCameraId);
  }, [selectedCameraId, currentTeam, startCameraById]);

  const retryCamera = async () => {
    // Re-enumerate devices in case USB camera was plugged in after page load
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      console.log('[v0] Phase2 - Retry: Re-detected cameras:', videoDevices.map((d, i) => `${i}: "${d.label}" (${d.deviceId.slice(0, 12)}...)`));
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0) {
        const preferredId = videoDevices[videoDevices.length - 1].deviceId;
        setSelectedCameraId(''); // reset first
        setTimeout(() => setSelectedCameraId(preferredId), 100);
      }
    } catch (err) {
      console.error('[v0] Phase2 - Retry enumeration failed:', err);
      startCameraById(selectedCameraId);
    }
  };

  // Calculate Phase 2 score
  const calculatePhase2Score = (): number => {
    let score = 0;
    if (planInclineComplete) score += PLAN_INCLINE_POINTS;
    if (distanceMeasureComplete) score += DISTANCE_MEASURE_POINTS;
    if (stairsComplete) score += STAIRS_POINTS;
    score -= interventionCount * INTERVENTION_PENALTY;

    // Time bonus ONLY if finished (clicked FINISH) before 10 min
    // If DNF or time expired => no time bonus
    if (finished && centiseconds < MAX_RACE_TIME) {
      const timeSeconds = centiseconds / 100;
      score += (600 - timeSeconds) * 0.5;
    }

    return Math.max(0, score);
  };

  const handleTeamSelect = (team: string) => {
    const alreadyRaced = savedRaces.some(
      (r) => r.timers?.some((t) => t.team === team) || (r as any).participant === team,
    );
    if (alreadyRaced) {
      alert(`Team ${team} a deja participe en Phase 2.`);
      return;
    }
    setCurrentTeam(team);
    setCentiseconds(0);
    setFinished(false);
    setDnf(false);
    setRaceStarted(false);
    setPlanInclineComplete(false);
    setDistanceMeasureComplete(false);
    setStairsComplete(false);
    setInterventionCount(0);
    setDistanceCm('');
    startTimeRef.current = 0;
  };

  const handleBeginRace = () => {
    startTimeRef.current = Date.now();
    setRaceStarted(true);
    setFinished(false);
    setDnf(false);
  };

  // Team completed the circuit
  const handleFinishRace = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setFinished(true);
    setRaceStarted(false);
  };

  // Team did not finish (gave up / abandoned)
  const handleDNF = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setDnf(true);
    setRaceStarted(false);
  };

  const handleSaveRace = () => {
    if (!currentTeam) return;

    // Parse distance exactly as entered
    const distStr = distanceCm.trim();
    const dist = Number.parseFloat(distStr);
    if (distStr === '' || Number.isNaN(dist) || dist < 0) {
      alert('Veuillez entrer une distance valide (en cm) avant de sauvegarder.');
      return;
    }

    const teamFinished = finished && centiseconds < MAX_RACE_TIME;
    const finalScore = calculatePhase2Score();

    const race = {
      id: `phase2-${Date.now()}`,
      timestamp: Date.now(),
      participants: [currentTeam],
      timers: [
        {
          team: currentTeam,
          centiseconds,
          finishedTime: formatTime(centiseconds),
          finished: teamFinished,
          penalty: -(interventionCount * INTERVENTION_PENALTY),
          distance: dist,
          barrierContactCount: 0,
          stopSignalViolationCount: 0,
          humanInterventionCount: interventionCount,
          planInclineComplete,
          distanceMeasureComplete,
          stairsComplete,
          interventionCount,
          distanceCm: dist,
        },
      ],
      finished: true,
      phase: 'phase-2' as const,
    };

    addRace(race);

    console.log('[v0] === PHASE 2 RACE SAVED ===');
    console.log(`[v0] Team: ${currentTeam}`);
    console.log(`[v0] Time: ${formatTime(centiseconds)} (${(centiseconds / 100).toFixed(2)}s)`);
    console.log(`[v0] Finished circuit: ${teamFinished}`);
    console.log(`[v0] DNF: ${dnf}`);
    console.log(`[v0] Challenges: Plan=${planInclineComplete} Dist=${distanceMeasureComplete} Stairs=${stairsComplete}`);
    console.log(`[v0] Interventions: ${interventionCount}`);
    console.log(`[v0] Distance entered: "${distStr}" => saved: ${dist} cm`);
    console.log(`[v0] Score: ${finalScore.toFixed(1)}`);

    setSaveMessage(`${currentTeam} sauvegarde! Score: ${finalScore.toFixed(1)} pts`);

    setTimeout(() => {
      setCurrentTeam(null);
      setCentiseconds(0);
      setFinished(false);
      setDnf(false);
      setRaceStarted(false);
      setPlanInclineComplete(false);
      setDistanceMeasureComplete(false);
      setStairsComplete(false);
      setInterventionCount(0);
      setDistanceCm('');
      setSaveMessage(null);
      startTimeRef.current = 0;
    }, 2000);
  };

  const handleCancel = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCurrentTeam(null);
    setCentiseconds(0);
    setFinished(false);
    setDnf(false);
    setRaceStarted(false);
    setPlanInclineComplete(false);
    setDistanceMeasureComplete(false);
    setStairsComplete(false);
    setInterventionCount(0);
    setDistanceCm('');
    startTimeRef.current = 0;
  };

  const timeRemaining = MAX_RACE_TIME - centiseconds;
  const currentScore = calculatePhase2Score();
  const raceOver = finished || dnf;

  // Leaderboard view
  if (showLeaderboard) {
    return (
      <RaceLeaderboard
        races={getRacesByPhase(phase)}
        onClose={() => setShowLeaderboard(false)}
        phase="phase-2"
      />
    );
  }

  // Team selection view
  if (!currentTeam) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-3">
        {saveMessage && (
          <div className="mb-4 border-2 border-green-400 bg-green-500/20 px-6 py-3 text-green-300 font-bold text-center">
            {saveMessage}
          </div>
        )}
        <h2
          className="text-xl font-bold mb-3 text-cyan-300 text-center"
          style={{ fontFamily: 'Press Start 2P' }}
        >
          SELECT TEAM
        </h2>
        <div className="grid grid-cols-5 gap-2 w-full max-w-5xl">
          {teams.map((team) => {
            const hasRaced = savedRaces.some(
              (r) => r.timers?.some((t) => t.team === team) || (r as any).participant === team,
            );
            return (
              <button
                key={team}
                onClick={() => handleTeamSelect(team)}
                disabled={hasRaced}
                className={`border-2 px-3 py-2 font-bold text-sm transition-colors truncate ${
                  hasRaced
                    ? 'border-green-500 bg-green-500/20 text-green-400 cursor-not-allowed'
                    : 'border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-blue-950'
                }`}
              >
                {team} {hasRaced ? ' Done' : ''}
              </button>
            );
          })}
        </div>
        {savedRaces.length > 0 && (
          <div className="mt-4 text-cyan-600 text-sm">
            {savedRaces.length} / {teams.length} teams completed
          </div>
        )}
      </div>
    );
  }

  // Active race view
  return (
    <div className="h-full flex flex-col px-4 py-3 gap-3">
      {/* Top bar: Team name + Timer */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="border-2 border-red-500 text-red-400 px-3 py-1 text-xs font-bold hover:bg-red-500 hover:text-blue-950 transition-colors"
          >
            CANCEL
          </button>
          <h2
            className="text-cyan-300 font-bold text-lg"
            style={{ fontFamily: 'Press Start 2P', fontSize: '0.8rem' }}
          >
            {currentTeam}
          </h2>
          {raceOver && (
            <span
              className={`text-xs font-bold px-2 py-1 border ${
                finished ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'
              }`}
            >
              {finished ? 'FINISHED' : 'DNF - TIME EXPIRED'}
            </span>
          )}
        </div>

        <div
          className={`border-2 px-4 py-2 font-mono text-xl font-bold ${
            timeRemaining <= 6000
              ? 'border-red-500 text-red-400 bg-red-500/10'
              : 'border-cyan-400 text-cyan-300'
          }`}
        >
          {formatTime(Math.max(0, timeRemaining))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* LEFT PANEL - Controls */}
        <div className="w-80 flex flex-col gap-3 bg-blue-950/60 border-2 border-cyan-400 p-3 overflow-y-auto">
          {/* Start / Finish / DNF buttons */}
          {!raceStarted && !raceOver && (
            <button
              onClick={handleBeginRace}
              className="border-2 border-green-500 text-green-400 px-4 py-3 font-bold text-lg hover:bg-green-500 hover:text-blue-950 transition-colors w-full"
              style={{ fontFamily: 'Press Start 2P', fontSize: '0.7rem' }}
            >
              BEGIN RACE
            </button>
          )}

          {raceStarted && !raceOver && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleFinishRace}
                className="border-3 border-green-500 text-green-400 px-4 py-3 font-bold text-lg hover:bg-green-500 hover:text-blue-950 transition-colors w-full"
                style={{
                  fontFamily: 'Press Start 2P',
                  fontSize: '0.7rem',
                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
                }}
              >
                FINISH (COMPLETED)
              </button>
              <button
                onClick={handleDNF}
                className="border-2 border-red-500 text-red-400 px-4 py-2 font-bold text-sm hover:bg-red-500 hover:text-blue-950 transition-colors w-full"
                style={{ fontFamily: 'Press Start 2P', fontSize: '0.55rem' }}
              >
                DNF (DID NOT FINISH)
              </button>
            </div>
          )}

          {/* Timer display */}
          <div className="border-2 border-cyan-400/50 px-3 py-2 text-center">
            <div className="text-xs text-cyan-500">ELAPSED TIME</div>
            <div className="text-lg font-mono font-bold text-cyan-300">
              {formatTime(centiseconds)}
            </div>
            <div className="text-xs text-cyan-700">
              {(centiseconds / 100).toFixed(2)}s
            </div>
          </div>

          {/* Challenges */}
          <div className="flex flex-col gap-2">
            <div
              className="text-xs text-cyan-400 font-bold"
              style={{ fontFamily: 'Press Start 2P', fontSize: '0.5rem' }}
            >
              CHALLENGES (150 pts each)
            </div>
            {[
              { label: 'PLAN INCLINE', value: planInclineComplete, toggle: () => setPlanInclineComplete(!planInclineComplete) },
              { label: 'DISTANCE MEASURE', value: distanceMeasureComplete, toggle: () => setDistanceMeasureComplete(!distanceMeasureComplete) },
              { label: 'STAIRS', value: stairsComplete, toggle: () => setStairsComplete(!stairsComplete) },
            ].map((ch) => (
              <button
                key={ch.label}
                onClick={ch.toggle}
                disabled={!raceStarted && !raceOver}
                className={`border-2 px-3 py-2 font-bold text-xs transition-colors w-full text-left ${
                  ch.value
                    ? 'border-green-500 bg-green-500/30 text-green-400'
                    : 'border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20'
                }`}
              >
                {ch.value ? '[X]' : '[ ]'} {ch.label} (+150)
              </button>
            ))}
          </div>

          {/* Interventions */}
          <div className="flex flex-col gap-1">
            <div
              className="text-xs text-orange-400 font-bold"
              style={{ fontFamily: 'Press Start 2P', fontSize: '0.5rem' }}
            >
              INTERVENTIONS (-20 pts each)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInterventionCount(Math.max(0, interventionCount - 1))}
                disabled={interventionCount === 0}
                className="border-2 border-cyan-400/50 text-cyan-300 px-3 py-1 font-bold hover:bg-cyan-400/20 transition-colors"
              >
                -
              </button>
              <span
                className={`font-mono font-bold text-lg flex-1 text-center ${
                  interventionCount > 0 ? 'text-orange-400' : 'text-cyan-500'
                }`}
              >
                {interventionCount}
              </span>
              <button
                onClick={() => setInterventionCount(interventionCount + 1)}
                className="border-2 border-orange-400/50 text-orange-400 px-3 py-1 font-bold hover:bg-orange-400/20 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Distance Input */}
          <div className="flex flex-col gap-1">
            <div
              className="text-xs text-green-400 font-bold"
              style={{ fontFamily: 'Press Start 2P', fontSize: '0.5rem' }}
            >
              DISTANCE PARCOURUE (cm)
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={distanceCm}
              onChange={(e) => {
                // Allow only numbers and a single decimal point
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setDistanceCm(val);
                }
              }}
              placeholder="Ex: 100"
              className="border-2 border-green-400/50 bg-blue-950/80 text-green-300 px-3 py-2 font-mono text-lg w-full focus:border-green-400 focus:outline-none placeholder:text-green-700"
            />
            {distanceCm !== '' && !Number.isNaN(Number.parseFloat(distanceCm)) && Number.parseFloat(distanceCm) >= 0 && (
              <div className="text-xs text-green-500">{distanceCm} cm</div>
            )}
          </div>

          {/* Current Score */}
          <div className="border-2 border-yellow-400 bg-yellow-400/10 p-3 text-center">
            <div className="text-xs text-yellow-600">SCORE PHASE 2</div>
            <div className="text-2xl font-bold text-yellow-300 font-mono">
              {currentScore.toFixed(1)}
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              {planInclineComplete ? '+150' : '0'} + {distanceMeasureComplete ? '+150' : '0'} +{' '}
              {stairsComplete ? '+150' : '0'}
              {interventionCount > 0 ? ` - ${interventionCount * 20}` : ''}
              {finished && centiseconds < MAX_RACE_TIME
                ? ` + ${((600 - centiseconds / 100) * 0.5).toFixed(1)} (temps)`
                : ' + 0 (temps)'}
            </div>
            {!finished && dnf && (
              <div className="text-xs text-red-400 mt-1">
                Pas de bonus temps (DNF)
              </div>
            )}
          </div>

          {/* Save Button - visible when race is over */}
          {raceOver && (
            <button
              onClick={handleSaveRace}
              className="border-2 border-green-500 bg-green-500/20 text-green-300 px-4 py-3 font-bold text-sm hover:bg-green-500 hover:text-blue-950 transition-colors w-full"
              style={{ fontFamily: 'Press Start 2P', fontSize: '0.6rem' }}
            >
              SAUVEGARDER
            </button>
          )}

          {saveMessage && (
            <div className="border-2 border-green-400 bg-green-500/20 px-3 py-2 text-green-300 font-bold text-center text-sm">
              {saveMessage}
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Camera Feed */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-3">
            <h3
              className="text-white font-bold"
              style={{ fontFamily: 'Press Start 2P', fontSize: '0.7rem' }}
            >
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
                  console.error('[v0] Video element error');
                  setCameraError(true);
                }}
              />
            ) : (
              <div className="text-cyan-400 text-center p-4">
                <div className="text-xl font-bold mb-2">CAMERA UNAVAILABLE</div>
                <div className="text-xs mb-4">Please check camera permissions and USB connection</div>
                <button
                  onClick={retryCamera}
                  className="border-2 border-cyan-400 text-cyan-300 px-4 py-2 text-xs font-bold hover:bg-cyan-400 hover:text-blue-950 transition-colors"
                >
                  RETRY CAMERA
                </button>
                {availableCameras.length > 0 && (
                  <div className="mt-3 text-xs text-cyan-600">
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
