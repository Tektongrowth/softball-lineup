import { useState } from 'react'

function resultPill(scoreUs, scoreThem) {
  if (scoreUs == null || scoreThem == null) return null
  if (scoreUs > scoreThem) return { label: 'W', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
  if (scoreUs < scoreThem) return { label: 'L', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
  return { label: 'T', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' }
}

export function GameHistoryModal({ gameHistory, onChange, onClose }) {
  const [editingId, setEditingId] = useState(null)
  const [editUs, setEditUs] = useState('')
  const [editThem, setEditThem] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const totals = gameHistory.reduce((acc, g) => {
    const r = resultPill(g.scoreUs, g.scoreThem)
    if (!r) return acc
    if (r.label === 'W') acc.w++
    else if (r.label === 'L') acc.l++
    else acc.t++
    return acc
  }, { w: 0, l: 0, t: 0 })

  const startEdit = (g) => {
    setEditingId(g.id)
    setEditUs(g.scoreUs ?? '')
    setEditThem(g.scoreThem ?? '')
    setConfirmDelete(null)
  }

  const parseScore = (s) => {
    if (s === '' || s === null || s === undefined) return null
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const saveEdit = () => {
    onChange(gameHistory.map(g => g.id === editingId
      ? { ...g, scoreUs: parseScore(editUs), scoreThem: parseScore(editThem) }
      : g))
    setEditingId(null)
  }

  const deleteGame = (id) => {
    onChange(gameHistory.filter(g => g.id !== id))
    setConfirmDelete(null)
    if (editingId === id) setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="w-full sm:w-[420px] bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <div>
            <div className="font-bold text-white">Game History</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {gameHistory.length === 0
                ? 'No games logged yet'
                : `${gameHistory.length} ${gameHistory.length === 1 ? 'game' : 'games'} · ${totals.w}W ${totals.l}L${totals.t ? ` ${totals.t}T` : ''}`}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {gameHistory.length === 0 && (
            <div className="text-center text-slate-600 text-sm py-8">
              Lock a game to start your history.
            </div>
          )}

          {[...gameHistory].reverse().map(g => {
            const pill = resultPill(g.scoreUs, g.scoreThem)
            const isEditing = editingId === g.id
            const isConfirming = confirmDelete === g.id

            return (
              <div key={g.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-3">
                  {pill ? (
                    <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold ${pill.cls}`}>
                      {pill.label}
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center text-xs text-slate-600">
                      —
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{g.label}</div>
                    <div className="text-xs text-slate-500">{g.date}</div>
                  </div>

                  {!isEditing && (
                    <div className="text-right">
                      {pill ? (
                        <div className="text-white font-bold tabular-nums text-lg leading-none">
                          {g.scoreUs}<span className="text-slate-600 mx-1">–</span>{g.scoreThem}
                        </div>
                      ) : (
                        <div className="text-slate-600 text-xs italic">no score</div>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <button
                      onClick={() => startEdit(g)}
                      className="text-[11px] px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 pt-3">
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-500 mb-1">Us</div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={editUs}
                          onChange={e => setEditUs(e.target.value)}
                          placeholder="—"
                          className="w-full bg-slate-900 text-white text-center text-xl font-bold tabular-nums rounded-lg px-2 py-1.5 border border-slate-700 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <span className="text-slate-600 text-lg pt-5">–</span>
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-500 mb-1">Them</div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={editThem}
                          onChange={e => setEditThem(e.target.value)}
                          placeholder="—"
                          className="w-full bg-slate-900 text-white text-center text-xl font-bold tabular-nums rounded-lg px-2 py-1.5 border border-slate-700 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      {!isConfirming ? (
                        <button
                          onClick={() => setConfirmDelete(g.id)}
                          className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-sm border border-rose-500/30"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteGame(g.id)}
                          className="py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
