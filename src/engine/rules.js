import {
  PLAYERS, PLAYER_MAP, POS_TO_GROUP, TEAM3_LOCKS,
  PITCHER_DEPTH_12, PITCHER_DEPTH_34,
  CATCHER_DEPTH_12, CATCHER_DEPTH_34,
  GROUP_DEPTH, POSITION_GROUPS,
} from '../data/config'

// Each rule: { id, label, check(inningKey, lineupObj, allInnings?) -> violation[] }
// violation: { id, inning, pos?, player?, message, severity: 'error'|'warning' }

const RULES = [
  {
    id: 'no-duplicates',
    label: 'No player in two spots',
    check(inningKey, lineup) {
      const assigned = Object.values(lineup).filter(Boolean)
      const seen = {}
      return assigned
        .filter(p => { if (seen[p]) return true; seen[p] = true; return false })
        .map(p => ({ id: 'no-duplicates', inning: inningKey, player: p, severity: 'error',
          message: `${p} is assigned to multiple positions in ${labelInning(inningKey)}` }))
    },
  },
  {
    id: 'group-constraint',
    label: 'Players stay in their group',
    check(inningKey, lineup) {
      const violations = []
      for (const [pos, player] of Object.entries(lineup)) {
        if (!player || pos === 'P' || pos === 'C') continue
        const pd = PLAYER_MAP[player]
        if (!pd) continue
        if (pd.floater) continue
        const posGroup = POS_TO_GROUP[pos]
        if (pd.group && pd.group !== posGroup) {
          violations.push({ id: 'group-constraint', inning: inningKey, pos, player, severity: 'error',
            message: `${player} (Group ${pd.group}) can't play ${pos} (Group ${posGroup})` })
        }
      }
      return violations
    },
  },
  {
    id: 'catcher-12',
    label: 'Inn 1–2 catcher must be Moon or Lena',
    check(inningKey, lineup) {
      if (inningKey !== 'inn1' && inningKey !== 'inn2') return []
      if (!lineup.C) return []
      if (!CATCHER_DEPTH_12.includes(lineup.C)) {
        return [{ id: 'catcher-12', inning: inningKey, pos: 'C', player: lineup.C, severity: 'error',
          message: `${lineup.C} can't catch in ${labelInning(inningKey)} — only Moon or Lena` }]
      }
      return []
    },
  },
  {
    id: 'pitcher-12',
    label: 'Inn 1–2 pitcher from depth chart',
    check(inningKey, lineup) {
      if (inningKey !== 'inn1' && inningKey !== 'inn2') return []
      if (!lineup.P) return []
      if (!PITCHER_DEPTH_12.includes(lineup.P)) {
        return [{ id: 'pitcher-12', inning: inningKey, pos: 'P', player: lineup.P, severity: 'error',
          message: `${lineup.P} is not in the Inn 1–2 pitcher depth chart` }]
      }
      return []
    },
  },
  {
    id: 'pitcher-34',
    label: 'Inn 3–4 pitcher from depth chart',
    check(inningKey, lineup) {
      if (inningKey !== 'inn3' && inningKey !== 'inn4') return []
      if (!lineup.P) return []
      if (!PITCHER_DEPTH_34.includes(lineup.P)) {
        return [{ id: 'pitcher-34', inning: inningKey, pos: 'P', player: lineup.P, severity: 'error',
          message: `${lineup.P} is not in the Inn 3–4 pitcher depth chart` }]
      }
      return []
    },
  },
  {
    id: 'catcher-34',
    label: 'Inn 3–4 catcher from depth chart',
    check(inningKey, lineup) {
      if (inningKey !== 'inn3' && inningKey !== 'inn4') return []
      if (!lineup.C) return []
      if (!CATCHER_DEPTH_34.includes(lineup.C)) {
        return [{ id: 'catcher-34', inning: inningKey, pos: 'C', player: lineup.C, severity: 'error',
          message: `${lineup.C} can't catch in ${labelInning(inningKey)} — use Amora, Kathyann, or Hailey` }]
      }
      return []
    },
  },
  {
    id: 'team3-infield-lock',
    label: 'Team 3 infield: Moon 3B, Anna SS, Niya 2B, Lena 1B',
    check(inningKey, lineup) {
      if (inningKey !== 'inn3' && inningKey !== 'inn4') return []
      return Object.entries(TEAM3_LOCKS)
        .filter(([pos, locked]) => lineup[pos] && lineup[pos] !== locked)
        .map(([pos, locked]) => ({ id: 'team3-infield-lock', inning: inningKey, pos, severity: 'warning',
          message: `${pos} should be ${locked} in ${labelInning(inningKey)} (currently ${lineup[pos]})` }))
    },
  },
  {
    id: 'group-coverage',
    label: 'Each group player covers both their positions per game',
    checkGame(allInnings) {
      const violations = []
      for (const [groupId, group] of Object.entries(POSITION_GROUPS)) {
        const depth = GROUP_DEPTH[groupId] || []
        for (const player of depth) {
          const pd = PLAYER_MAP[player]
          if (!pd) continue
          const infieldCount = allInnings.filter(inn => inn[group.infield] === player).length
          const ofCount = allInnings.filter(inn => inn[group.outfield] === player).length
          // Exempt if player is locked in T3 infield and that covers their infield innings
          const lockedT3 = TEAM3_LOCKS[group.infield] === player
          const playingPC = allInnings.filter(inn => inn.P === player || inn.C === player).length

          if (infieldCount === 0 && !playingPC) {
            violations.push({ id: 'group-coverage', severity: 'warning', player,
              message: `${player} has 0 innings at ${group.infield} this game` })
          }
          if (ofCount === 0 && !(lockedT3 && playingPC > 0)) {
            violations.push({ id: 'group-coverage', severity: 'warning', player,
              message: `${player} has 0 innings at ${group.outfield} this game` })
          }
        }
      }
      return violations
    },
  },
]

