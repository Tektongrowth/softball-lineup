import { useState } from 'react'
import { POSITION_GROUPS, GROUP_COLORS, POS_COLOR_KEY, PLAYER_MAP, TEAM3_LOCKS } from '../data/config'
import { PlayerPicker } from './PlayerPicker'

const PAIR_ORDER = ['A', 'B', 'C', 'D']

function PositionCell({ pos, player, inningKey, lineup, locked, hasViolation, onClick }) {
  const colorKey = POS_COLOR_KEY[pos] || 'A'
  const colors = GROUP_COLORS[colorKey]

  return (
    <button
      onClick={locked ? undefined : onClick}
      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border transition-all text-left w-full
        ${player ? `${colors.bg} ${colors.ring} ring-1` : 'bg-slate-800/50 border-slate-700 border-dashed'}
        ${hasViolation ? 'ring-2 ring-rose-500' : ''}
        ${locked ? 'cursor-default' : 'hover:opacity-90 active:scale-95'}`}
    >
      <span className="text-slate-500 text-[10px] font-mono w-5 flex-shrink-0">{pos}</span>
      <span className={`font-semibold text-sm flex-1 ${player ? colors.text : 'text-slate-600'}`}>
        {player || '—'}
      </span>
      {locked && <span className="text-slate-500 text-[10px]">🔒</span>}
      {hasViolation && !locked && <span className="text-rose-400 text-[10px]">!</span>}
    </button>
  )
}

function OFSection({ label, inningKey, lineup, violations, onUpdate }) {
  const [picker, setPicker] = useState(null)
  const violationSet = new Set(
    violations.filter(v => v.inning === inningKey && v.pos).map(v => v.pos)
  )
  const ofPositions = ['LF', 'LC', 'RC', 'RF']

  return (
    <div className="rounded-xl bg-slate-800/40 p-2 space-y-1.5">
      <div className="text-xs text-slate-500 uppercase tracking-wider px-1">{label}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {ofPositions.map(pos => {
          const groupId = { LF: 'A', LC: 'B', RC: 'C', RF: 'D' }[pos]
          const colors = GROUP_COLORS[groupId]
          const player = lineup[pos]
          return (
            <button
              key={pos}
              onClick={() => setPicker(pos)}
              className={`flex items-center gap-1.5 px-2 py-2 rounded-lg ring-1 transition-all text-left w-full
                ${player ? `${colors.bg} ${colors.ring}` : 'bg-slate-800/50 border-slate-700 border border-dashed ring-0'}
                ${violationSet.has(pos) ? 'ring-2 ring-rose-500' : ''}
                hover:opacity-90 active:scale-95`}
            >
              <span className="text-slate-500 text-[10px] font-mono w-5 flex-shrink-0">{pos}</span>
              <span className={`font-semibold text-sm flex-1 ${player ? colors.text : 'text-slate-600'}`}>
                {player || '—'}
              </span>
            </button>
          )
        })}
      </div>
      {picker && (
        <PlayerPicker
          pos={picker}
          inningKey={inningKey}
          currentLineup={lineup}
          onSelect={(player) => { onUpdate(inningKey, picker, player); setPicker(null) }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

export function Team3Card({ inn3, inn4, violations, onUpdate, bench3, bench4 }) {
  const [picker, setPicker] = useState(null) // { pos, inningKey }

  const sharedViolations = violations.filter(v => v.inning === 'inn3' || v.inning === 'inn4')
  const violationSet3 = new Set(violations.filter(v => v.inning === 'inn3' && v.pos).map(v => v.pos))
  const violationSet4 = new Set(violations.filter(v => v.inning === 'inn4' && v.pos).map(v => v.pos))

  // P and C are shared across inn3/inn4 — show once, update both
  const updateBattery = (pos, player) => {
    onUpdate('inn3', pos, player)
    onUpdate('inn4', pos, player)
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-bold text-white text-sm tracking-wide">Team 3 — Innings 3 & 4</h2>
        {sharedViolations.length > 0 && (
          <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full px-2 py-0.5">
            {sharedViolations.length} issue{sharedViolations.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Battery — shared across both innings */}
        <div className="grid grid-cols-2 gap-2">
          {['P', 'C'].map(pos => {
            const colors = GROUP_COLORS[pos === 'P' ? 'P' : 'C_']
            const player = inn3[pos]
            const hasViolation = violationSet3.has(pos) || violationSet4.has(pos)
            return (
              <button key={pos}
                onClick={() => setPicker({ pos, inningKey: 'inn3' })}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg ring-1 transition-all text-left w-full
                  ${player ? `${colors.bg} ${colors.ring}` : 'bg-slate-800/50 ring-slate-700 ring-1'}
                  ${hasViolation ? 'ring-2 ring-rose-500' : ''}
                  hover:opacity-90 active:scale-95`}
              >
                <span className="text-slate-500 text-[10px] font-mono w-5 flex-shrink-0">{pos}</span>
                <span className={`font-semibold text-sm flex-1 ${player ? colors.text : 'text-slate-600'}`}>
                  {player || '—'}
                </span>
                <span className="text-slate-600 text-[10px]">3&4</span>
              </button>
            )
          })}
        </div>

        {/* Locked infield — same both innings */}
        <div className="rounded-xl bg-slate-800/30 p-2 space-y-1.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider px-1">Locked Infield (Innings 3 & 4)</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PAIR_ORDER.map(groupId => {
              const group = POSITION_GROUPS[groupId]
              const pos = group.infield
              const locked = TEAM3_LOCKS[pos]
              const colors = GROUP_COLORS[groupId]
              return (
                <div key={pos} className={`flex items-center gap-1.5 px-2 py-2 rounded-lg ${colors.bg} ${colors.ring} ring-1`}>
                  <span className="text-slate-500 text-[10px] font-mono w-5 flex-shrink-0">{pos}</span>
                  <span className={`font-semibold text-sm flex-1 ${colors.text}`}>{locked}</span>
                  <span className="text-slate-500 text-[10px]">🔒</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Outfield — different per inning */}
        <OFSection
          label="Inning 3 Outfield"
          inningKey="inn3"
          lineup={inn3}
          violations={violations}
          onUpdate={(inningKey, pos, player) => onUpdate(inningKey, pos, player)}
        />
        <OFSection
          label="Inning 4 Outfield"
          inningKey="inn4"
          lineup={inn4}
          violations={violations}
          onUpdate={(inningKey, pos, player) => onUpdate(inningKey, pos, player)}
        />

        {/* Bench */}
        {(bench3?.length > 0 || bench4?.length > 0) && (
          <div className="pt-1 border-t border-slate-800 grid grid-cols-2 gap-2">
            {[{ label: 'Inn 3 Bench', bench: bench3 }, { label: 'Inn 4 Bench', bench: bench4 }].map(({ label, bench }) => (
              bench?.length > 0 && (
                <div key={label}>
                  <div className="text-xs text-slate-500 mb-1 px-1">{label}</div>
                  <div className="flex flex-wrap gap-1">
                    {bench.map(p => (
                      <span key={p} className="text-xs bg-slate-800 text-slate-400 rounded px-1.5 py-0.5">{p}</span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Violations */}
      {sharedViolations.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {sharedViolations.map((v, i) => (
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
          pos={picker.pos}
          inningKey={picker.inningKey}
          currentLineup={inn3}
          onSelect={(player) => { updateBattery(picker.pos, player); setPicker(null) }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
