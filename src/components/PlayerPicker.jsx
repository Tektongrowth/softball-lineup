import { useEffect, useRef } from 'react'
import { PLAYERS, PLAYER_MAP, POS_TO_GROUP, GROUP_COLORS, POS_COLOR_KEY,
  PITCHER_DEPTH_12, PITCHER_DEPTH_34, CATCHER_DEPTH_12, CATCHER_DEPTH_34 } from '../data/config'

function getEligibility(playerId, pos, inningKey, currentLineup) {
  const pd = PLAYER_MAP[playerId]
  const occupied = new Set(
    Object.entries(currentLineup)
      .filter(([p]) => p !== pos)
      .map(([, v]) => v)
      .filter(Boolean)
  )

  let eligible = true
  let note = null

  if (pos === 'P') {
    const validPool = (inningKey === 'inn1' || inningKey === 'inn2') ? PITCHER_DEPTH_12 : PITCHER_DEPTH_34
    if (!validPool.includes(playerId)) { eligible = false; note = 'Not in pitcher depth chart' }
  } else if (pos === 'C') {
    const validPool = (inningKey === 'inn1' || inningKey === 'inn2') ? CATCHER_DEPTH_12 : CATCHER_DEPTH_34
    if (!validPool.includes(playerId)) { eligible = false; note = 'Not in catcher depth chart' }
  } else {
    const posGroup = POS_TO_GROUP[pos]
    if (!pd.floater && pd.group !== posGroup) {
      eligible = false
      note = `Wrong group (Group ${pd.group})`
    }
  }

  return { eligible, note, alreadyPlaying: occupied.has(playerId) }
}

export function PlayerPicker({ pos, inningKey, currentLineup, onSelect, onClose }) {
  const overlayRef = useRef()
  const colorKey = POS_COLOR_KEY[pos] || 'A'
  const colors = GROUP_COLORS[colorKey]

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const eligible = []
  const ineligible = []
  const current = currentLineup[pos]

  for (const player of PLAYERS) {
    const { eligible: ok, note, alreadyPlaying } = getEligibility(player.id, pos, inningKey, currentLineup)
    const item = { ...player, note, alreadyPlaying }
    if (ok) eligible.push(item)
    else ineligible.push(item)
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full sm:w-96 bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 overflow-hidden max-h-[80vh] flex flex-col">
        <div className={`px-4 py-3 flex items-center justify-between ${colors.header}`}>
          <span className="font-bold text-sm tracking-widest uppercase">{pos}</span>
          <button onClick={onClose} className="text-current opacity-60 hover:opacity-100 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 py-2">
          {/* Clear option */}
          <button
            onClick={() => { onSelect(null); onClose() }}
            className="w-full text-left px-4 py-2.5 text-slate-400 hover:bg-slate-800 text-sm"
          >
            — Clear position —
          </button>

          {eligible.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-xs text-slate-500 uppercase tracking-wider">Valid</div>
          )}
          {eligible.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              selected={current === player.id}
              dimmed={player.alreadyPlaying}
              onSelect={() => { onSelect(player.id); onClose() }}
            />
          ))}

          {ineligible.length > 0 && (
            <div className="px-3 pt-3 pb-1 text-xs text-slate-500 uppercase tracking-wider border-t border-slate-800 mt-2">
              Out of group (override allowed)
            </div>
          )}
          {ineligible.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              selected={current === player.id}
              dimmed={true}
              note={player.note}
              onSelect={() => { onSelect(player.id); onClose() }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PlayerRow({ player, selected, dimmed, note, onSelect }) {
  const pd = PLAYER_MAP[player.id]
  const groupColor = pd.group ? GROUP_COLORS[pd.group] : null

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-800 transition-colors
        ${selected ? 'bg-slate-700' : ''}
        ${dimmed && !selected ? 'opacity-40' : ''}`}
    >
      {groupColor && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${groupColor.dot}`} />}
      {!groupColor && <span className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-500" />}
      <span className="text-white font-medium flex-1">{player.id}</span>
      {selected && <span className="text-emerald-400 text-xs">✓ current</span>}
      {note && !selected && <span className="text-xs text-rose-400">{note}</span>}
      {player.alreadyPlaying && !selected && <span className="text-xs text-amber-400">already on field</span>}
    </button>
  )
}
