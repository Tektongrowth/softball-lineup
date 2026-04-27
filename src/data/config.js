// Position groups: each player belongs to one group and only plays those two positions
// (or P/C if on those depth charts)
export const POSITION_GROUPS = {
  'A': { id: 'A', infield: '3B', outfield: 'LF', label: '3B / LF' },
  'B': { id: 'B', infield: 'SS', outfield: 'LC', label: 'SS / LC' },
  'C': { id: 'C', infield: '2B', outfield: 'RC', label: '2B / RC' },
  'D': { id: 'D', infield: '1B', outfield: 'RF', label: '1B / RF' },
}

// Map any field position back to its group
export const POS_TO_GROUP = {
  '3B': 'A', 'LF': 'A',
  'SS': 'B', 'LC': 'B',
  '2B': 'C', 'RC': 'C',
  '1B': 'D', 'RF': 'D',
}

export const INFIELD_POSITIONS = ['3B', 'SS', '2B', '1B']
export const OUTFIELD_POSITIONS = ['LF', 'LC', 'RC', 'RF']
export const ALL_POSITIONS = ['P', 'C', '3B', 'SS', '2B', '1B', 'LF', 'LC', 'RC', 'RF']

export const PLAYERS = [
  { id: 'Anna',      group: 'B', canPitch12: true,  canCatch12: false, canCatch34: false, primaryCatcher: false },
  { id: 'Moon',      group: 'A', canPitch12: true,  canCatch12: true,  canCatch34: false, primaryCatcher: true  },
  { id: 'Lena',      group: 'D', canPitch12: true,  canCatch12: true,  canCatch34: false, primaryCatcher: true  },
  { id: 'Jordy',     group: 'A', canPitch12: false, canCatch12: false, canCatch34: false, primaryCatcher: false, canPitch34: true  },
  { id: 'Malia',     group: 'B', canPitch12: false, canCatch12: false, canCatch34: false, primaryCatcher: false, canPitch34: true  },
  { id: 'Athena',    group: 'A', canPitch12: false, canCatch12: false, canCatch34: false, primaryCatcher: false },
  { id: 'Kathyann',  group: 'B', canPitch12: false, canCatch12: false, canCatch34: true,  primaryCatcher: false },
  { id: 'Niya',      group: 'C', canPitch12: true,  canCatch12: false, canCatch34: false, primaryCatcher: false },
  { id: 'Amora',     group: 'C', canPitch12: false, canCatch12: false, canCatch34: true,  primaryCatcher: false },
  { id: 'Hailey',    group: 'D', canPitch12: false, canCatch12: false, canCatch34: true,  primaryCatcher: false },
  { id: 'Scarlett',  group: 'C', canPitch12: false, canCatch12: false, canCatch34: false, primaryCatcher: false, bench: true },
  { id: 'Giulietta', group: 'C', canPitch12: false, canCatch12: false, canCatch34: false, primaryCatcher: false, bench: true },
  { id: 'Olivia',    group: 'D', canPitch12: false, canCatch12: false, canCatch34: false, primaryCatcher: false, bench: true },
  { id: 'Sienna',    group: null, canPitch12: false, canCatch12: false, canCatch34: false, primaryCatcher: false, bench: true, floater: true },
]

export const PLAYER_MAP = Object.fromEntries(PLAYERS.map(p => [p.id, p]))

// Ordered depth charts — order determines priority / display
export const GROUP_DEPTH = {
  'A': ['Moon', 'Jordy', 'Athena'],
  'B': ['Anna', 'Malia', 'Kathyann'],
  'C': ['Niya', 'Amora', 'Scarlett', 'Giulietta'],
  'D': ['Lena', 'Hailey', 'Olivia'],
}

export const PITCHER_DEPTH_12 = ['Anna', 'Lena', 'Moon', 'Niya']
export const PITCHER_DEPTH_34 = ['Jordy', 'Malia']
export const CATCHER_DEPTH_12 = ['Moon', 'Lena']
export const CATCHER_DEPTH_34 = ['Amora', 'Kathyann', 'Hailey']

// Team 3 infield is locked — these positions should not be changed
export const TEAM3_LOCKS = { '3B': 'Moon', 'SS': 'Anna', '2B': 'Niya', '1B': 'Lena' }

// Visual colors per group
export const GROUP_COLORS = {
  'A': { ring: 'ring-emerald-500/60', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400', header: 'bg-emerald-500/20 text-emerald-300' },
  'B': { ring: 'ring-sky-500/60',     bg: 'bg-sky-500/15',     text: 'text-sky-300',     dot: 'bg-sky-400',     header: 'bg-sky-500/20 text-sky-300'         },
  'C': { ring: 'ring-violet-500/60',  bg: 'bg-violet-500/15',  text: 'text-violet-300',  dot: 'bg-violet-400',  header: 'bg-violet-500/20 text-violet-300'   },
  'D': { ring: 'ring-amber-500/60',   bg: 'bg-amber-500/15',   text: 'text-amber-300',   dot: 'bg-amber-400',   header: 'bg-amber-500/20 text-amber-300'     },
  'P': { ring: 'ring-rose-500/60',    bg: 'bg-rose-500/15',    text: 'text-rose-300',    dot: 'bg-rose-400',    header: 'bg-rose-500/20 text-rose-300'       },
  'C_': { ring: 'ring-orange-500/60', bg: 'bg-orange-500/15',  text: 'text-orange-300',  dot: 'bg-orange-400',  header: 'bg-orange-500/20 text-orange-300'   },
}

export const POS_COLOR_KEY = {
  'P': 'P', 'C': 'C_',
  '3B': 'A', 'LF': 'A',
  'SS': 'B', 'LC': 'B',
  '2B': 'C', 'RC': 'C',
  '1B': 'D', 'RF': 'D',
}
