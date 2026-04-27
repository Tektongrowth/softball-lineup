import { useState } from 'react'
import { POSITION_GROUPS, GROUP_COLORS, POS_COLOR_KEY, PLAYERS, PLAYER_MAP, TEAM3_LOCKS } from '../data/config'
import { PlayerPicker } from './PlayerPicker'

const PAIR_ORDER = ['A', 'B', 'C', 'D']

function PositionCell({ pos, player, inningKey, lineup, locked, hasViolation, onClick }) {
  const colorKey = POS_COLOR_KEY[pos] || 'A'
  const colors = GROUP_COLORS[colorKey]
  const pd = player ? PLAYER_MAP[player] : null

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border transition-all text-left w-full
        ${player ? `${colors.bg} ${colors.ring} ring-1` : 'bg-slate-800/50 border-slate-700 border-dashed'}
        ${hasViolation ? 'ring-2 ring-rose-500' : ''}
        ${locked ? 'cursor-default opacity-80' : 'hover:opacity-90 active:scale-95'}`}
      disabled={locked}
    >
      <span className="text-slate-500 text-[10px] font-mono w-5 flex-shrink-0">{pos}</span>
      <span className={`font-semibold text-sm flex-1 ${player ? colors.text : 'text-slate-600'}`}>
        {player || '—'}
      </span>
      {locked && <span className="text-slate-600 text-[10px]">🔒</span>}
      {hasViolation && <span className="text-rose-400 text-[10px]">!</span>}
    </button>
  )
}

export function TeamCard({ label, inningKey, lineup, violations, onUpdate, bench }) {
  const [picker, setPicker] = useState(null)

  const violationSet = new Set(
    violations
      .filter(v => v.inning === inningKey && v.pos)
      .map(v => v.pos)
  )
  const inningViolations = violations.filter(v => v.inning === inningKey)

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-bold text-white text-sm tracking-wide">{label}</h2>
        {inningViolations.length > 0 && (
          <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full px-2 py-0.5">
            {inningViolations.length} issue{inningViolations.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Battery row */}
        <div className="grid grid-cols-2 gap-2">
          <PositionCell pos="P" player={lineup.P} inningKey={inningKey} lineup={lineup}
            hasViolation={violationSet.has('P')}
            onClick={() => setPicker('P')} />
          <PositionCell pos="C" player={lineup.C} inningKey={inningKey} lineup={lineup}
            hasViolation={violationSet.has('C')}
            onClick={() => setPicker('C')} />
        </div>

        {/* Paired group rows */}
        {PAIR_ORDER.map(groupId => {
          const group = POSITION_GROUPS[groupId]
          const colors = GROUP_COLORS[groupId]
          return (
            <div key={groupId} className={`grid grid-cols-2 gap-2 p-1.5 rounded-xl ${colors.bg}`}>
              <PositionCell
                pos={group.infield} player={lineup[group.infield]}
                inningKey={inningKey} lineup={lineup}
                hasViolation={violationSet.has(group.infield)}
                onClick={() => setPicker(group.infield)}
              />
              <PositionCell
                pos={group.outfield} player={lineup[group.outfield]}
                inningKey={inningKey} lineup={lineup}
                hasViolation={violationSet.has(group.outfield)}
                onClick={() => setPicker(group.outfield)}
              />
            </div>
          )
        })}

        {/* Bench */}
        {bench && bench.length > 0 && (
          <div className="pt-1 border-t border-slate-800">
            <div className="text-xs text-slate-500 mb-1 px-1">Bench</div>
            <div className="flex flex-wrap gap-1">
              {bench.map(p => (
                <span key={p} className="text-xs bg-slate-800 text-slate-400 rounded px-1.5 py-0.5">{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Violations for this inning */}
      {inningViolations.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {inningViolations.map((v, i) => (
            <div key={i} className={`text-xs px-2 py-1.5 rounded ${
              v.severity === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
              'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}>
              {v.message}
            </div>
          ))}
        </div>
      )}

      {picker && (
        <PlayerPicker
          pos={picker}
          inningKey={inningKey}
          currentLineup={lineup}
          onSelect={(player) => onUpdate(picker, player)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
