import { INNINGS } from '../data/config'

const GROUP_INFIELD = { A: '3B', B: 'SS', C: '2B', D: '1B' }
const GROUP_OF      = { A: 'LF', B: 'LC', C: 'RC', D: 'RF' }
const GROUPS = ['A', 'B', 'C', 'D']
const TARGET_MIN_INNINGS = 2

// Historical fairness balance per player.
// balance[p] > 0 → player has played more than their fair share → should sit more.
// balance[p] < 0 → player is owed innings → should play more.
export function calcBalance(players, gameHistory) {
  const balance = {}
  for (const p of players) balance[p.id] = 0
  for (const game of gameHistory) {
    const vals = Object.values(game.counts)
    if (!vals.length) continue
    const fairShare = vals.reduce((s, v) => s + v, 0) / vals.length
    for (const [pid, count] of Object.entries(game.counts)) {
      if (balance[pid] !== undefined) balance[pid] += count - fairShare
    }
  }
  return balance
}

export function autoAssign(players, depthCharts, rules, gameHistory = []) {
  const enabled     = new Set(rules.filter(r => r.enabled).map(r => r.id))
  const customRules = rules.filter(r => r.type === 'custom' && r.enabled)
  const balance     = calcBalance(players, gameHistory)

  const lineup = { inn1: {}, inn2: {}, inn3: {}, inn4: {} }
  const used   = { inn1: new Set(), inn2: new Set(), inn3: new Set(), inn4: new Set() }

  const set = (inning, pos, player) => {
    if (!player || used[inning].has(player)) return false
    lineup[inning][pos] = player
    used[inning].add(player)
    return true
  }
  const unset = (inning, pos) => {
    const player = lineup[inning][pos]
    if (!player) return null
    delete lineup[inning][pos]
    used[inning].delete(player)
    return player
  }
  const firstAvailable = (chart, inning) => (chart || []).find(p => !used[inning].has(p))

  // ── STEP 1: Hard custom rules ──────────────────────────────────────────────
  for (const rule of customRules) {
    if (rule.template === 'player-must-play') set(rule.params.inning, rule.params.position, rule.params.player)
    if (rule.template === 'player-sits-inning') used[rule.params.inning].add(rule.params.player)
  }

  // ── STEP 2: Team 3 infield lock ────────────────────────────────────────────
  if (enabled.has('team3-lock')) {
    for (const g of GROUPS) {
      const starter = depthCharts[g]?.[0]
      if (starter) { set('inn3', GROUP_INFIELD[g], starter); set('inn4', GROUP_INFIELD[g], starter) }
    }
  }

  // ── STEP 3: Battery ────────────────────────────────────────────────────────
  const p12 = depthCharts.P12 || [], p34 = depthCharts.P34 || []
  const c12 = depthCharts.C12 || [], c34 = depthCharts.C34 || []

  const sp = firstAvailable(p12, 'inn1')
  set('inn1', 'P', sp)
  if (sp && !used['inn2'].has(sp)) set('inn2', 'P', sp)
  else set('inn2', 'P', firstAvailable(p12, 'inn2'))

  if (enabled.has('rotate-battery') && p34.length > 1) {
    set('inn3', 'P', p34[0])
    set('inn4', 'P', p34.find((p, i) => i > 0 && !used['inn4'].has(p)) || firstAvailable(p34, 'inn4'))
  } else {
    set('inn3', 'P', firstAvailable(p34, 'inn3'))
    set('inn4', 'P', firstAvailable(p34, 'inn4'))
  }

  const sc = firstAvailable(c12, 'inn1')
  set('inn1', 'C', sc)
  if (sc && !used['inn2'].has(sc)) set('inn2', 'C', sc)
  else set('inn2', 'C', firstAvailable(c12, 'inn2'))
  set('inn3', 'C', firstAvailable(c34, 'inn3'))
  set('inn4', 'C', c34.find((p, i) => i > 0 && !used['inn4'].has(p)) || firstAvailable(c34, 'inn4'))

  // ── STEP 4: Group positions ────────────────────────────────────────────────
  for (const inning of INNINGS) {
    for (const g of GROUPS) {
      const chart = depthCharts[g] || []
      const inf   = GROUP_INFIELD[g], of_ = GROUP_OF[g]
      const ls    = enabled.has('team3-lock') ? chart[0] : null
      if (inning === 'inn1') {
        if (ls && !lineup[inning][of_]) set(inning, of_, ls)
        if (!lineup[inning][inf]) {
          const bk = ls ? chart.find(p => p !== ls && !used[inning].has(p)) : null
          if (bk) set(inning, inf, bk); else set(inning, inf, firstAvailable(chart, inning))
        }
        if (!lineup[inning][of_]) set(inning, of_, firstAvailable(chart, inning))
      } else if (inning === 'inn2') {
        // Rotate: inn1's OF player → infield, inn1's infield player → OF
        // This ensures each group player covers both positions across the two early innings
        const prev_inf = lineup['inn1'][inf]
        const prev_of  = lineup['inn1'][of_]
        if (!lineup[inning][inf] && prev_of && chart.includes(prev_of) && !used[inning].has(prev_of)) {
          set(inning, inf, prev_of)
        }
        if (!lineup[inning][of_] && prev_inf && chart.includes(prev_inf) && !used[inning].has(prev_inf)) {
          set(inning, of_, prev_inf)
        }
        // Fall back to standard if rotation didn't fill
        if (!lineup[inning][inf]) {
          const bk = ls ? chart.find(p => p !== ls && !used[inning].has(p)) : null
          if (bk) set(inning, inf, bk); else set(inning, inf, firstAvailable(chart, inning))
        }
        if (!lineup[inning][of_]) {
          if (ls && !used[inning].has(ls)) set(inning, of_, ls)
          if (!lineup[inning][of_]) set(inning, of_, firstAvailable(chart, inning))
        }
      } else {
        if (!lineup[inning][inf]) set(inning, inf, firstAvailable(chart, inning))
        if (!lineup[inning][of_]) set(inning, of_, firstAvailable(chart, inning))
      }
    }
  }

  // ── STEP 5: Coverage pass ──────────────────────────────────────────────────
  if (enabled.has('group-coverage')) {
    for (const g of GROUPS) {
      const chart = depthCharts[g] || [], inf = GROUP_INFIELD[g], of_ = GROUP_OF[g]
      for (const player of chart) {
        const pc = INNINGS.filter(i => lineup[i].P === player || lineup[i].C === player).length
        if (pc >= 2) continue
        const ii = INNINGS.filter(i => lineup[i][inf] === player)
        const oi = INNINGS.filter(i => lineup[i][of_] === player)
        if (ii.length === 0 && oi.length > 0 && pc === 0) {
          for (const i of oi) { if (lineup[i][inf]) continue; const s = chart.find(p => p !== player && !used[i].has(p)); unset(i, of_); set(i, inf, player); if (s) set(i, of_, s); break }
        }
        if (oi.length === 0 && ii.length > 0 && pc === 0) {
          for (const i of ii) { if (lineup[i][of_]) continue; const s = chart.find(p => p !== player && !used[i].has(p)); unset(i, inf); set(i, of_, player); if (s) set(i, inf, s); break }
        }
      }
    }
  }

  // ── STEP 6: Fill empty OF ──────────────────────────────────────────────────
  const floaters = players.filter(p => p.floater).map(p => p.id)
  const allIds   = players.map(p => p.id)
  for (const inning of INNINGS) {
    for (const pos of ['LF', 'LC', 'RC', 'RF']) {
      if (!lineup[inning][pos]) {
        const filler = floaters.find(p => !used[inning].has(p)) || allIds.find(p => !used[inning].has(p))
        if (filler) set(inning, pos, filler)
      }
    }
  }

  // ── STEP 7: Max-innings custom rules ───────────────────────────────────────
  for (const rule of customRules.filter(r => r.template === 'max-innings')) {
    const { player, max } = rule.params
    let count = INNINGS.filter(i => Object.values(lineup[i]).includes(player)).length
    for (const i of [...INNINGS].reverse()) {
      if (count <= max) break
      const pos = Object.keys(lineup[i]).find(k => lineup[i][k] === player)
      if (pos) { unset(i, pos); count-- }
    }
  }

  // ── STEP 8: Balance pass (fairness) ───────────────────────────────────────
  // Uses historical balance to prioritise under-served players and free innings
  // from over-served ones.  No player finishes below TARGET_MIN, no consecutive sits.

  const playInn     = (pid) => INNINGS.filter(i => Object.values(lineup[i]).includes(pid))
  const hasConsecSits = (pl) => {
    const si = INNINGS.reduce((a, inn, i) => { if (!pl.includes(inn)) a.push(i); return a }, [])
    for (let i = 0; i < si.length - 1; i++) if (si[i + 1] === si[i] + 1) return true
    return false
  }

  // Valid (no-consecutive-sits) 2-inning play patterns
  const validPairs = []
  for (let i = 0; i < INNINGS.length; i++)
    for (let j = i + 1; j < INNINGS.length; j++)
      if (!hasConsecSits([INNINGS[i], INNINGS[j]])) validPairs.push([INNINGS[i], INNINGS[j]])

  const bpos = (p, inn) => {
    const r = []
    if (p.floater || !p.group) {
      r.push('LF', 'LC', 'RC', 'RF')
    } else {
      r.push(GROUP_OF[p.group])
      if (inn === 'inn1' || inn === 'inn2') r.push(GROUP_INFIELD[p.group])
    }
    return r
  }

  // Find a slot in targetInn for player, preferring to displace the most over-served occupant.
  // plannedBenches: { [inning]: playerId } benches already committed in this iteration.
  const findSlot = (player, targetInn, plannedBenches) => {
    if (used[targetInn].has(player.id)) return null
    const positions = bpos(player, targetInn)
      .sort((a, b) => (balance[lineup[targetInn][b]] || 0) - (balance[lineup[targetInn][a]] || 0))
    for (const pos of positions) {
      const occ = lineup[targetInn][pos]
      if (!occ) return { pos, displaced: null }
      const extra   = Object.entries(plannedBenches).filter(([, o]) => o === occ).map(([i]) => i)
      const newPlay = playInn(occ).filter(i => i !== targetInn && !extra.includes(i))
      if (newPlay.length < TARGET_MIN_INNINGS || hasConsecSits(newPlay)) continue
      return { pos, displaced: occ }
    }
    return null
  }

  // 8a: Release one inning from each player whose historical balance exceeds +1.0.
  //     Prefers freeing an OF inning; falls back to handing a P/C slot to a backup
  //     so battery starters (who have no OF innings) can also sit an early inning.
  for (const player of players) {
    if ((balance[player.id] || 0) < 1.0) continue
    const cur = playInn(player.id)
    if (cur.length <= TARGET_MIN_INNINGS) continue

    let freed = false

    // Try OF first
    for (const inn of [...INNINGS].reverse()) {
      const pos = ['LF', 'LC', 'RC', 'RF'].find(p => lineup[inn][p] === player.id)
      if (!pos) continue
      const newPlay = cur.filter(i => i !== inn)
      if (newPlay.length < TARGET_MIN_INNINGS || hasConsecSits(newPlay)) continue
      unset(inn, pos)
      freed = true
      break
    }

    // If no OF available, try handing off a P or C slot in inn1/inn2 to a backup
    if (!freed) {
      for (const inn of ['inn2', 'inn1']) {
        const battPos = lineup[inn]?.P === player.id ? 'P'
                      : lineup[inn]?.C === player.id ? 'C'
                      : null
        if (!battPos) continue
        const chart = battPos === 'P' ? p12 : c12
        const repl  = chart.find(p => p !== player.id && !used[inn].has(p))
        if (!repl) continue
        const newPlay = cur.filter(i => i !== inn)
        if (newPlay.length < TARGET_MIN_INNINGS || hasConsecSits(newPlay)) continue
        unset(inn, battPos)
        set(inn, battPos, repl)
        break
      }
    }
  }

  // 8b: Insert under-served players (< TARGET_MIN).
  //     Sort by (current innings + balance) so historically owed players go first.
  for (let iter = 0; iter < 30; iter++) {
    const cnt   = {}
    for (const p of players) cnt[p.id] = playInn(p.id).length
    const under = players
      .filter(p => cnt[p.id] < TARGET_MIN_INNINGS)
      .sort((a, b) => (cnt[a.id] + (balance[a.id] || 0)) - (cnt[b.id] + (balance[b.id] || 0)))
    if (!under.length) break

    let improved = false
    for (const player of under) {
      const cp = playInn(player.id)
      if (cp.length === 0) {
        for (const [iA, iB] of validPairs) {
          const s1 = findSlot(player, iA, {})
          if (!s1) continue
          const s2 = findSlot(player, iB, { [iA]: s1.displaced })
          if (!s2) continue
          if (s1.displaced) unset(iA, s1.pos)
          set(iA, s1.pos, player.id)
          if (s2.displaced) unset(iB, s2.pos)
          set(iB, s2.pos, player.id)
          improved = true
          break
        }
      } else {
        for (const ti of INNINGS) {
          if (cp.includes(ti) || used[ti].has(player.id)) continue
          if (hasConsecSits([...cp, ti])) continue
          const s = findSlot(player, ti, {})
          if (!s) continue
          if (s.displaced) unset(ti, s.pos)
          set(ti, s.pos, player.id)
          improved = true
          break
        }
      }
      if (improved) break
    }
    if (!improved) break
  }

  // 8c: Fill OF slots freed by 8a — give bonus innings to most under-served eligible players
  for (const inning of INNINGS) {
    for (const pos of ['LF', 'LC', 'RC', 'RF']) {
      if (lineup[inning][pos]) continue
      const eligible = players
        .filter(p => {
          if (used[inning].has(p.id)) return false
          if (!bpos(p, inning).includes(pos)) return false
          return !hasConsecSits([...playInn(p.id), inning])
        })
        .sort((a, b) =>
          (playInn(a.id).length + (balance[a.id] || 0)) -
          (playInn(b.id).length + (balance[b.id] || 0))
        )
      if (eligible.length) set(inning, pos, eligible[0].id)
    }
  }

  // 8d: Last resort — place any player still below TARGET_MIN in any available OF slot.
  //     Ignores group constraints. Fires only when group-based placement couldn't help
  //     (e.g. a player with no group, or an overflow group that exceeds available slots).
  const findAnyOFSlot = (player, tInn, plannedBenches) => {
    if (used[tInn].has(player.id)) return null
    const positions = ['LF', 'LC', 'RC', 'RF']
      .sort((a, b) => (balance[lineup[tInn][b]] || 0) - (balance[lineup[tInn][a]] || 0))
    for (const pos of positions) {
      const occ = lineup[tInn][pos]
      if (!occ) return { pos, displaced: null }
      const extra   = Object.entries(plannedBenches).filter(([, o]) => o === occ).map(([i]) => i)
      const newPlay = playInn(occ).filter(i => i !== tInn && !extra.includes(i))
      if (newPlay.length < TARGET_MIN_INNINGS || hasConsecSits(newPlay)) continue
      return { pos, displaced: occ }
    }
    return null
  }

  for (let iter = 0; iter < 30; iter++) {
    const cnt = {}
    for (const p of players) cnt[p.id] = playInn(p.id).length
    const stuck = players
      .filter(p => cnt[p.id] < TARGET_MIN_INNINGS)
      .sort((a, b) => cnt[a.id] - cnt[b.id])
    if (!stuck.length) break

    let improved = false
    for (const player of stuck) {
      const cp = playInn(player.id)
      if (cp.length === 0) {
        for (const [iA, iB] of validPairs) {
          const s1 = findAnyOFSlot(player, iA, {})
          if (!s1) continue
          const s2 = findAnyOFSlot(player, iB, { [iA]: s1.displaced })
          if (!s2) continue
          if (s1.displaced) unset(iA, s1.pos)
          set(iA, s1.pos, player.id)
          if (s2.displaced) unset(iB, s2.pos)
          set(iB, s2.pos, player.id)
          improved = true
          break
        }
      } else {
        for (const ti of INNINGS) {
          if (cp.includes(ti) || used[ti].has(player.id)) continue
          if (hasConsecSits([...cp, ti])) continue
          const s = findAnyOFSlot(player, ti, {})
          if (!s) continue
          if (s.displaced) unset(ti, s.pos)
          set(ti, s.pos, player.id)
          improved = true
          break
        }
      }
      if (improved) break
    }
    if (!improved) break
  }

  return lineup
}

export function getBench(lineup, players) {
  const result = {}
  for (const inning of INNINGS) {
    const active = new Set(Object.values(lineup[inning]).filter(Boolean))
    result[inning] = players.map(p => p.id).filter(p => !active.has(p))
  }
  return result
}

export function getInningCounts(lineup, players) {
  const counts = {}
  for (const p of players) counts[p.id] = 0
  for (const inning of INNINGS) {
    for (const player of Object.values(lineup[inning])) {
      if (player && counts[player] !== undefined) counts[player]++
    }
  }
  return counts
}
