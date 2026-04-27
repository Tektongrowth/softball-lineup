import { GROUP_COLORS } from '../../data/config'

const CHART_DEFS = [
  { key: 'A',   label: '3B / LF',        colorKey: 'A',  description: 'Group A — infield starters (3B) shadow outfield (LF)' },
  { key: 'B',   label: 'SS / LC',        colorKey: 'B',  description: 'Group B — SS / LC' },
  { key: 'C',   label: '2B / RC',        colorKey: 'C',  description: 'Group C — 2B / RC' },
  { key: 'D',   label: '1B / RF',        colorKey: 'D',  description: 'Group D — 1B / RF' },
  { key: 'P12', label: 'Pitcher (Inn 1–2)', colorKey: 'P',  description: 'Eligible pitchers for innings 1 and 2' },
  { key: 'P34', label: 'Pitcher (Inn 3–4)', colorKey: 'P',  description: 'Eligible pitchers for innings 3 and 4' },
  { key: 'C12', label: 'Catcher (Inn 1–2)', colorKey: 'C_', description: 'Primary catchers (innings 1–2)' },
  { key: 'C34', label: 'Catcher (Inn 3–4)', colorKey: 'C_', description: 'Catchers for innings 3–4' },
]

function move(arr, from, to) {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function DepthChartSection({ depthCharts, players, onChange }) {
  const playerIds = new Set(players.map(p => p.id))

  const updateChart = (key, newList) => {
    onChange({ ...depthCharts, [key]: newList })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 px-1">
        Order determines assignment priority. The first player in each group's chart is the starter and locks the infield in innings 3–4.
      </p>

      {CHART_DEFS.map(({ key, label, colorKey, description }) => {
        const c = GROUP_COLORS[colorKey]
        const chart = depthCharts[key] || []

        // Players not in this chart (can be added)
        const available = players.filter(p => !chart.includes(p.id))

        return (
          <div key={key} className="bg-slate-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className={`px-3 py-2.5 flex items-center gap-2 border-b border-slate-700 ${c.bg}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{label}</span>
              <span className="text-xs text-slate-500 flex-1">{description}</span>
            </div>

            {/* Ordered list */}
            <div className="p-2 space-y-1">
              {chart.map((playerId, idx) => (
                <div key={playerId} className="flex items-center gap-2 px-2 py-1.5 bg-slate-700/50 rounded-lg">
                  {/* Rank */}
                  <span className="text-slate-600 text-xs font-mono w-4 text-center">{idx + 1}</span>

                  {/* Player dot */}
                  {players.find(p => p.id === playerId)?.group
                    ? <span className={`w-2 h-2 rounded-full ${GROUP_COLORS[players.find(p => p.id === playerId).group]?.dot}`} />
                    : <span className="w-2 h-2 rounded-full bg-slate-500" />}

                  <span className="text-white text-sm flex-1">{playerId}</span>

                  {/* Move up/down */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => idx > 0 && updateChart(key, move(chart, idx, idx - 1))}
                      disabled={idx === 0}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-600 disabled:opacity-20 text-xs"
                    >↑</button>
                    <button
                      onClick={() => idx < chart.length - 1 && updateChart(key, move(chart, idx, idx + 1))}
                      disabled={idx === chart.length - 1}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-600 disabled:opacity-20 text-xs"
                    >↓</button>
                    <button
                      onClick={() => updateChart(key, chart.filter((_, i) => i !== idx))}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs"
                    >×</button>
                  </div>
                </div>
              ))}

              {chart.length === 0 && (
                <div className="text-center text-slate-600 text-xs py-2">No players — add below</div>
              )}
            </div>

            {/* Add from available */}
            {available.length > 0 && (
              <div className="px-2 pb-2 flex flex-wrap gap-1">
                {available.map(p => (
                  <button
                    key={p.id}
                    onClick={() => updateChart(key, [...chart, p.id])}
                    className="text-xs text-slate-400 bg-slate-700 hover:bg-slate-600 rounded px-2 py-1 border border-slate-600 hover:border-slate-500 transition-colors"
                  >
                    + {p.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
