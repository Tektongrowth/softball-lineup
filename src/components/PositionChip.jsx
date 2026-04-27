import { GROUP_COLORS, POS_COLOR_KEY } from '../data/config'

export function PositionChip({ pos, player, hasError, hasWarning, onClick, locked }) {
  const colorKey = POS_COLOR_KEY[pos] || 'A'
  const c = GROUP_COLORS[colorKey]
  const empty = !player

  return (
    <button
      onClick={locked ? undefined : onClick}
      className={[
        'absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 group',
        locked ? 'cursor-default' : 'cursor-pointer',
      ].join(' ')}
      style={{ minWidth: 56 }}
    >
      {/* Chip */}
      <div className={[
        'px-2 py-1 rounded-lg border text-center transition-all',
        'shadow-lg shadow-black/40',
        empty
          ? 'bg-black/40 border-white/10 border-dashed'
          : `${c.bg} ${c.border} border`,
        !locked && !empty ? 'group-hover:scale-105 group-active:scale-95' : '',
        hasError ? 'ring-2 ring-rose-500' : '',
        hasWarning && !hasError ? 'ring-1 ring-amber-400/70' : '',
      ].join(' ')}>
        <div className={`text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5 ${empty ? 'text-white/20' : c.text}`}>
          {pos}
        </div>
        <div className={`text-xs font-semibold leading-tight whitespace-nowrap ${empty ? 'text-white/25' : 'text-white'}`}>
          {player || '—'}
        </div>
      </div>

      {/* Lock indicator */}
      {locked && (
        <div className="text-[8px] text-white/30 leading-none">🔒</div>
      )}
    </button>
  )
}
