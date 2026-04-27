import { POS_TO_GROUP, INNINGS } from '../data/config'

export function validateLineup(lineup, players, depthCharts, rules) {
  const enabled = new Set(rules.filter(r => r.enabled).map(r => r.id))
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))
  const violations = []

  const p12 = new Set(depthCharts.P12 || [])
  const p34 = new Set(depthCharts.P34 || [])
  const c12 = new Set(depthCharts.C12 || [])
  const c34 = new Set(depthCharts.C34 || [])

  for (const inning of INNINGS) {
    const inn = lineup[inning] || {}
    const innNum = inning.replace('inn', '')
    const assigned = Object.values(inn).filter(Boolean)

    // No duplicates
    const seen = {}
    for (const p of assigned) {
      if (seen[p]) violations.push({ inning, severity: 'error', message: `${p} is in two spots in inning ${innNum}` })
      seen[p] = true
    }

    // Group constraint
    if (enabled.has('group-constraint')) {
      for (const [pos, player] of Object.entries(inn)) {
        if (!player || pos === 'P' || pos === 'C') continue
        const pd = playerMap[player]
        if (!pd || pd.floater) continue
        const posGroup = POS_TO_GROUP[pos]
        if (pd.group && pd.group !== posGroup) {
          violations.push({ inning, pos, player, severity: 'error',
            message: `${player} (Group ${pd.group}) can't play ${pos} (Group ${posGroup})` })
        }
      }
    }

    // Catcher 1-2
    if (enabled.has('catcher-12') && (inning === 'inn1' || inning === 'inn2')) {
      if (inn.C && !c12.has(inn.C)) {
        violations.push({ inning, pos: 'C', severity: 'error',
          message: `${inn.C} is not in the C 1–2 depth chart (inning ${innNum})` })
      }
    }

    // Pitcher 1-2
    if (enabled.has('pitcher-12') && (inning === 'inn1' || inning === 'inn2')) {
      if (inn.P && !p12.has(inn.P)) {
        violations.push({ inning, pos: 'P', severity: 'error',
          message: `${inn.P} is not in the P 1–2 depth chart (inning ${innNum})` })
      }
    }

    // Pitcher 3-4
    if (enabled.has('pitcher-34') && (inning === 'inn3' || inning === 'inn4')) {
      if (inn.P && !p34.has(inn.P)) {
        violations.push({ inning, pos: 'P', severity: 'error',
          message: `${inn.P} is not in the P 3–4 depth chart (inning ${innNum})` })
      }
    }

    // Catcher 3-4
    if (inning === 'inn3' || inning === 'inn4') {
      if (inn.C && !c34.has(inn.C)) {
        violations.push({ inning, pos: 'C', severity: 'warning',
          message: `${inn.C} is not in the C 3–4 depth chart (inning ${innNum})` })
      }
    }
  }

  // Team 3 lock check
  if (enabled.has('team3-lock')) {
    const groups = ['A', 'B', 'C', 'D']
    const posMap = { A: '3B', B: 'SS', C: '2B', D: '1B' }
    for (const g of groups) {
      const locked = depthCharts[g]?.[0]
      if (!locked) continue
      for (const inning of ['inn3', 'inn4']) {
        const actual = lineup[inning]?.[posMap[g]]
        if (actual && actual !== locked) {
          violations.push({ inning, pos: posMap[g], severity: 'warning',
            message: `${posMap[g]} should be ${locked} in inning ${inning.replace('inn','')} (team 3 lock)` })
        }
      }
    }
  }

  // Group coverage check
  if (enabled.has('group-coverage')) {
    const groupOf = { A: 'LF', B: 'LC', C: 'RC', D: 'RF' }
    const groupIn = { A: '3B', B: 'SS', C: '2B', D: '1B' }
    for (const g of ['A', 'B', 'C', 'D']) {
      const chart = depthCharts[g] || []
      for (const player of chart) {
        const infieldCount = INNINGS.filter(inn => lineup[inn]?.[groupIn[g]] === player).length
        const ofCount = INNINGS.filter(inn => lineup[inn]?.[groupOf[g]] === player).length
        const pcCount = INNINGS.filter(inn => lineup[inn]?.P === player || lineup[inn]?.C === player).length
        if (infieldCount === 0 && pcCount === 0) {
          violations.push({ severity: 'warning', message: `${player} has 0 innings at ${groupIn[g]} this game` })
        }
        if (ofCount === 0 && pcCount < 4) {
          violations.push({ severity: 'warning', message: `${player} has 0 innings at ${groupOf[g]} this game` })
        }
      }
    }
  }

  return violations
}
