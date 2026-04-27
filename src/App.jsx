import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { INNINGS, INNING_LABELS } from './data/config'
import { DEFAULT_PLAYERS, DEFAULT_DEPTH_CHARTS, DEFAULT_RULES, DEFAULT_LINEUP } from './data/defaultState'
import { autoAssign, getBench, getInningCounts, calcBalance } from './engine/autoAssign'
import { validateLineup } from './engine/validate'
import { Diamond } from './components/Diamond'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { GameLogModal } from './components/GameLogModal'

async function fetchSync(teamCode) {
  const res = await fetch(`/api/sync?team=${encodeURIComponent(teamCode)}`)
  if (!res.ok) return null
  const data = await res.json()
  return Object.keys(data).length ? data : null
}

async function pushSync(teamCode, payload) {
  await fetch(`/api/sync?team=${encodeURIComponent(teamCode)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export default function App() {
  const [players,      setPlayers]      = useLocalStorage('sl-players',      DEFAULT_PLAYERS)
  const [depthCharts,  setDepthCharts]  = useLocalStorage('sl-depth-charts',  DEFAULT_DEPTH_CHARTS)
  const [rules,        setRules]        = useLocalStorage('sl-rules',         DEFAULT_RULES)
  const [lineup,       setLineup]       = useLocalStorage('sl-lineup',        DEFAULT_LINEUP)
  const [gameHistory,  setGameHistory]  = useLocalStorage('sl-game-history',  [])
  const [teamCode,     setTeamCode]     = useLocalStorage('sl-team-code',     '')

  const [activeInning,  setActiveInning]  = useState('inn1')
  const [showSettings,  setShowSettings]  = useState(false)
  const [showGameLog,   setShowGameLog]   = useState(false)
  const [syncStatus,    setSyncStatus]    = useState('')
  const syncTimer = useRef(null)

  const showSync = (msg) => {
    setSyncStatus(msg)
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => setSyncStatus(''), 3000)
  }

  useEffect(() => {
    if (!teamCode) return
    fetchSync(teamCode).then(data => {
      if (!data) return
      if (data.players)     setPlayers(data.players)
      if (data.depthCharts) setDepthCharts(data.depthCharts)
      if (data.rules)       setRules(data.rules)
      if (data.gameHistory) setGameHistory(data.gameHistory)
      if (data.lineup)      setLineup(data.lineup)
      showSync('Synced')
    }).catch(() => {})
  }, [teamCode])

  const syncPayload = () => ({ players, depthCharts, rules, gameHistory, lineup })

  const pushData = async (overrides = {}) => {
    if (!teamCode) return
    try {
      await pushSync(teamCode, { ...syncPayload(), ...overrides })
      showSync('Saved')
    } catch { showSync('Sync failed') }
  }

  // Players marked absent for this game are excluded from lineup
  // calculations but remain on the team roster (editable in Settings).
  const presentPlayers = players.filter(p => !p.absent)
  const absentIds      = new Set(players.filter(p => p.absent).map(p => p.id))
  const presentDepthCharts = Object.fromEntries(
    Object.entries(depthCharts).map(([k, list]) => [k, (list || []).filter(id => !absentIds.has(id))])
  )
  const presentLineup = absentIds.size === 0 ? lineup : Object.fromEntries(
    Object.entries(lineup).map(([inn, slots]) => [
      inn,
      Object.fromEntries(Object.entries(slots || {}).filter(([, pid]) => !absentIds.has(pid))),
    ])
  )

  const violations = validateLineup(presentLineup, presentPlayers, presentDepthCharts, rules)
  const bench      = getBench(presentLineup, presentPlayers)
  const counts     = getInningCounts(presentLineup, presentPlayers)
  const balance    = calcBalance(presentPlayers, gameHistory)

  const handleGenerate = () => {
    setLineup(autoAssign(presentPlayers, presentDepthCharts, rules, gameHistory))
  }

  const handlePositionUpdate = (pos, player) => {
    setLineup(prev => ({
      ...prev,
      [activeInning]: { ...prev[activeInning], [pos]: player || undefined },
    }))
  }

  const handleLockGame = ({ clear }) => {
    const gameNum  = gameHistory.length + 1
    const today    = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const entry    = {
      id:     `game-${Date.now()}`,
      label:  `Game ${gameNum}`,
      date:   today,
      counts: { ...counts },
    }
    const newHistory = [...gameHistory, entry]
    const newLineup  = clear ? DEFAULT_LINEUP : lineup
    setGameHistory(newHistory)
    if (clear) setLineup(DEFAULT_LINEUP)
    setShowGameLog(false)
    pushData({ gameHistory: newHistory, lineup: newLineup })
  }

  const team3Active = activeInning === 'inn3' || activeInning === 'inn4'
  const lockEnabled = rules.find(r => r.id === 'team3-lock')?.enabled
  const team3Locks  = (team3Active && lockEnabled)
    ? Object.fromEntries(
        [['A', '3B'], ['B', 'SS'], ['C', '2B'], ['D', '1B']]
          .map(([g, pos]) => [pos, depthCharts[g]?.[0]])
          .filter(([, v]) => v)
      )
    : null

  const errorCount = violations.filter(v => v.severity === 'error').length
  const warnCount  = violations.filter(v => v.severity === 'warning').length
  const hasHistory = gameHistory.length > 0

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-lg">⚾ Lineup</span>
          {hasHistory && (
            <span className="text-xs text-slate-500 bg-slate-800 rounded px-1.5 py-0.5 border border-slate-700">
              Game {gameHistory.length + 1}
            </span>
          )}
          {syncStatus && (
            <span className="text-xs text-emerald-400">{syncStatus}</span>
          )}
          {(errorCount > 0 || warnCount > 0) && (
            <span className="text-xs flex items-center gap-1.5">
              {errorCount > 0 && <span className="text-rose-400">{errorCount} err</span>}
              {warnCount  > 0 && <span className="text-amber-400">{warnCount} warn</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGameLog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-400 text-sm border border-emerald-700/40 transition-colors"
          >
            Lock Game
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {/* Inning tabs */}
      <div className="flex bg-slate-900 border-b border-slate-800 flex-shrink-0">
        {INNINGS.map(inn => {
          const innViolations = violations.filter(v => v.inning === inn)
          const hasError = innViolations.some(v => v.severity === 'error')
          const hasWarn  = innViolations.some(v => v.severity === 'warning')
          return (
            <button key={inn} onClick={() => setActiveInning(inn)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 relative ${
                activeInning === inn ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {INNING_LABELS[inn]}
              {(hasError || hasWarn) && (
                <span className={`absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full ${hasError ? 'bg-rose-500' : 'bg-amber-400'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Diamond */}
      <div className="px-3 pt-3 pb-2 max-w-lg mx-auto w-full">
        <Diamond
          inningKey={activeInning}
          lineup={presentLineup[activeInning] || {}}
          players={presentPlayers}
          depthCharts={presentDepthCharts}
          rules={rules}
          violations={violations}
          onUpdate={handlePositionUpdate}
          team3Locks={team3Locks}
        />
      </div>

      {/* Footer panels */}
      <div className="px-4 pb-6 space-y-3 max-w-lg mx-auto w-full">
        {/* Bench */}
        {bench[activeInning]?.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Bench — {INNING_LABELS[activeInning]}</div>
            <div className="flex flex-wrap gap-1.5">
              {bench[activeInning].map(pid => (
                <span key={pid} className="text-xs text-slate-400 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">{pid}</span>
              ))}
            </div>
          </div>
        )}

        {/* Innings played + carry-over balance */}
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Innings played</div>
            {hasHistory && <div className="text-xs text-slate-600">balance from {gameHistory.length} prev {gameHistory.length === 1 ? 'game' : 'games'}</div>}
          </div>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {presentPlayers.map(p => {
              const n   = counts[p.id] ?? 0
              const bal = balance[p.id] ?? 0
              const showBal = hasHistory
              return (
                <div key={p.id} className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2 py-1.5">
                  <span className="text-white text-xs flex-1 truncate">{p.id}</span>
                  <span className={`text-xs font-bold tabular-nums ${
                    n === 0 ? 'text-slate-600' : n < 2 ? 'text-amber-400' : n >= 4 ? 'text-emerald-400' : 'text-slate-300'
                  }`}>{n}</span>
                  {showBal && (
                    <span className={`text-[10px] tabular-nums w-8 text-right ${
                      bal > 0.8 ? 'text-amber-400' : bal < -0.8 ? 'text-sky-400' : 'text-slate-600'
                    }`}>
                      {bal > 0.05 ? `+${bal.toFixed(1)}` : bal < -0.05 ? bal.toFixed(1) : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {hasHistory && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-700">
              <span><span className="text-amber-400">+X</span> = over-played, engine reduces next game</span>
              <span><span className="text-sky-400">−X</span> = under-played, engine boosts next game</span>
            </div>
          )}
        </div>

        {/* Violations */}
        {violations.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Violations</div>
            {violations.map((v, i) => (
              <div key={i} className={`text-xs px-2 py-1.5 rounded-lg ${
                v.severity === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-400/10 text-amber-400'
              }`}>
                {v.inning ? `Inn ${v.inning.replace('inn', '')}: ` : ''}{v.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings overlay */}
      {showSettings && (
        <SettingsScreen
          players={players}
          depthCharts={depthCharts}
          rules={rules}
          teamCode={teamCode}
          onPlayersChange={setPlayers}
          onDepthChartsChange={setDepthCharts}
          onRulesChange={setRules}
          onTeamCodeChange={setTeamCode}
          onGenerate={handleGenerate}
          onSync={() => pushData()}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Game log modal */}
      {showGameLog && (
        <GameLogModal
          players={presentPlayers}
          counts={counts}
          gameHistory={gameHistory}
          onLock={handleLockGame}
          onClose={() => setShowGameLog(false)}
        />
      )}
    </div>
  )
}
