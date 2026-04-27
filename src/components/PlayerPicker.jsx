import { useEffect, useRef } from 'react'
import { GROUP_COLORS, POS_TO_GROUP } from '../data/config'

function getEligibility(player, pos, currentLineup, depthCharts, rules) {
  const enabled = new Set(rules.filter(r => r.enabled).map(r => r.id))
  const inningKey = currentLineup.__inningKey
  const occupied = new Set(
    Object.entries(currentLineup)
      .filter(([p]) => p !== pos && p !== '__inningKey')
      .map(([, v]) => v)
      .filter(Boolean)
  )

  let eligible = true
  let note = null

  if (pos === 'P') {
    const chart = inningKey === 'inn1' || inningKey === 'inn2' ? depthCharts.P12 : depthCharts.P34
    if (enabled.has(inningKey === 'inn1' || inningKey === 'inn2' ? 'pitcher-12' : 'pitcher-34')) {
      if (!(chart || []).includes(player.id)) { eligible = false; note = 'Not in pitcher depth chart' }
    }
  } else if (pos === 'C') {
    const chart = inningKey === 'inn1' || inningKey === 'inn2' ? depthCharts.C12 : depthCharts.C34
    if (enabled.has('catcher-12') && (inningKey === 'inn1' || inningKey === 'inn2')) {
      if (!(chart || []).includes(player.id)) { eligible = false; note = 'Not in C 1–2 depth chart' }
    }
  } else if (enabled.has('group-constraint')) {
    const posGroup = POS_TO_GROUP[pos]
    if (!player.floater && player.group !== posGroup) {
      eligible = false
      note = `Wrong group (${player.group || 'none'})`
    }
  }

  return { eligible, note, alreadyPlaying: occupied.has(player.id) }
}

export function PlayerPicker({ pos, inningKey, currentLineup, players, depthCharts, rules, onSelect, onClose }) {
  const ref = useRef()
  const lineupWithKey = { ...currentLineup, __inningKey: inningKey }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const eligible = []
  const ineligible = []

  for (const player of players) {
    const { eligible: ok, note, alreadyPlaying } = getEligibility(player, pos, lineupWithKey, depthCharts, rules)
    const entry = { ...player, note, alreadyPlaying }
    if (ok) eligible.push(entry)
    else ineligible.push(entry)
  }

  const current = currentLineup[pos]

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75"
      onClick={(e) => { if (e.target === ref.current) onClose() }}
    >
      <div className="w-full sm:w-96 bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[75vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between bg-slate-800 border-b border-slate-700">
          <div className="font-bold text-white">{pos}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 py-1">
          <button
            onClick={() => { onSelect(null); onClose() }}
            className="w-full text-left px-4 py-3 text-slate-500 hover:bg-slate-800 text-sm border-b border-slate-800"
          >
            — Clear position —
          </button>

          {eligible.length > 0 && (
            <div className="px-4 pt-2 pb-1 text-[10px] text-slate-500 uppercase tracking-widest">Valid players</div>
          )}
          {eligible.map(p => (
            <PlayerRow key={p.id} player={p} selected={current === p.id} onSelect={() => { onSelect(p.id); onClose() }} />
          ))}

          {ineligible.length > 0 && (
            <div className="px-4 pt-3 pb-1 text-[10px] text-slate-500 uppercase tracking-widest border-t border-slate-800 mt-1">
              Override (out of group)
            </div>
          )}
          {ineligible.map(p => (
            <PlayerRow key={p.id} player={p} selected={current === p.id} dimmed onSelect={() => { onSelect(p.id); onClose() }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PlayerRow({ player, selected, dimmed, onSelect }) {
  const colors = player.group ? GROUP_COLORS[player.group] : null

  return (
    <button
      onClick={onSelect}
      className={[
        'w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-800 transition-colors',
        selected ? 'bg-slate-700' : '',
        dimmed && !selected ? 'opacity-40' : '',
      ].join(' ')}
    >
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors ? colors.dot : 'bg-slate-500'}`} />
      <span className="text-white font-medium flex-1">{player.id}</span>
      {player.floater && <span className="text-[10px] text-slate-400 bg-slate-700 rounded px-1.5 py-0.5">floater</span>}
      {selected && <span className="text-emerald-400 text-xs">✓</span>}
      {player.note && !selected && <span className="text-[10px] text-rose-400">{player.note}</span>}
      {player.alreadyPlaying && !selected && <span className="text-[10px] text-amber-400">on field</span>}
    </button>
  )
}
