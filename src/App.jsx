import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { INNINGS, INNING_LABELS } from './data/config'
import { DEFAULT_PLAYERS, DEFAULT_DEPTH_CHARTS, DEFAULT_RULES } from './data/defaultState'
import { EMPTY_LINEUP, gameTitle, isoToday, newGameObject } from './data/gameUtils'
import { autoAssign, getBench, getInningCounts, calcBalance } from './engine/autoAssign'
import { validateLineup } from './engine/validate'
import { Diamond } from './components/Diamond'
import { BattingOrder } from './components/BattingOrder'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { GameLogModal } from './components/GameLogModal'
import { GameHistoryModal } from './components/GameHistoryModal'
import { NewGameModal } from './components/NewGameModal'

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

// Migrate the pre-v2 separate `sl-lineup` / `sl-batting-order` keys into a
// single `sl-current-game` object the first time the new build loads.
const INITIAL_CURRENT_GAME = (() => {
  if (typeof window === 'undefined') return null
  try {
    const cur = window.localStorage.getItem('sl-current-game')
    if (cur !== null) return JSON.parse(cur)
    const lineupRaw  = window.localStorage.getItem('sl-lineup')
    const battingRaw = window.localStorage.getItem('sl-batting-order')
    const lineup  = lineupRaw  ? JSON.parse(lineupRaw)  : null
    const batting = battingRaw ? JSON.parse(battingRaw) : null
    const hasLineup  = lineup && Object.values(lineup).some(s => s && Object.keys(s).length > 0)
    const hasBatting = Array.isArray(batting) && batting.length > 0
    if (!hasLineup && !hasBatting) return null
    const game = {
      id: `game-${Date.now()}`,
      date: isoToday(),
      opponent: '',
      lineup: lineup || EMPTY_LINEUP,
      battingOrder: Array.isArray(batting) ? batting : [],
    }
    window.localStorage.setItem('sl-current-game', JSON.stringify(game))
    window.localStorage.removeItem('sl-lineup')
    window.localStorage.removeItem('sl-batting-order')
    return game
  } catch { return null }
})()

