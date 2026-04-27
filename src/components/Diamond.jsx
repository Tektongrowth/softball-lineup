import { useState } from 'react'
import { FIELD_COORDS, ALL_POSITIONS } from '../data/config'
import { PositionChip } from './PositionChip'
import { PlayerPicker } from './PlayerPicker'

// Positions that are locked in innings 3-4 (infield only)
const INFIELD = new Set(['3B', 'SS', '2B', '1B'])

export function Diamond({ inningKey, lineup, players, depthCharts, rules, violations, onUpdate, team3Locks }) {
  const [picking, setPicking] = useState(null) // position string

  const errorPositions = new Set(violations.filter(v => v.severity === 'error' && v.pos && v.inning === inningKey).map(v => v.pos))
  const warnPositions  = new Set(violations.filter(v => v.severity === 'warning' && v.pos && v.inning === inningKey).map(v => v.pos))

  const isLocked = (pos) =>
    team3Locks &&
    INFIELD.has(pos) &&
    (inningKey === 'inn3' || inningKey === 'inn4') &&
    rules.find(r => r.id === 'team3-lock')?.enabled

  return (
    <div className="relative w-full select-none" style={{ paddingBottom: '108%' }}>
      {/* Field SVG background */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Sky / outfield background */}
        <defs>
          <radialGradient id="fieldGrad" cx="50%" cy="85%" r="85%">
            <stop offset="0%" stopColor="#14532d" />
            <stop offset="60%" stopColor="#166534" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
          <radialGradient id="infield" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#92400e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Green field */}
        <rect width="100" height="100" fill="url(#fieldGrad)" />

        {/* Outfield fence arc */}
        <path d="M 5,50 Q 50,3 95,50" stroke="white" strokeWidth="0.6" fill="none" strokeOpacity="0.25" />

        {/* Foul lines */}
        <line x1="50" y1="92" x2="5" y2="50" stroke="white" strokeWidth="0.4" strokeOpacity="0.2" />
        <line x1="50" y1="92" x2="95" y2="50" stroke="white" strokeWidth="0.4" strokeOpacity="0.2" />

        {/* Infield dirt circle */}
        <ellipse cx="50" cy="67" rx="25" ry="22" fill="url(#infield)" />

        {/* Base paths (diamond) */}
        <polygon
          points="50,90 74,67 50,44 26,67"
          stroke="white" strokeWidth="0.5" fill="none" strokeOpacity="0.35"
        />

        {/* Bases */}
        <rect x="48.5" y="88.5" width="3" height="3" fill="white" fillOpacity="0.6"
          transform="rotate(45 50 90)" rx="0.3" />
        <rect x="72.5" y="65.5" width="3" height="3" fill="white" fillOpacity="0.5" rx="0.3" />
        <rect x="48.5" y="42.5" width="3" height="3" fill="white" fillOpacity="0.5" rx="0.3" />
        <rect x="24.5" y="65.5" width="3" height="3" fill="white" fillOpacity="0.5" rx="0.3" />

        {/* Pitcher's mound */}
        <circle cx="50" cy="70" r="2.5" fill="#92400e" fillOpacity="0.6" stroke="white" strokeWidth="0.3" strokeOpacity="0.3" />

        {/* Grass stripe pattern (subtle) */}
        {[...Array(6)].map((_, i) => (
          <line key={i}
            x1={10 + i * 14} y1="3" x2={10 + i * 14} y2="97"
            stroke="white" strokeWidth="0.15" strokeOpacity="0.04"
          />
        ))}
      </svg>

      {/* Position chips */}
      {ALL_POSITIONS.map(pos => {
        const coord = FIELD_COORDS[pos]
        const player = lineup[pos] || null
        const locked = isLocked(pos)

        return (
          <div
            key={pos}
            className="absolute"
            style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
          >
            <PositionChip
              pos={pos}
              player={player}
              hasError={errorPositions.has(pos)}
              hasWarning={warnPositions.has(pos)}
              locked={locked}
              onClick={() => setPicking(pos)}
            />
          </div>
        )
      })}

      {/* Player picker modal */}
      {picking && (
        <PlayerPicker
          pos={picking}
          inningKey={inningKey}
          currentLineup={lineup}
          players={players}
          depthCharts={depthCharts}
          rules={rules}
          onSelect={(player) => onUpdate(picking, player)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
