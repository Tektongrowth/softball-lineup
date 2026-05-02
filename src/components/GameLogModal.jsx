import { useState } from 'react'
import { calcBalance } from '../engine/autoAssign'
import { gameTitle } from '../data/gameUtils'

function fmt(n) {
  if (n === null || n === undefined) return ''
  const s = n.toFixed(1)
  return n > 0 ? `+${s}` : s
}

export function GameLogModal({ game, players, counts, gameHistory, onFinish, onClose }) {
  // What the balance will be AFTER this game is logged
  const allGames  = [...gameHistory, { counts }]
  const newBal    = calcBalance(players, allGames)

  const [scoreUs,   setScoreUs]   = useState('')
  const [scoreThem, setScoreThem] = useState('')

  const parseScore = (s) => {
    if (s === '' || s === null || s === undefined) return null
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  // Cumulative innings including this game
  const cumulative = {}
  for (const p of players) {
    cumulative[p.id] = gameHistory.reduce((s, g) => s + (g.counts[p.id] || 0), 0) + (counts[p.id] || 0)
  }

  const submit = () => {
    onFinish({ scoreUs: parseScore(scoreUs), scoreThem: parseScore(scoreThem) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="w-full sm:w-[420px] bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <div>
            <div className="font-bold text-white">Finish Game</div>
            <div className="text-xs text-slate-500 mt-0.5">{gameTitle(game) || 'Save score and move to history'}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Final score</div>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <div className="text-[10px] text-slate-500 mb-1">Us</div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={scoreUs}
                onChange={e => setScoreUs(e.target.value)}
                placeholder="—"
                className="w-full bg-slate-800 text-white text-center text-2xl font-bold tabular-nums rounded-lg px-2 py-2 border border-slate-700 focus:border-blue-500 outline-none"
              />
            </div>
            <span className="text-slate-600 text-xl pt-5">–</span>
            <div className="flex-1">
              <div className="text-[10px] text-slate-500 mb-1">{game?.opponent || 'Them'}</div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={scoreThem}
                onChange={e => setScoreThem(e.target.value)}
                placeholder="—"
                className="w-full bg-slate-800 text-white text-center text-2xl font-bold tabular-nums rounded-lg px-2 py-2 border border-slate-700 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">This game</div>
          <div className="space-y-1 mb-4">
            {players.map(p => {
              const n   = counts[p.id] ?? 0
              const bal = newBal[p.id] ?? 0
              const cum = cumulative[p.id] ?? 0
              return (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-800 rounded-lg">
                  <span className="text-white text-sm flex-1">{p.id}</span>
                  <span className={`text-sm font-bold tabular-nums w-4 text-center ${
                    n === 0 ? 'text-slate-600'
                    : n < 2 ? 'text-amber-400'
                    : n >= 4 ? 'text-emerald-400'
                    : 'text-slate-300'
                  }`}>{n}</span>
                  <span className="text-xs text-slate-500 tabular-nums w-10 text-right">{cum} tot</span>
                  <span className={`text-xs tabular-nums w-12 text-right font-medium ${
                    bal > 0.8 ? 'text-amber-400'
                    : bal < -0.8 ? 'text-sky-400'
                    : 'text-slate-500'
                  }`}>{fmt(bal)}</span>
                </div>
              )
            })}
          </div>

          <div className="text-xs text-slate-600 space-y-0.5 border-t border-slate-800 pt-3">
            <div><span className="text-amber-400">+X.X</span> = over-played · engine reduces innings next game</div>
            <div><span className="text-sky-400">−X.X</span> = under-played · engine boosts innings next game</div>
          </div>
        </div>

        <div className="flex-shrink-0 p-4 border-t border-slate-800 flex gap-2">
          <button
            onClick={submit}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Save & Finish Game
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
