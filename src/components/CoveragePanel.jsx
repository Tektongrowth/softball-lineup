import { PLAYERS, GROUP_COLORS, POSITION_GROUPS, PLAYER_MAP } from '../data/config'

export function CoveragePanel({ inningCounts, gameViolations }) {
  const gameWideViolations = gameViolations.filter(v => !v.inning)
  const totalViolations = gameViolations.length

  return (
    <div className="p-3 space-y-3">
      {/* Game-wide violations */}
      {gameWideViolations.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1">
          <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">Coverage Warnings</div>
          {gameWideViolations.map((v, i) => (
            <div key={i} className="text-xs text-amber-300">{v.message}</div>
          ))}
        </div>
      )}

      {/* Innings count per player */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Innings This Game</h3>
        </div>
        <div className="p-2 grid grid-cols-2 gap-1">
          {PLAYERS.map(player => {
            const count = inningCounts[player.id] || 0
            const pd = PLAYER_MAP[player.id]
            const groupId = pd.group
            const colors = groupId ? GROUP_COLORS[groupId] : null

            return (
              <div key={player.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg
                ${count === 0 ? 'opacity-40' : ''}`}>
                {colors
                  ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  : <span className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-500" />}
                <span className="text-white text-sm flex-1">{player.id}</span>
                <InningPips count={count} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="pb-6" />
    </div>
  )
}

function InningPips({ count }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`w-2 h-2 rounded-sm ${i <= count ? 'bg-emerald-400' : 'bg-slate-700'}`}
        />
      ))}
    </div>
  )
}
