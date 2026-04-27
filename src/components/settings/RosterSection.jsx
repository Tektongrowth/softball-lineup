import { useState } from 'react'
import { GROUP_COLORS } from '../../data/config'

const GROUPS = [
  { id: 'A', label: '3B / LF' },
  { id: 'B', label: 'SS / LC' },
  { id: 'C', label: '2B / RC' },
  { id: 'D', label: '1B / RF' },
]

export function RosterSection({ players, onChange }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState('A')
  const [editing, setEditing] = useState(null) // player id

  const updatePlayer = (id, patch) => {
    onChange(players.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  const addPlayer = () => {
    if (!newName.trim()) return
    onChange([...players, {
      id: newName.trim(),
      group: newGroup || null,
      floater: newGroup === null,
      canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: false,
    }])
    setNewName('')
    setAdding(false)
  }

  const removePlayer = (id) => {
    onChange(players.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 px-1 pb-1">
        Set each player's position group. A player can only be assigned to the infield and outfield positions within their group, unless they're on a pitcher or catcher depth chart.
      </p>

      {players.map(p => {
        const colors = p.group ? GROUP_COLORS[p.group] : null
        const isEditing = editing === p.id

        return (
          <div key={p.id} className="bg-slate-800 rounded-xl overflow-hidden">
            {/* Row */}
            <button
              onClick={() => setEditing(isEditing ? null : p.id)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-slate-700/50 transition-colors"
            >
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colors ? colors.dot : 'bg-slate-500'}`} />
              <span className="text-white font-medium flex-1">{p.id}</span>
              {p.floater && <span className="text-[10px] text-slate-400 bg-slate-700 rounded px-1.5 py-0.5">floater</span>}
              {p.group && <span className={`text-[10px] rounded px-1.5 py-0.5 border ${colors?.label}`}>{GROUPS.find(g => g.id === p.group)?.label}</span>}
              <span className="text-slate-600 text-sm">{isEditing ? '▲' : '▼'}</span>
            </button>

            {/* Expanded editor */}
            {isEditing && (
              <div className="px-3 pb-3 space-y-3 border-t border-slate-700">
                {/* Group selector */}
                <div>
                  <div className="text-xs text-slate-500 mb-2 pt-2">Position Group</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GROUPS.map(g => {
                      const gc = GROUP_COLORS[g.id]
                      return (
                        <button key={g.id}
                          onClick={() => updatePlayer(p.id, { group: g.id, floater: false })}
                          className={`py-1.5 rounded-lg text-xs font-medium border transition-all
                            ${p.group === g.id ? `${gc.bg} ${gc.border} ${gc.text}` : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                        >
                          {g.label}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => updatePlayer(p.id, { group: null, floater: true })}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${p.floater ? 'bg-slate-600 border-slate-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                    >
                      Floater
                    </button>
                  </div>
                </div>

                {/* Battery eligibility */}
                <div>
                  <div className="text-xs text-slate-500 mb-2">Battery eligibility</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'canPitch12', label: 'Pitch inn 1–2' },
                      { key: 'canPitch34', label: 'Pitch inn 3–4' },
                      { key: 'canCatch12', label: 'Catch inn 1–2' },
                      { key: 'canCatch34', label: 'Catch inn 3–4' },
                    ].map(({ key, label }) => (
                      <button key={key}
                        onClick={() => updatePlayer(p.id, { [key]: !p[key] })}
                        className={`py-2 rounded-lg text-xs border transition-all
                          ${p[key] ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                      >
                        {p[key] ? '✓ ' : ''}{label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => removePlayer(p.id)}
                  className="w-full py-2 rounded-lg text-xs text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                >
                  Remove player
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add player */}
      {adding ? (
        <div className="bg-slate-800 rounded-xl p-3 space-y-2">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Player name"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-600 focus:border-blue-500"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {GROUPS.map(g => {
              const gc = GROUP_COLORS[g.id]
              return (
                <button key={g.id}
                  onClick={() => setNewGroup(g.id)}
                  className={`py-1.5 rounded-lg text-xs border transition-all
                    ${newGroup === g.id ? `${gc.bg} ${gc.border} ${gc.text}` : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={addPlayer} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Add</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-slate-600 text-slate-500 text-sm hover:border-slate-400 hover:text-slate-300 transition-colors"
        >
          + Add player
        </button>
      )}
    </div>
  )
}