function labelInning(key) {
  return { inn1: 'Inning 1', inn2: 'Inning 2', inn3: 'Inning 3', inn4: 'Inning 4' }[key] || key
}

export function validateGame(gameLineup) {
  const innings = ['inn1', 'inn2', 'inn3', 'inn4']
  const violations = []

  for (const inningKey of innings) {
    const lineup = gameLineup[inningKey]
    if (!lineup) continue
    for (const rule of RULES) {
      if (rule.check) violations.push(...rule.check(inningKey, lineup))
    }
  }

  // Game-wide rules
  const allInnings = innings.map(k => gameLineup[k]).filter(Boolean)
  for (const rule of RULES) {
    if (rule.checkGame) violations.push(...rule.checkGame(allInnings))
  }

  return violations
}

export function validateInning(inningKey, lineup) {
  const violations = []
  for (const rule of RULES) {
    if (rule.check) violations.push(...rule.check(inningKey, lineup))
  }
  return violations
}

export function getInningCounts(gameLineup) {
  const counts = {}
  for (const lineup of Object.values(gameLineup)) {
    for (const player of Object.values(lineup)) {
      if (player) counts[player] = (counts[player] || 0) + 1
    }
  }
  return counts
}

export function getValidPlayersForPosition(pos, inningKey, currentLineup) {
  const PM = PLAYER_MAP
  const P2G = POS_TO_GROUP
  const PD12 = PITCHER_DEPTH_12
  const PD34 = PITCHER_DEPTH_34
  const CD12 = CATCHER_DEPTH_12
  const CD34 = CATCHER_DEPTH_34
  const occupied = new Set(Object.entries(currentLineup).filter(([p]) => p !== pos).map(([, v]) => v).filter(Boolean))

  return PLAYERS.map(player => {
    const pd = PM[player.id]
    let valid = true
    let warning = null

    if (pos === 'P') {
      if (inningKey === 'inn1' || inningKey === 'inn2') valid = PD12.includes(player.id)
      else valid = PD34.includes(player.id)
    } else if (pos === 'C') {
      if (inningKey === 'inn1' || inningKey === 'inn2') valid = CD12.includes(player.id)
      else valid = CD34.includes(player.id)
    } else {
      const posGroup = P2G[pos]
      if (!pd.floater && pd.group !== posGroup) {
        valid = false
        warning = `Out of group (Group ${pd.group})`
      }
    }

    return {
      id: player.id,
      valid,
      warning,
      occupied: occupied.has(player.id),
    }
  })
}

export { RULES }
