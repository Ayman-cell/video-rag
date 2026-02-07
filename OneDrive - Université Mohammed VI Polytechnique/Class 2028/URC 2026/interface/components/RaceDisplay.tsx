'use client';

import { useState, useEffect, useRef } from 'react';

interface TeamTimer {
  team: string;
  time: number;
  finished: boolean;
}

interface Race {
  id: string;
  timestamp: number;
  participants: string[];
  timers: TeamTimer[];
  finished: boolean;
}

interface Props {
  race: Race;
  raceStarted: boolean;
  onBeginRace: () => void;
  onFinishRace: () => void;
  onSelectTeam: (team: string) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function RaceDisplay({
  race,
  raceStarted,
  onBeginRace,
  onFinishRace,
  onSelectTeam
}: Props) {
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraError(false);
          console.log('[v0] Camera stream initialized successfully');
        }
      } catch (error) {
        console.error('[v0] Camera error:', error);
        setCameraError(true);
      }
    };

    initCamera();

    // Cleanup: stop camera stream when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col px-6 py-4 gap-4">
      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!raceStarted ? (
          <button
            onClick={onBeginRace}
            className="border-2 border-green-500 text-green-400 px-8 py-2 font-bold hover:bg-green-500 hover:text-blue-950 transition-colors"
          >
            BEGIN
          </button>
        ) : (
          <>
            <button
              onClick={onFinishRace}
              className="border-2 border-red-500 text-red-400 px-8 py-2 font-bold hover:bg-red-500 hover:text-blue-950 transition-colors"
            >
              FINISH
            </button>
          </>
        )}
      </div>

      {/* Main Layout: Left (Timers) + Right (Camera) */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Team Timers */}
        <div className="w-96 flex flex-col gap-3 overflow-y-auto">
          <h3 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '0.7rem' }}>
            TIMERS
          </h3>

          <div className="space-y-3">
            {race.timers.map((timer) => (
              <div
                key={timer.team}
                className="border-2 border-cyan-400 bg-blue-950/40 p-4 cursor-pointer hover:bg-cyan-400/10 transition-colors"
                onClick={() => !raceStarted && onSelectTeam(timer.team)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-cyan-300 font-bold">{timer.team}</h4>
                  {timer.finished && (
                    <span className="text-yellow-400 text-xs font-bold">✓ FINISHED</span>
                  )}
                </div>

                <div className="text-4xl font-bold text-cyan-300 font-mono text-center">
                  {formatTime(timer.time)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Camera Feed */}
        <div className="flex-1 flex flex-col gap-3">
          <h3 className="text-white font-bold" style={{ fontFamily: 'Press Start 2P', fontSize: '0.7rem' }}>
            CAMERA FEED
          </h3>

          <div className="flex-1 border-4 border-cyan-400 bg-black flex items-center justify-center relative overflow-hidden">
            {!cameraError ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onError={() => setCameraError(true)}
                  style={{
                    WebkitTransform: 'scaleX(-1)',
                    transform: 'scaleX(-1)',
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <svg className="w-16 h-16 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-cyan-400 text-sm text-center">
                  Camera not available<br />
                  <span className="text-xs text-cyan-600">Connect USB camera to enable</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
