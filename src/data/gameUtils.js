export function isoToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Accepts ISO yyyy-mm-dd or legacy "May 2" strings and returns a short label.
export function formatDateShort(input) {
  if (!input) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return input
}

export function gameTitle(game) {
  if (!game) return ''
  const date = formatDateShort(game.date)
  if (game.opponent) return date ? `${date} vs ${game.opponent}` : `vs ${game.opponent}`
  return date || game.label || ''
}

export const EMPTY_LINEUP = { inn1: {}, inn2: {}, inn3: {}, inn4: {} }

export function newGameObject({ date, opponent }) {
  return {
    id: `game-${Date.now()}`,
    date: date || isoToday(),
    opponent: (opponent || '').trim(),
    lineup: EMPTY_LINEUP,
    battingOrder: [],
  }
}
