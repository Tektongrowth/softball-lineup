// Run: node test-engine.mjs

const INNINGS = ['inn1', 'inn2', 'inn3', 'inn4']
const GROUP_INFIELD = { A: '3B', B: 'SS', C: '2B', D: '1B' }
const GROUP_OF      = { A: 'LF', B: 'LC', C: 'RC', D: 'RF' }
const GROUPS = ['A', 'B', 'C', 'D']
const POS_TO_GROUP  = { '3B':'A', LF:'A', SS:'B', LC:'B', '2B':'C', RC:'C', '1B':'D', RF:'D' }
const TARGET_MIN = 2

const PLAYERS = [
  { id: 'Anna',      group: 'B', floater: false },
  { id: 'Moon',      group: 'A', floater: false },
  { id: 'Lena',      group: 'D', floater: false },
  { id: 'Jordyn',    group: 'A', floater: false },
  { id: 'Malia',     group: 'B', floater: false },
  { id: 'Athena',    group: 'A', floater: false },
  { id: 'Cathyann',  group: 'B', floater: false },
  { id: 'Niya',      group: 'C', floater: false },
  { id: 'Amara',     group: 'C', floater: false },
  { id: 'Hailey',    group: 'D', floater: false },
  { id: 'Scarlett',  group: 'C', floater: false },
  { id: 'Giulietta', group: 'C', floater: false },
  { id: 'Olivia',    group: 'D', floater: false },
  { id: 'Sienna',    group: null, floater: true  },
]
const DEPTH = {
  A:   ['Moon','Jordyn','Athena'],
  B:   ['Anna','Malia','Cathyann'],
  C:   ['Niya','Amara','Scarlett','Giulietta'],
  D:   ['Lena','Hailey','Olivia'],
  P12: ['Anna','Lena','Moon','Niya'],
  P34: ['Jordyn','Malia'],
  C12: ['Moon','Lena'],
  C34: ['Amara','Cathyann','Hailey'],
}
const RULES = [
  { id:'team3-lock',       type:'builtin', enabled:true },
  { id:'group-constraint', type:'builtin', enabled:true },
  { id:'catcher-12',       type:'builtin', enabled:true },
  { id:'pitcher-12',       type:'builtin', enabled:true },
  { id:'pitcher-34',       type:'builtin', enabled:true },
  { id:'group-coverage',   type:'builtin', enabled:true },
  { id:'rotate-battery',   type:'builtin', enabled:true },
]

