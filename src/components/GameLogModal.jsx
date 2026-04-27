import { calcBalance } from '../engine/autoAssign'

function fmt(n) {
  if (n === null || n === undefined) return ''
  const s = n.toFixed(1)
  return n > 0 ? `+${s}` : s
}

export function GameLogModal({ players, counts, gameHistory, onLock, onClose }) {
  const gameNum   = gameHistory.length + 1
  const prevBal   = calcBalance(players, gameHistory)
  // What the balance will be AFTER this game is logged
  const allGames  = [...gameHistory, { counts }]
  const newBal    = calcBalance(players, allGames)

  // Cumulative innings including this game
  const cumulative = {}
  for (const p of players) {
    cumulative[p.id] = gameHistory.reduce((s, g) => s + (g.counts[p.id] || 0), 0) + (counts[p.id] || 0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="w-full sm:w-[420px] bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <div>
            <div className="font-bold text-white">Lock Game {gameNum}</div>
            <div className="text-xs text-slate-500 mt-0.5">Save innings and update carry-over balance</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        {/* Player table */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">This game</div>
          <div className="space-y-1 mb-4">
            {players.map(p => {
              const n   = counts[p.id] ?? 0
              const bal = newBal[p.id] ?? 0
              const cum = cumulative[p.id] ?? 0
              return (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-800 rounded-lg">
                  <span className="text-white text-sm flex-1">{p.id}</span>

                  {/* This game innings */}
                  <span className={`text-sm font-bold tabular-nums w-4 text-center ${
                    n === 0 ? 'text-slate-600'
                    : n < 2 ? 'text-amber-400'
                    : n >= 4 ? 'text-emerald-400'
                    : 'text-slate-300'
                  }`}>{n}</span>

                  {/* Cumulative */}
                  <span className="text-xs text-slate-500 tabular-nums w-10 text-right">{cum} tot</span>

                  {/* Balance after this game — shows how much they'll be owed/over next game */}
                  <span className={`text-xs tabular-nums w-12 text-right font-medium ${
                    bal > 0.8 ? 'text-amber-400'
                    : bal < -0.8 ? 'text-sky-400'
                    : 'text-slate-500'
                  }`}>{fmt(bal)}</span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="text-xs text-slate-600 space-y-0.5 border-t border-slate-800 pt-3">
            <div><span className="text-amber-400">+X.X</span> = over-played · engine reduces innings next game</div>
            <div><span className="text-sky-400">−X.X</span> = under-played · engine boosts innings next game</div>
          </div>

          {/* Previous games */}
          {gameHistory.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">History</div>
              <div className="space-y-1">
                {[...gameHistory].reverse().slice(0, 4).map((g, i) => (
                  <div key={g.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-slate-500 flex-1">{g.label}</span>
                    <span className="text-xs text-slate-600">{g.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => onLock({ clear: true })}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Lock & Start Next Game
          </button>
          <button
            onClick={() => onLock({ clear: false })}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
          >
            Lock Only (keep current lineup)
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-600 text-sm hover:text-slate-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
