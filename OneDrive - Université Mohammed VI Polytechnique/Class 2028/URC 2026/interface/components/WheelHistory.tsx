'use client';

import { useTeams, type WheelHistory } from '@/context/TeamsContext';

export default function WheelHistoryComponent() {
  const { wheelHistory, removeFromWheelHistory } = useTeams();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-blue-950 border-2 border-cyan-400 p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-cyan-300 font-bold mb-4" style={{ fontFamily: 'Press Start 2P', fontSize: '0.75rem' }}>
          WHEEL HISTORY
        </h2>

        {wheelHistory.length === 0 ? (
          <p className="text-cyan-600 text-sm mb-4">No wheels saved yet</p>
        ) : (
          <div className="space-y-4">
            {wheelHistory.map((entry: WheelHistory, idx: number) => (
              <div key={entry.id} className="border-2 border-cyan-400 p-4 bg-blue-900/40">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-yellow-300 text-xs font-bold">WHEEL #{wheelHistory.length - idx}</p>
                    <p className="text-cyan-600 text-xs">{entry.date}</p>
                  </div>
                  <button
                    onClick={() => removeFromWheelHistory(entry.id)}
                    className="border border-red-400 px-3 py-1 text-red-300 text-xs font-bold hover:bg-red-400 hover:text-blue-950 transition-colors"
                  >
                    DELETE
                  </button>
                </div>
                <div className="space-y-1">
                  {entry.order.map((team: string, teamIdx: number) => (
                    <p key={teamIdx} className="text-cyan-300 text-sm">
                      {teamIdx + 1}. {team}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
