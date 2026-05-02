import { useEffect, useRef, useState } from 'react'
import { GROUP_COLORS } from '../data/config'

export function BattingOrder({ order, players, onChange }) {
  const [picking, setPicking] = useState(null) // index of slot being picked

  const setSlot = (i, pid) => {
    const next = [...order]
    next[i] = pid || null
    onChange(next)
  }

  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const removeSlot = (i) => {
    onChange(order.filter((_, idx) => idx !== i))
  }

  const addSlot = () => {
    onChange([...order, null])
  }

  const fillFromRoster = () => {
    const used = new Set(order.filter(Boolean))
    const remaining = players.map(p => p.id).filter(id => !used.has(id))
    const next = order.map(pid => pid)
    for (let i = 0; i < next.length && remaining.length; i++) {
      if (!next[i]) next[i] = remaining.shift()
    }
    while (remaining.length) next.push(remaining.shift())
    onChange(next)
  }

  const clearAll = () => {
    onChange(order.map(() => null))
  }

  const playerById = Object.fromEntries(players.map(p => [p.id, p]))
  const usedCounts = order.reduce((acc, pid) => {
    if (pid) acc[pid] = (acc[pid] || 0) + 1
    return acc
  }, {})
  const missing = players.filter(p => !usedCounts[p.id]).map(p => p.id)

  return (
    <div className="px-3 pt-3 pb-2 max-w-lg mx-auto w-full">
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Batting Order</div>
          <div className="flex items-center gap-1">
            <button
              onClick={fillFromRoster}
              className="text-[11px] px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600"
            >
              Fill from roster
            </button>
            <button
              onClick={clearAll}
              className="text-[11px] px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {order.map((pid, i) => {
            const player = pid ? playerById[pid] : null
            const colors = player?.group ? GROUP_COLORS[player.group] : null
            const dup = pid && usedCounts[pid] > 1
            const missingPlayer = pid && !player
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <span className="w-6 text-center text-sm font-bold text-slate-500 tabular-nums">{i + 1}</span>
                <button
                  onClick={() => setPicking(i)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
                    ${player
                      ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                      : 'bg-slate-800/40 hover:bg-slate-800 border border-dashed border-slate-700'}`}
                >
                  {player ? (
                    <>
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors ? colors.dot : 'bg-slate-500'}`} />
                      <span className="text-white text-sm font-medium flex-1">{player.id}</span>
                      {dup && <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-1.5 py-0.5">duplicate</span>}
                    </>
                  ) : missingPlayer ? (
                    <>
                      <span className="text-rose-400 text-sm flex-1">{pid} (not on roster)</span>
                    </>
                  ) : (
                    <span className="text-slate-500 text-sm flex-1">— pick a batter —</span>
                  )}
                </button>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:hover:text-slate-500 text-xs leading-none w-6 h-4 flex items-center justify-center"
                  >▲</button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1}
                    className="text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:hover:text-slate-500 text-xs leading-none w-6 h-4 flex items-center justify-center"
                  >▼</button>
                </div>
                <button
                  onClick={() => removeSlot(i)}
                  className="text-slate-600 hover:text-rose-400 text-lg leading-none w-6 h-6 flex items-center justify-center"
                  title="Remove slot"
                >×</button>
              </div>
            )
          })}
        </div>

        <button
          onClick={addSlot}
          className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors border-t border-slate-800"
        >
          + Add slot
        </button>
      </div>

      {missing.length > 0 && (
        <div className="mt-3 bg-slate-900 rounded-xl border border-slate-800 p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Not in batting order</div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map(id => (
              <span key={id} className="text-xs text-slate-400 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">{id}</span>
            ))}
          </div>
        </div>
      )}

      {picking !== null && (
        <BatterPicker
          slot={picking + 1}
          current={order[picking]}
          players={players}
          usedCounts={usedCounts}
          onSelect={(pid) => setSlot(picking, pid)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}

function BatterPicker({ slot, current, players, usedCounts, onSelect, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75"
      onClick={(e) => { if (e.target === ref.current) onClose() }}
    >
      <div className="w-full sm:w-96 bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[75vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between bg-slate-800 border-b border-slate-700">
          <div className="font-bold text-white">Batter #{slot}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 py-1">
          <button
            onClick={() => { onSelect(null); onClose() }}
            className="w-full text-left px-4 py-3 text-slate-500 hover:bg-slate-800 text-sm border-b border-slate-800"
          >
            — Clear slot —
          </button>

          {players.map(p => {
            const colors = p.group ? GROUP_COLORS[p.group] : null
            const selected = current === p.id
            const alreadyBatting = !selected && (usedCounts[p.id] || 0) > 0
            return (
              <button
                key={p.id}
                onClick={() => { onSelect(p.id); onClose() }}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-800 transition-colors ${selected ? 'bg-slate-700' : ''}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors ? colors.dot : 'bg-slate-500'}`} />
                <span className="text-white font-medium flex-1">{p.id}</span>
                {p.floater && <span className="text-[10px] text-slate-400 bg-slate-700 rounded px-1.5 py-0.5">floater</span>}
                {selected && <span className="text-emerald-400 text-xs">✓</span>}
                {alreadyBatting && <span className="text-[10px] text-amber-400">already batting</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
