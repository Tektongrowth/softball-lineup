import { useState } from 'react'
import { isoToday } from '../data/gameUtils'

export function NewGameModal({ initial, mode = 'create', onSave, onClose }) {
  const [date, setDate]         = useState(initial?.date || isoToday())
  const [opponent, setOpponent] = useState(initial?.opponent || '')

  const submit = () => {
    if (!date) return
    onSave({ date, opponent: opponent.trim() })
  }

  const isEdit = mode === 'edit'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="w-full sm:w-[420px] bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <div>
            <div className="font-bold text-white">{isEdit ? 'Edit Game' : 'New Game'}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {isEdit ? 'Update the game date or opponent' : 'Set a date, then build the lineup'}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="mt-1 w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm border border-slate-700 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Opponent <span className="text-slate-600 normal-case">(optional)</span></label>
            <input
              type="text"
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="e.g. Lions"
              className="mt-1 w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm border border-slate-700 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-shrink-0 p-4 border-t border-slate-800 flex gap-2">
          <button
            onClick={submit}
            disabled={!date}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {isEdit ? 'Save' : 'Create Game'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
