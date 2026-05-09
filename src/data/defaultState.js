import { DEFAULT_INNINGS } from './config'
export const DEFAULT_PLAYERS = [
  { id: 'Anna',      number: '', group: 'B', floater: false, canPitch12: true,  canCatch12: false, canCatch34: false, canPitch34: false },
  { id: 'Moon',      number: '', group: 'A', floater: false, canPitch12: true,  canCatch12: true,  canCatch34: false, canPitch34: false },
  { id: 'Lena',      number: '', group: 'D', floater: false, canPitch12: true,  canCatch12: true,  canCatch34: false, canPitch34: false },
  { id: 'Jordyn',    number: '', group: 'A', floater: false, canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: true  },
  { id: 'Malia',     number: '', group: 'B', floater: false, canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: true  },
  { id: 'Athena',    number: '', group: 'A', floater: false, canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: false },
  { id: 'Cathyann',  number: '', group: 'B', floater: false, canPitch12: false, canCatch12: false, canCatch34: true,  canPitch34: false },
  { id: 'Niya',      number: '', group: 'C', floater: false, canPitch12: true,  canCatch12: false, canCatch34: false, canPitch34: false },
  { id: 'Amara',     number: '', group: 'C', floater: false, canPitch12: false, canCatch12: false, canCatch34: true,  canPitch34: false },
  { id: 'Hailey',    number: '', group: 'D', floater: false, canPitch12: false, canCatch12: false, canCatch34: true,  canPitch34: false },
  { id: 'Scarlett',  number: '', group: 'C', floater: false, canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: false },
  { id: 'Giulietta', number: '', group: 'C', floater: false, canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: false },
  { id: 'Olivia',    number: '', group: 'D', floater: false, canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: false },
  { id: 'Sienna',    number: '', group: null, floater: true,  canPitch12: false, canCatch12: false, canCatch34: false, canPitch34: false },
]

// Ordered depth charts — first player has highest priority
export const DEFAULT_DEPTH_CHARTS = {
  A:   ['Moon', 'Jordyn', 'Athena'],
  B:   ['Anna', 'Malia', 'Cathyann'],
  C:   ['Niya', 'Amara', 'Scarlett', 'Giulietta'],
  D:   ['Lena', 'Hailey', 'Olivia'],
  P12: ['Anna', 'Lena', 'Moon', 'Niya'],
  P34: ['Jordyn', 'Malia'],
  C12: ['Moon', 'Lena'],
  C34: ['Amara', 'Cathyann', 'Hailey'],
}

// Built-in rules (always present, can be toggled)
export const DEFAULT_RULES = [
  {
    id: 'team3-lock',
    type: 'builtin',
    enabled: true,
    label: 'Lock Team 3 infield',
    description: 'Innings 3 & 4: 1st string of each group plays their infield position.',
  },
  {
    id: 'group-constraint',
    type: 'builtin',
    enabled: true,
    label: 'Players stay in their group',
    description: 'A player can only be assigned to the infield or outfield position in their group, unless they are on a pitcher or catcher depth chart.',
  },
  {
    id: 'catcher-12',
    type: 'builtin',
    enabled: true,
    label: 'Primary catchers only for innings 1–2',
    description: 'Catcher in innings 1 and 2 must come from the C 1–2 depth chart.',
  },
  {
    id: 'pitcher-12',
    type: 'builtin',
    enabled: true,
    label: 'Pitcher depth chart for innings 1–2',
    description: 'Pitcher in innings 1 and 2 must come from the P 1–2 depth chart.',
  },
  {
    id: 'pitcher-34',
    type: 'builtin',
    enabled: true,
    label: 'Separate pitcher depth chart for innings 3+',
    description: 'Pitcher in innings 3 and later must come from the P 3+ depth chart.',
  },
  {
    id: 'group-coverage',
    type: 'builtin',
    enabled: true,
    label: 'Each player covers both group positions',
    description: 'Players in a group depth chart should play their infield spot in at least 1 inning and their outfield spot in at least 1 inning per game.',
  },
  {
    id: 'rotate-battery',
    type: 'builtin',
    enabled: true,
    label: 'Rotate pitcher across innings',
    description: 'Avoid using the same pitcher for all innings. Rotate through the depth chart.',
  },
]

export const RULE_TEMPLATES = [
  {
    template: 'player-must-play',
    label: 'Player must play a position in a specific inning',
    params: [
      { key: 'player', type: 'player', label: 'Player' },
      { key: 'position', type: 'position', label: 'Position' },
      { key: 'inning', type: 'inning', label: 'Inning' },
    ],
    describe: (p) => `${p.player} must play ${p.position} in inning ${p.inning.replace('inn', '')}`,
  },
  {
    template: 'player-must-not-play',
    label: 'Player cannot play a specific position',
    params: [
      { key: 'player', type: 'player', label: 'Player' },
      { key: 'position', type: 'position', label: 'Position' },
    ],
    describe: (p) => `${p.player} cannot play ${p.position}`,
  },
  {
    template: 'player-sits-inning',
    label: 'Player must sit a specific inning',
    params: [
      { key: 'player', type: 'player', label: 'Player' },
      { key: 'inning', type: 'inning', label: 'Inning' },
    ],
    describe: (p) => `${p.player} sits inning ${p.inning.replace('inn', '')}`,
  },
  {
    template: 'max-innings',
    label: 'Player plays at most N innings',
    params: [
      { key: 'player', type: 'player', label: 'Player' },
      { key: 'max', type: 'number', label: 'Max innings', min: 1 },
    ],
    describe: (p) => `${p.player} plays at most ${p.max} innings per game`,
  },
  {
    template: 'min-innings',
    label: 'Player plays at least N innings',
    params: [
      { key: 'player', type: 'player', label: 'Player' },
      { key: 'min', type: 'number', label: 'Min innings', min: 1 },
    ],
    describe: (p) => `${p.player} plays at least ${p.min} innings per game`,
  },
  {
    template: 'note',
    label: 'Free-form note (reminder only, does not affect auto-assign)',
    params: [
      { key: 'text', type: 'text', label: 'Note' },
    ],
    describe: (p) => `Note: ${p.text}`,
  },
]

export const DEFAULT_LINEUP = Object.fromEntries(DEFAULT_INNINGS.map(inn => [inn, {}]))
