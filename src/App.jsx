import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { DEFAULT_LINEUPS } from './data/lineups'
import { PLAYERS } from './data/config'
import { validateGame, getInningCounts } from './engine/rules'
import { TeamCard } from './components/TeamCard'
import { Team3Card } from './components/Team3Card'
import { CoveragePanel } from './components/CoveragePanel'

const GAMES = ['game1', 'game2', 'game3', 'game4']
const GAME_LABELS = ['Game 1', 'Game 2', 'Game 3', 'Game 4']

function getBench(gameLineup, inningKey) {
  const active = new Set(Object.values(gameLineup[inningKey] || {}).filter(Boolean))
  return PLAYERS.map(p => p.id).filter(p => !active.has(p))
}

export default function App() {
  const [activeGame, setActiveGame] = useLocalStorage('sb-activeGame', 'game1')
  const [lineups, setLineups] = useLocalStorage('sb-lineups', DEFAULT_LINEUPS)

  const gameLineup = lineups[activeGame]

  const violations = useMemo(() => validateGame(gameLineup), [gameLineup])
  const inningCounts = useMemo(() => getInningCounts(gameLineup), [gameLineup])

  const updatePosition = useCallback((inningKey, pos, player) => {
    setLineups(prev => ({
      ...prev,
      [activeGame]: {
        ...prev[activeGame],
        [inningKey]: { ...prev[activeGame][inningKey], [pos]: player || undefined },
      },
    }))
  }, [activeGame, setLineups])

  const resetGame = useCallback(() => {
    if (!window.confirm(`Reset ${GAME_LABELS[GAMES.indexOf(activeGame)]} to default lineup?`)) return
    setLineups(prev => ({ ...prev, [activeGame]: DEFAULT_LINEUPS[activeGame] }))
  }, [activeGame, setLineups])

  const errorCount = violations.filter(v => v.severity === 'error').length
  const warnCount = violations.filter(v => v.severity === 'warning').length

  return (
    <div className="min-h-screen bg-slate-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚾</span>
          <span className="font-bold text-white text-sm tracking-wide">Lineup Manager</span>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full px-2 py-0.5">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5">
              {warnCount} warn
            </span>
          )}
          <button
            onClick={resetGame}
            className="text-xs text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1 transition-colors"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Game selector */}
      <div className="flex gap-1.5 px-3 pt-3">
        {GAMES.map((g, i) => (
          <button
            key={g}
            onClick={() => setActiveGame(g)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
              ${activeGame === g
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            {GAME_LABELS[i]}
          </button>
        ))}
      </div>

      {/* Inning labels */}
      <div className="flex gap-1.5 px-3 mt-1.5">
        <div className="flex-1 text-center text-[10px] text-slate-600">Inn 1</div>
        <div className="flex-1 text-center text-[10px] text-slate-600">Inn 2</div>
        <div className="flex-1 text-center text-[10px] text-slate-600">Inn 3–4</div>
        <div className="flex-1 text-center text-[10px] text-slate-600">steal / machine</div>
      </div>

      {/* Team cards */}
      <div className="p-3 space-y-3">
        <TeamCard
          label="Team 1 — Inning 1"
          inningKey="inn1"
          lineup={gameLineup.inn1}
          violations={violations}
          bench={getBench(gameLineup, 'inn1')}
          onUpdate={(pos, player) => updatePosition('inn1', pos, player)}
        />
        <TeamCard
          label="Team 2 — Inning 2"
          inningKey="inn2"
          lineup={gameLineup.inn2}
          violations={violations}
          bench={getBench(gameLineup, 'inn2')}
          onUpdate={(pos, player) => updatePosition('inn2', pos, player)}
        />
        <Team3Card
          inn3={gameLineup.inn3}
          inn4={gameLineup.inn4}
          violations={violations}
          bench3={getBench(gameLineup, 'inn3')}
          bench4={getBench(gameLineup, 'inn4')}
          onUpdate={updatePosition}
        />

        <CoveragePanel inningCounts={inningCounts} gameViolations={violations} />
      </div>
    </div>
  )
}