// ── calcBalance (mirrors src/engine/autoAssign.js) ────────────────────────────
function calcBalance(players, gameHistory) {
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

// ── autoAssign (mirrors src/engine/autoAssign.js) ─────────────────────────────
function autoAssign(players, depthCharts, rules, gameHistory = []) {
  const enabled     = new Set(rules.filter(r => r.enabled).map(r => r.id))
  const customRules = rules.filter(r => r.type === 'custom' && r.enabled)
  const balance     = calcBalance(players, gameHistory)

  const lineup = { inn1:{}, inn2:{}, inn3:{}, inn4:{} }
  const used   = { inn1:new Set(), inn2:new Set(), inn3:new Set(), inn4:new Set() }

  const set = (inning, pos, player) => {
    if (!player || used[inning].has(player)) return false
    lineup[inning][pos] = player; used[inning].add(player); return true
  }
  const unset = (inning, pos) => {
    const p = lineup[inning][pos]; if (!p) return null
    delete lineup[inning][pos]; used[inning].delete(p); return p
  }
  const firstAvail = (chart, inn) => (chart||[]).find(p => !used[inn].has(p))

  // Step 1: Custom rules
  for (const rule of customRules) {
    if (rule.template === 'player-must-play') set(rule.params.inning, rule.params.position, rule.params.player)
    if (rule.template === 'player-sits-inning') used[rule.params.inning].add(rule.params.player)
  }

  // Step 2: Team3 lock
  if (enabled.has('team3-lock')) {
    for (const g of GROUPS) { const s=depthCharts[g]?.[0]; if(s){set('inn3',GROUP_INFIELD[g],s);set('inn4',GROUP_INFIELD[g],s)} }
  }

  // Step 3: Battery
  const p12=depthCharts.P12||[], p34=depthCharts.P34||[], c12=depthCharts.C12||[], c34=depthCharts.C34||[]
  const sp=firstAvail(p12,'inn1'); set('inn1','P',sp)
  if(sp&&!used['inn2'].has(sp)) set('inn2','P',sp); else set('inn2','P',firstAvail(p12,'inn2'))
  if(enabled.has('rotate-battery')&&p34.length>1){set('inn3','P',p34[0]);set('inn4','P',p34.find((p,i)=>i>0&&!used['inn4'].has(p))||firstAvail(p34,'inn4'))}
  else{set('inn3','P',firstAvail(p34,'inn3'));set('inn4','P',firstAvail(p34,'inn4'))}
  const sc=firstAvail(c12,'inn1'); set('inn1','C',sc)
  if(sc&&!used['inn2'].has(sc)) set('inn2','C',sc); else set('inn2','C',firstAvail(c12,'inn2'))
  set('inn3','C',firstAvail(c34,'inn3'))
  set('inn4','C',c34.find((p,i)=>i>0&&!used['inn4'].has(p))||firstAvail(c34,'inn4'))

  // Step 4: Group positions
  for (const inn of INNINGS) {
    for (const g of GROUPS) {
      const chart=depthCharts[g]||[], inf=GROUP_INFIELD[g], of_=GROUP_OF[g]
      const ls=enabled.has('team3-lock')?chart[0]:null
      if(inn==='inn1'){
        if(ls&&!lineup[inn][of_]) set(inn,of_,ls)
        if(!lineup[inn][inf]){const bk=ls?chart.find(p=>p!==ls&&!used[inn].has(p)):null; if(bk)set(inn,inf,bk); else set(inn,inf,firstAvail(chart,inn))}
        if(!lineup[inn][of_]) set(inn,of_,firstAvail(chart,inn))
      } else if(inn==='inn2'){
        const pi=lineup['inn1'][inf], po=lineup['inn1'][of_]
        if(!lineup[inn][inf]&&po&&chart.includes(po)&&!used[inn].has(po)) set(inn,inf,po)
        if(!lineup[inn][of_]&&pi&&chart.includes(pi)&&!used[inn].has(pi)) set(inn,of_,pi)
        if(!lineup[inn][inf]){const bk=ls?chart.find(p=>p!==ls&&!used[inn].has(p)):null; if(bk)set(inn,inf,bk); else set(inn,inf,firstAvail(chart,inn))}
        if(!lineup[inn][of_]){if(ls&&!used[inn].has(ls))set(inn,of_,ls); if(!lineup[inn][of_])set(inn,of_,firstAvail(chart,inn))}
      } else {
        if(!lineup[inn][inf]) set(inn,inf,firstAvail(chart,inn))
        if(!lineup[inn][of_]) set(inn,of_,firstAvail(chart,inn))
      }
    }
  }

  // Step 5: Coverage pass
  if(enabled.has('group-coverage')){
    for(const g of GROUPS){const chart=depthCharts[g]||[],inf=GROUP_INFIELD[g],of_=GROUP_OF[g]
      for(const player of chart){
        const pc=INNINGS.filter(i=>lineup[i].P===player||lineup[i].C===player).length; if(pc>=2)continue
        const ii=INNINGS.filter(i=>lineup[i][inf]===player),oi=INNINGS.filter(i=>lineup[i][of_]===player)
        if(ii.length===0&&oi.length>0&&pc===0){for(const i of oi){if(lineup[i][inf])continue;const s=chart.find(p=>p!==player&&!used[i].has(p));unset(i,of_);set(i,inf,player);if(s)set(i,of_,s);break}}
        if(oi.length===0&&ii.length>0&&pc===0){for(const i of ii){if(lineup[i][of_])continue;const s=chart.find(p=>p!==player&&!used[i].has(p));unset(i,inf);set(i,of_,player);if(s)set(i,inf,s);break}}
      }
    }
  }

  // Step 6: Fill empty OF
  const fl=players.filter(p=>p.floater).map(p=>p.id), all=players.map(p=>p.id)
  for(const inn of INNINGS)for(const pos of['LF','LC','RC','RF']){if(!lineup[inn][pos]){const f=fl.find(p=>!used[inn].has(p))||all.find(p=>!used[inn].has(p));if(f)set(inn,pos,f)}}

  // Step 7: Max-innings custom rules
  for(const rule of customRules.filter(r=>r.template==='max-innings')){
    const{player,max}=rule.params; let cnt=INNINGS.filter(i=>Object.values(lineup[i]).includes(player)).length
    for(const i of[...INNINGS].reverse()){if(cnt<=max)break;const pos=Object.keys(lineup[i]).find(k=>lineup[i][k]===player);if(pos){unset(i,pos);cnt--}}
  }

  // Step 8: Balance pass
  const playInn = (pid) => INNINGS.filter(inn => Object.values(lineup[inn]).includes(pid))
  const hasCS = (pl) => {
    const si=INNINGS.reduce((a,inn,i)=>{if(!pl.includes(inn))a.push(i);return a},[])
    for(let i=0;i<si.length-1;i++)if(si[i+1]===si[i]+1)return true; return false
  }
  const vp=[]; for(let i=0;i<INNINGS.length;i++)for(let j=i+1;j<INNINGS.length;j++)if(!hasCS([INNINGS[i],INNINGS[j]]))vp.push([INNINGS[i],INNINGS[j]])
  const bpos=(p,inn)=>{const r=[];if(p.floater){r.push('LF','LC','RC','RF')}else if(p.group){r.push(GROUP_OF[p.group]);if(inn==='inn1'||inn==='inn2')r.push(GROUP_INFIELD[p.group])};return r}

  const findSlot=(player,targetInn,planned)=>{
    if(used[targetInn].has(player.id))return null
    const positions=bpos(player,targetInn)
      .sort((a,b)=>(balance[lineup[targetInn][b]]||0)-(balance[lineup[targetInn][a]]||0))
    for(const pos of positions){
      const occ=lineup[targetInn][pos]; if(!occ)return{pos,displaced:null}
      const ex=Object.entries(planned).filter(([,o])=>o===occ).map(([i])=>i)
      const np=playInn(occ).filter(i=>i!==targetInn&&!ex.includes(i))
      if(np.length<TARGET_MIN||hasCS(np))continue
      return{pos,displaced:occ}
    }; return null
  }

  // 8a: Release 1 inning from over-served players; falls back to handing off P/C if no OF available
  // 8a extended: also hand off P/C if no OF to free
  for (const player of players) {
    if ((balance[player.id] || 0) < 1.0) continue
    const cur = playInn(player.id)
    if (cur.length <= TARGET_MIN) continue
    let freed = false
    for (const inn of [...INNINGS].reverse()) {
      const pos=['LF','LC','RC','RF'].find(p=>lineup[inn][p]===player.id); if(!pos)continue
      const np=cur.filter(i=>i!==inn); if(np.length<TARGET_MIN||hasCS(np))continue
      unset(inn,pos); freed=true; break
    }
    if(!freed){
      for(const inn of['inn2','inn1']){
        const bp=lineup[inn]?.P===player.id?'P':lineup[inn]?.C===player.id?'C':null; if(!bp)continue
        const chart=bp==='P'?DEPTH.P12:DEPTH.C12
        const repl=chart.find(p=>p!==player.id&&!used[inn].has(p)); if(!repl)continue
        const np=cur.filter(i=>i!==inn); if(np.length<TARGET_MIN||hasCS(np))continue
        unset(inn,bp); set(inn,bp,repl); break
      }
    }
  }

  for(let iter=0;iter<30;iter++){
    const cnt={}; for(const p of players)cnt[p.id]=playInn(p.id).length
    const under=players.filter(p=>cnt[p.id]<TARGET_MIN)
      .sort((a,b)=>(cnt[a.id]+(balance[a.id]||0))-(cnt[b.id]+(balance[b.id]||0)))
    if(!under.length)break; let ok=false
    for(const player of under){
      const cp=playInn(player.id)
      if(cp.length===0){
        for(const[iA,iB]of vp){
          const s1=findSlot(player,iA,{}); if(!s1)continue
          const s2=findSlot(player,iB,{[iA]:s1.displaced}); if(!s2)continue
          if(s1.displaced)unset(iA,s1.pos); set(iA,s1.pos,player.id)
          if(s2.displaced)unset(iB,s2.pos); set(iB,s2.pos,player.id)
          ok=true; break
        }
      } else {
        for(const ti of INNINGS){
          if(cp.includes(ti)||used[ti].has(player.id))continue
          if(hasCS([...cp,ti]))continue
          const s=findSlot(player,ti,{}); if(!s)continue
          if(s.displaced)unset(ti,s.pos); set(ti,s.pos,player.id)
          ok=true; break
        }
      }
      if(ok)break
    }
    if(!ok)break
  }

  // 8c: Fill OF slots freed by 8a — give bonus innings to most under-served eligible players
  for (const inning of INNINGS) {
    for (const pos of ['LF','LC','RC','RF']) {
      if (lineup[inning][pos]) continue
      const eligible = players
        .filter(p => {
          if (used[inning].has(p.id)) return false
          if (!bpos(p, inning).includes(pos)) return false
          return !hasCS([...playInn(p.id), inning])
        })
        .sort((a,b) => (playInn(a.id).length+(balance[a.id]||0)) - (playInn(b.id).length+(balance[b.id]||0)))
      if (eligible.length) set(inning, pos, eligible[0].id)
    }
  }

  return lineup
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCounts(lineup, players) {
  const counts = {}
  for (const p of players) counts[p.id] = 0
  for (const inn of INNINGS) for (const player of Object.values(lineup[inn])) {
    if (player && counts[player] !== undefined) counts[player]++
  }
  return counts
}

function checkLineup(lineup) {
  const errs = []
  const p12s=new Set(DEPTH.P12),p34s=new Set(DEPTH.P34),c12s=new Set(DEPTH.C12)
  for (const inn of INNINGS) {
    const innObj = lineup[inn], seen = {}
    for (const [pos, player] of Object.entries(innObj)) {
      if (!player) continue
      if (seen[player]) errs.push(`DUPLICATE ${player} in ${inn}`)
      seen[player] = true
      if (pos !== 'P' && pos !== 'C') {
        const pg = POS_TO_GROUP[pos]
        const pd = PLAYERS.find(p => p.id === player)
        if (pd && !pd.floater && pd.group !== pg) errs.push(`GROUP ${player}(${pd.group}) at ${pos}(${pg}) in ${inn}`)
      }
    }
    if ((inn==='inn1'||inn==='inn2') && innObj.C && !c12s.has(innObj.C)) errs.push(`CATCHER ${innObj.C} not in C12 (${inn})`)
    if ((inn==='inn1'||inn==='inn2') && innObj.P && !p12s.has(innObj.P)) errs.push(`PITCHER ${innObj.P} not in P12 (${inn})`)
    if ((inn==='inn3'||inn==='inn4') && innObj.P && !p34s.has(innObj.P)) errs.push(`PITCHER ${innObj.P} not in P34 (${inn})`)
  }
  const posMap={A:'3B',B:'SS',C:'2B',D:'1B'}
  for (const g of GROUPS) {
    const locked=DEPTH[g][0]; if(!locked) continue
    for (const inn of ['inn3','inn4']) {
      const actual=lineup[inn]?.[posMap[g]]
      if (actual && actual !== locked) errs.push(`LOCK ${posMap[g]} should be ${locked}, got ${actual} (${inn})`)
    }
  }
  // consecutive-sits and low-innings
  for (const p of PLAYERS) {
    const plays = INNINGS.filter(inn => Object.values(lineup[inn]).includes(p.id))
    const sits  = INNINGS.filter(inn => !plays.includes(inn))
    const si    = sits.map(s => INNINGS.indexOf(s))
    for (let i = 0; i < si.length - 1; i++) if (si[i+1] === si[i]+1) errs.push(`CONSEC_SIT ${p.id}`)
    if (plays.length < 2) errs.push(`LOW_INN ${p.id} (${plays.length})`)
  }
  return errs
}

// ── Single-game output ────────────────────────────────────────────────────────
const ALL_POS = ['P','C','3B','SS','2B','1B','LF','LC','RC','RF']

function printGame(gameNum, lineup, counts, balance) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(` GAME ${gameNum}`)
  console.log('═'.repeat(60))

  for (const inn of INNINGS) {
    console.log(`\n  ${inn}:`)
    for (const pos of ALL_POS) {
      const p = lineup[inn][pos]
      console.log(`    ${pos.padEnd(3)} → ${(p||'—').padEnd(10)}`)
    }
  }

  console.log(`\n  Innings played:`)
  for (const p of PLAYERS) {
    const plays = INNINGS.filter(inn => Object.values(lineup[inn]).includes(p.id))
    const bal   = balance[p.id] ?? 0
    const balStr = bal > 0.05 ? `+${bal.toFixed(2)}` : bal < -0.05 ? bal.toFixed(2) : '  0.00'
    const flag   = plays.length < 2 ? ' ✗LOW' : ''
    console.log(`    ${p.id.padEnd(10)} ${plays.length} inn  bal→${balStr}${flag}`)
  }

  const errs = checkLineup(lineup)
  if (errs.length) {
    console.log(`\n  ✗ Violations:`)
    errs.forEach(e => console.log(`    · ${e}`))
  } else {
    console.log(`\n  ✓ No violations`)
  }
  return errs.length === 0
}

// ── Multi-game simulation ─────────────────────────────────────────────────────
const NUM_GAMES = 6
const gameHistory = []
let allGamesPass = true

for (let g = 1; g <= NUM_GAMES; g++) {
  const lineup = autoAssign(PLAYERS, DEPTH, RULES, gameHistory)
  const counts = getCounts(lineup, PLAYERS)

  // Balance AFTER this game (what the UI shows in the modal)
  const postBalance = calcBalance(PLAYERS, [...gameHistory, { counts }])

  const pass = printGame(g, lineup, counts, postBalance)
  if (!pass) allGamesPass = false

  gameHistory.push({ id: `game-${g}`, label: `Game ${g}`, date: `Day ${g}`, counts })
}

// ── Cumulative innings table ──────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`)
console.log(' CUMULATIVE INNINGS OVER ALL GAMES')
console.log('═'.repeat(60))
const header = '  Player     ' + Array.from({length: NUM_GAMES}, (_, i) => `G${i+1}`).join('  ') + '  Total  Balance'
console.log(header)
for (const p of PLAYERS) {
  const perGame = gameHistory.map(g => g.counts[p.id] ?? 0)
  const total   = perGame.reduce((s, n) => s + n, 0)
  const bal     = calcBalance(PLAYERS, gameHistory)[p.id] ?? 0
  const balStr  = bal > 0.05 ? `+${bal.toFixed(2)}` : bal < -0.05 ? bal.toFixed(2) : '  0.00'
  console.log(`  ${p.id.padEnd(10)} ${perGame.map(n => String(n).padStart(2)).join('   ')}    ${String(total).padStart(3)}     ${balStr}`)
}

console.log(`\n  ${allGamesPass ? '✅ ALL GAMES PASS' : '❌ ISSUES FOUND'}\n`)
