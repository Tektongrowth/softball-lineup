import { useState } from 'react'
import { RosterSection } from './RosterSection'
import { DepthChartSection } from './DepthChartSection'
import { RulesSection } from './RulesSection'

const TABS = [
  { id: 'roster', label: 'Roster' },
  { id: 'depth', label: 'Depth Charts' },
  { id: 'rules', label: 'Rules' },
]

export function SettingsScreen({ players, depthCharts, rules, inningKeys, teamCode, onPlayersChange, onDepthChartsChange, onRulesChange, onTeamCodeChange, onGenerate, generateDisabled, onSync, onClose }) {
  const [tab, setTab] = useState('roster')
  const [codeInput, setCodeInput] = useState(teamCode || '')

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <span className="text-white font-bold text-lg">Settings</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-2xl leading-none w-9 h-9 flex items-center justify-center"
        >
          &times;
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 bg-slate-900 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? 'text-white border-blue-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'roster' && (
          <RosterSection players={players} onChange={onPlayersChange} />
        )}
        {tab === 'depth' && (
          <DepthChartSection depthCharts={depthCharts} players={players} onChange={onDepthChartsChange} />
        )}
        {tab === 'rules' && (
          <RulesSection rules={rules} players={players} inningKeys={inningKeys} onChange={onRulesChange} />
        )}
      </div>

      {/* Sync + Generate */}
      <div className="flex-shrink-0 p-4 bg-slate-900 border-t border-slate-800 space-y-3">
        {/* Team code */}
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            placeholder="TEAM CODE"
            maxLength={12}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 uppercase tracking-wider focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => { onTeamCodeChange(codeInput); onSync() }}
            disabled={!codeInput}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-lg text-sm border border-slate-600 transition-colors"
          >
            Sync
          </button>
        </div>
        {teamCode && <p className="text-xs text-slate-600">Syncing as <span className="text-slate-400">{teamCode}</span> — data is shared across all devices using this code</p>}

        <button
          onClick={() => { onGenerate(); onClose() }}
          disabled={generateDisabled}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl text-base transition-colors"
        >
          {generateDisabled ? 'Start a game to generate' : 'Generate Lineups'}
        </button>
      </div>
    </div>
  )
}
