// Static field configuration — positions, coordinates, colors

export const POSITION_GROUPS = {
  A: { id: 'A', infield: '3B', outfield: 'LF', label: '3B / LF' },
  B: { id: 'B', infield: 'SS', outfield: 'LC', label: 'SS / LC' },
  C: { id: 'C', infield: '2B', outfield: 'RC', label: '2B / RC' },
  D: { id: 'D', infield: '1B', outfield: 'RF', label: '1B / RF' },
}

export const POS_TO_GROUP = {
  '3B': 'A', LF: 'A',
  SS: 'B',  LC: 'B',
  '2B': 'C', RC: 'C',
  '1B': 'D', RF: 'D',
}

// Percentage coordinates (x, y) within the diamond container
// Origin top-left. Home plate is bottom-center.
export const FIELD_COORDS = {
  C:   { x: 50, y: 88 },
  P:   { x: 50, y: 70 },
  '1B': { x: 74, y: 63 },
  '2B': { x: 61, y: 46 },
  SS:  { x: 39, y: 46 },
  '3B': { x: 26, y: 63 },
  LF:  { x: 11, y: 22 },
  LC:  { x: 35, y: 13 },
  RC:  { x: 65, y: 13 },
  RF:  { x: 89, y: 22 },
}

export const ALL_POSITIONS = ['P', 'C', '3B', 'SS', '2B', '1B', 'LF', 'LC', 'RC', 'RF']

export const GROUP_COLORS = {
  A:  { bg: 'bg-emerald-500/25', border: 'border-emerald-400/50', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  B:  { bg: 'bg-sky-500/25',     border: 'border-sky-400/50',     text: 'text-sky-300',     dot: 'bg-sky-400',     label: 'bg-sky-500/20 text-sky-300 border-sky-500/30'         },
  C:  { bg: 'bg-violet-500/25',  border: 'border-violet-400/50',  text: 'text-violet-300',  dot: 'bg-violet-400',  label: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  D:  { bg: 'bg-amber-500/25',   border: 'border-amber-400/50',   text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'bg-amber-500/20 text-amber-300 border-amber-500/30'   },
  P:  { bg: 'bg-rose-500/25',    border: 'border-rose-400/50',    text: 'text-rose-300',    dot: 'bg-rose-400',    label: 'bg-rose-500/20 text-rose-300 border-rose-500/30'       },
  C_: { bg: 'bg-orange-500/25',  border: 'border-orange-400/50',  text: 'text-orange-300',  dot: 'bg-orange-400',  label: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
}

export const POS_COLOR_KEY = {
  P: 'P', C: 'C_',
  '3B': 'A', LF: 'A',
  SS: 'B', LC: 'B',
  '2B': 'C', RC: 'C',
  '1B': 'D', RF: 'D',
}

export const INNING_LABELS = { inn1: 'Inn 1', inn2: 'Inn 2', inn3: 'Inn 3', inn4: 'Inn 4' }
export const INNINGS = ['inn1', 'inn2', 'inn3', 'inn4']
