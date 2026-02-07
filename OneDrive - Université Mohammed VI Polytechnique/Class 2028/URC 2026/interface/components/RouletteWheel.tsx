'use client';

import { useState, useEffect } from 'react';
import { Wheel } from 'react-custom-roulette';

interface RouletteWheelProps {
  teams: string[];
  onSelect: (team: string) => void;
  mustSpin: boolean;
}

export default function RouletteWheel({ teams, onSelect, mustSpin }: RouletteWheelProps) {
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [spinning, setSpinning] = useState(false);

  // Color palette with distinct alternating colors
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
    '#C7B3E5', '#FFB4B4', '#A0D8F7', '#FFD93D',
    '#6BCB77', '#FF6B9D', '#A8E6CF', '#FFD3B6'
  ];

  // Convert teams to wheel data format
  const wheelData = teams.map((team, index) => ({
    option: team,
    style: { fontSize: 14 }
  }));

  // Generate alternating colors for wheel
  const backgroundColors = teams.map((_, index) => colors[index % colors.length]);

  useEffect(() => {
    if (mustSpin && teams.length > 0) {
      const newPrizeNumber = Math.floor(Math.random() * teams.length);
      setPrizeNumber(newPrizeNumber);
      setSpinning(true);
    }
  }, [mustSpin, teams.length]);

  const handleSpinEnd = () => {
    if (teams.length > 0) {
      const selectedTeam = teams[prizeNumber];
      onSelect(selectedTeam);
    }
    setSpinning(false);
  };

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center w-80 h-80 border-4 border-cyan-400 text-cyan-300">
        No teams remaining
      </div>
    );
  }

  return (
    <div className="relative flex justify-center">
      {/* Wheel */}
      <Wheel
        mustStartSpinning={spinning}
        prizeNumber={prizeNumber}
        data={wheelData}
        backgroundColors={backgroundColors}
        textColors={['#000000']}
        outerBorderColor="#00D9FF"
        outerBorderWidth={4}
        onStopSpinning={handleSpinEnd}
        radiusLineWidth={2}
        fontSize={16}
        style={{ width: '400px', height: '400px' }}
        spinDuration={0.5}
      />
    </div>
  );
}
