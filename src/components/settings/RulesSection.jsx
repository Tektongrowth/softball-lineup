import { useState } from 'react'
import { RULE_TEMPLATES } from '../../data/defaultState'
import { ALL_POSITIONS } from '../../data/config'

const INNINGS_OPTIONS = [
  { value: 'inn1', label: 'Inning 1' },
  { value: 'inn2', label: 'Inning 2' },
  { value: 'inn3', label: 'Inning 3' },
  { value: 'inn4', label: 'Inning 4' },
]

function CustomRuleForm({ players, onAdd, onCancel }) {
  const [template, setTemplate] = useState(RULE_TEMPLATES[0].template)
  const [params, setParams] = useState({})

  const def = RULE_TEMPLATES.find(t => t.template === template)

  const setParam = (key, val) => setParams(prev => ({ ...prev, [key]: val }))

  const handleTemplateChange = (t) => {
    setTemplate(t)
    setParams({})
  }

  const canSubmit = def.params.every(p => {
    const v = params[p.key]
    if (!v && v !== 0) return false
    if (p.type === 'number') return v >= (p.min ?? 1) && v <= (p.max ?? 4)
    return String(v).trim().length > 0
  })

  const handleAdd = () => {
    if (!canSubmit) return
    onAdd({
      // eslint-disable-next-line react-hooks/purity
      id: `custom-${Date.now()}`,
      type: 'custom',
      template,
      enabled: true,
      params,
      label: def.describe(params),
    })
  }

  return (
    <div className="bg-slate-800 rounded-xl p-3 space-y-3 border border-slate-600">
      {/* Template selector */}
      <div>
        <div className="text-xs text-slate-500 mb-1.5">Rule type</div>
        <div className="space-y-1">
          {RULE_TEMPLATES.map(t => (
            <button
              key={t.template}
              onClick={() => handleTemplateChange(t.template)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                template === t.template
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Param inputs */}
      {def.params.length > 0 && (
        <div className="space-y-2">
          {def.params.map(p => (
            <div key={p.key}>
              <div className="text-xs text-slate-500 mb-1">{p.label}</div>
              {p.type === 'player' && (
                <select
                  value={params[p.key] || ''}
                  onChange={e => setParam(p.key, e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 outline-none"
                >
                  <option value="">Select player…</option>
                  {players.map(pl => (
                    <option key={pl.id} value={pl.id}>{pl.id}</option>
                  ))}
                </select>
              )}
              {p.type === 'position' && (
                <select
                  value={params[p.key] || ''}
                  onChange={e => setParam(p.key, e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 outline-none"
                >
                  <option value="">Select position…</option>
                  {ALL_POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              )}
              {p.type === 'inning' && (
                <select
                  value={params[p.key] || ''}
                  onChange={e => setParam(p.key, e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 outline-none"
                >
                  <option value="">Select inning…</option>
                  {INNINGS_OPTIONS.map(i => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              )}
              {p.type === 'number' && (
                <input
                  type="number"
                  min={p.min ?? 1}
                  max={p.max ?? 4}
                  value={params[p.key] ?? ''}
                  onChange={e => setParam(p.key, Number(e.target.value))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 outline-none"
                />
              )}
              {p.type === 'text' && (
                <input
                  type="text"
                  value={params[p.key] || ''}
                  onChange={e => setParam(p.key, e.target.value)}
                  placeholder="Enter note…"
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 outline-none"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {canSubmit && (
        <div className="text-xs text-slate-400 bg-slate-700/50 rounded-lg px-3 py-2 italic">
          {def.describe(params)}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={!canSubmit}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Add rule
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function RulesSection({ rules, players, onChange }) {
  const [adding, setAdding] = useState(false)

  const toggleRule = (id) => {
    onChange(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const removeRule = (id) => {
    onChange(rules.filter(r => r.id !== id))
  }

  const addRule = (rule) => {
    onChange([...rules, rule])
    setAdding(false)
  }

  const builtins = rules.filter(r => r.type === 'builtin')
  const customs = rules.filter(r => r.type === 'custom')

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 px-1">
        Built-in rules affect auto-assign and validation. Custom rules can add hard constraints or reminders.
      </p>

      {/* Built-in rules */}
      <div className="space-y-1.5">
        <div className="text-xs text-slate-500 uppercase tracking-wider px-1">Built-in</div>
        {builtins.map(rule => (
          <button
            key={rule.id}
            onClick={() => toggleRule(rule.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-start gap-3 ${
              rule.enabled
                ? 'bg-slate-700 border-slate-500'
                : 'bg-slate-800 border-slate-700 opacity-50'
            }`}
          >
            <span className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
              rule.enabled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500'
            }`}>
              {rule.enabled ? '✓' : ''}
            </span>
            <div>
              <div className="text-sm text-white font-medium">{rule.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{rule.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Custom rules */}
      {customs.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider px-1">Custom</div>
          {customs.map(rule => (
            <div
              key={rule.id}
              className={`px-3 py-2.5 rounded-xl border flex items-start gap-3 ${
                rule.enabled ? 'bg-slate-700 border-slate-500' : 'bg-slate-800 border-slate-700 opacity-50'
              }`}
            >
              <button
                onClick={() => toggleRule(rule.id)}
                className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                  rule.enabled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500'
                }`}
              >
                {rule.enabled ? '✓' : ''}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{rule.label}</div>
              </div>
              <button
                onClick={() => removeRule(rule.id)}
                className="text-slate-600 hover:text-rose-400 text-lg leading-none w-6 h-6 flex items-center justify-center flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom rule */}
      {adding ? (
        <CustomRuleForm players={players} onAdd={addRule} onCancel={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-slate-600 text-slate-500 text-sm hover:border-slate-400 hover:text-slate-300 transition-colors"
        >
          + Add custom rule
        </button>
      )}
    </div>
  )
}