export default function App() {
  const [players,      setPlayers]      = useLocalStorage('sl-players',       DEFAULT_PLAYERS)
  const [depthCharts,  setDepthCharts]  = useLocalStorage('sl-depth-charts',  DEFAULT_DEPTH_CHARTS)
  const [rules,        setRules]        = useLocalStorage('sl-rules',         DEFAULT_RULES)
  const [currentGame,  setCurrentGame]  = useLocalStorage('sl-current-game',  INITIAL_CURRENT_GAME)
  const [gameHistory,  setGameHistory]  = useLocalStorage('sl-game-history',  [])
  const [teamCode,     setTeamCode]     = useLocalStorage('sl-team-code',     '')

  const [activeTab,    setActiveTab]    = useState('inn1')
  const [showSettings, setShowSettings] = useState(false)
  const [showGameLog,  setShowGameLog]  = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)
  const [gameDialog,   setGameDialog]   = useState(null) // 'create' | 'edit' | null
  const [syncStatus,   setSyncStatus]   = useState('')
  const syncTimer    = useRef(null)
  const pushTimer    = useRef(null)
  const lastSynced   = useRef(null)   // JSON of last payload pushed or pulled
  const initialized  = useRef(false)  // True once first pull (or no-team) has settled

  const showSync = (msg) => {
    setSyncStatus(msg)
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => setSyncStatus(''), 2000)
  }

  // ── Sync: pull on mount + periodically + on tab visibility change ──────────
  useEffect(() => {
    if (!teamCode) {
      initialized.current = true
      lastSynced.current = null
      return
    }
    initialized.current = false
    let cancelled = false

    const pull = async () => {
      try {
        const data = await fetchSync(teamCode)
        if (cancelled || !data) return
        const merged = {
          players:     data.players     ?? players,
          depthCharts: data.depthCharts ?? depthCharts,
          rules:       data.rules       ?? rules,
          gameHistory: data.gameHistory ?? gameHistory,
          currentGame: 'currentGame' in data ? data.currentGame : currentGame,
        }
        const incoming = JSON.stringify(merged)
        if (incoming === lastSynced.current) return
        lastSynced.current = incoming
        if (data.players)     setPlayers(data.players)
        if (data.depthCharts) setDepthCharts(data.depthCharts)
        if (data.rules)       setRules(data.rules)
        if (data.gameHistory) setGameHistory(data.gameHistory)
        if ('currentGame' in data) setCurrentGame(data.currentGame)
        showSync('Synced')
      } catch {} finally {
        if (!cancelled) initialized.current = true
      }
    }

    pull()
    const interval = setInterval(pull, 15000)
    const onVisible = () => { if (document.visibilityState === 'visible') pull() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [teamCode])

  // ── Sync: debounced auto-push whenever any synced field changes ────────────
  const payloadJson = JSON.stringify({ players, depthCharts, rules, gameHistory, currentGame })
  useEffect(() => {
    if (!teamCode || !initialized.current) return
    if (payloadJson === lastSynced.current) return

    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      try {
        await pushSync(teamCode, { players, depthCharts, rules, gameHistory, currentGame })
        lastSynced.current = payloadJson
        showSync('Saved')
      } catch { showSync('Sync failed') }
    }, 800)

    return () => clearTimeout(pushTimer.current)
  }, [payloadJson, teamCode])

  const forceSync = async () => {
    if (!teamCode) return
    clearTimeout(pushTimer.current)
    try {
      await pushSync(teamCode, { players, depthCharts, rules, gameHistory, currentGame })
      lastSynced.current = payloadJson
      showSync('Saved')
    } catch { showSync('Sync failed') }
  }

  const lineup       = currentGame?.lineup       || EMPTY_LINEUP
  const battingOrder = currentGame?.battingOrder || []

  const updateLineup = (updater) => {
    setCurrentGame(prev => {
      if (!prev) return prev
      const next = typeof updater === 'function' ? updater(prev.lineup || EMPTY_LINEUP) : updater
      return { ...prev, lineup: next }
    })
  }

  const updateBattingOrder = (next) => {
    setCurrentGame(prev => prev ? { ...prev, battingOrder: next } : prev)
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
    if (!currentGame) return
    updateLineup(autoAssign(presentPlayers, presentDepthCharts, rules, gameHistory))
  }

  const handlePositionUpdate = (pos, player) => {
    updateLineup(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [pos]: player || undefined },
    }))
  }

  const handleSaveGameInfo = ({ date, opponent }) => {
    if (gameDialog === 'edit' && currentGame) {
      setCurrentGame({ ...currentGame, date, opponent })
    } else {
      setCurrentGame(newGameObject({ date, opponent }))
      setActiveTab('inn1')
    }
    setGameDialog(null)
  }

  const handleFinishGame = ({ scoreUs = null, scoreThem = null }) => {
    if (!currentGame) return
    const entry = {
      id:           currentGame.id,
      date:         currentGame.date,
      opponent:     currentGame.opponent || '',
      lineup:       currentGame.lineup,
      battingOrder: currentGame.battingOrder,
      counts:       { ...counts },
      scoreUs,
      scoreThem,
    }
    setGameHistory([...gameHistory, entry])
    setCurrentGame(null)
    setShowGameLog(false)
  }

  const handleHistoryChange = (newHistory) => {
    setGameHistory(newHistory)
  }

  const team3Active = activeTab === 'inn3' || activeTab === 'inn4'
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
  const hasGame    = !!currentGame

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <span className="font-bold text-white text-lg flex-shrink-0">⚾ Lineup</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition-colors"
              title="Game history"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{gameHistory.length}</span>
            </button>
            {hasGame && (
              <button
                onClick={() => setShowGameLog(true)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-400 text-sm border border-emerald-700/40 transition-colors whitespace-nowrap"
              >
                Finish
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Game info sub-row */}
        {hasGame && (
          <div className="flex items-center gap-2 px-4 pb-2 min-w-0">
            <button
              onClick={() => setGameDialog('edit')}
              className="text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded px-2 py-1 border border-slate-700 truncate flex items-center gap-1 min-w-0"
              title="Edit game date/opponent"
            >
              <span className="truncate">{gameTitle(currentGame) || 'Set date / opponent'}</span>
              <span className="text-slate-500 text-[10px] flex-shrink-0">✎</span>
            </button>
            {syncStatus && (
              <span className="text-xs text-emerald-400 flex-shrink-0">{syncStatus}</span>
            )}
            {(errorCount > 0 || warnCount > 0) && (
              <span className="text-xs flex items-center gap-1.5 flex-shrink-0 ml-auto">
                {errorCount > 0 && <span className="text-rose-400">{errorCount} err</span>}
                {warnCount  > 0 && <span className="text-amber-400">{warnCount} warn</span>}
              </span>
            )}
          </div>
        )}
        {!hasGame && syncStatus && (
          <div className="px-4 pb-2 text-xs text-emerald-400">{syncStatus}</div>
        )}
      </div>

      {/* Empty state — no game in progress */}
      {!hasGame && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center space-y-4">
            <div className="text-5xl">⚾</div>
            <div>
              <div className="text-lg font-bold text-white">No game in progress</div>
              <div className="text-sm text-slate-500 mt-1">
                Start a new game to set up the fielding lineup and batting order.
              </div>
            </div>
            <button
              onClick={() => setGameDialog('create')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors"
            >
              + New Game
            </button>
            {hasHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                View {gameHistory.length} past {gameHistory.length === 1 ? 'game' : 'games'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* In-progress game UI */}
      {hasGame && (
        <>
          {/* Inning + Bat tabs */}
          <div className="flex bg-slate-900 border-b border-slate-800 flex-shrink-0">
            {INNINGS.map(inn => {
              const innViolations = violations.filter(v => v.inning === inn)
              const hasError = innViolations.some(v => v.severity === 'error')
              const hasWarn  = innViolations.some(v => v.severity === 'warning')
              return (
                <button key={inn} onClick={() => setActiveTab(inn)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 relative ${
                    activeTab === inn ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  {INNING_LABELS[inn]}
                  {(hasError || hasWarn) && (
                    <span className={`absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full ${hasError ? 'bg-rose-500' : 'bg-amber-400'}`} />
                  )}
                </button>
              )
            })}
            <button onClick={() => setActiveTab('bat')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'bat' ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Bat
            </button>
          </div>

          {activeTab === 'bat' && (
            <BattingOrder
              order={battingOrder}
              players={presentPlayers}
              onChange={updateBattingOrder}
            />
          )}

          {activeTab !== 'bat' && (
            <>
              <div className="px-3 pt-3 pb-2 max-w-lg mx-auto w-full">
                <Diamond
                  inningKey={activeTab}
                  lineup={presentLineup[activeTab] || {}}
                  players={presentPlayers}
                  depthCharts={presentDepthCharts}
                  rules={rules}
                  violations={violations}
                  onUpdate={handlePositionUpdate}
                  team3Locks={team3Locks}
                />
              </div>

              <div className="px-4 pb-6 space-y-3 max-w-lg mx-auto w-full">
                {bench[activeTab]?.length > 0 && (
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Bench — {INNING_LABELS[activeTab]}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {bench[activeTab].map(pid => (
                        <span key={pid} className="text-xs text-slate-400 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">{pid}</span>
                      ))}
                    </div>
                  </div>
                )}

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
            </>
          )}
        </>
      )}

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
          generateDisabled={!hasGame}
          onSync={forceSync}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Finish game modal */}
      {showGameLog && hasGame && (
        <GameLogModal
          game={currentGame}
          players={presentPlayers}
          counts={counts}
          gameHistory={gameHistory}
          onFinish={handleFinishGame}
          onClose={() => setShowGameLog(false)}
        />
      )}

      {/* New / edit game modal */}
      {gameDialog && (
        <NewGameModal
          mode={gameDialog}
          initial={gameDialog === 'edit' ? currentGame : null}
          onSave={handleSaveGameInfo}
          onClose={() => setGameDialog(null)}
        />
      )}

      {/* Game history modal */}
      {showHistory && (
        <GameHistoryModal
          gameHistory={gameHistory}
          onChange={handleHistoryChange}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
