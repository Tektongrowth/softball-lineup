// node test-stress.mjs — stress tests for autoAssign edge cases
// Self-contained: no imports needed.

const INNINGS = ['inn1','inn2','inn3','inn4']
const GROUP_INFIELD = { A:'3B', B:'SS', C:'2B', D:'1B' }
const GROUP_OF      = { A:'LF', B:'LC', C:'RC', D:'RF' }
const GROUPS = ['A','B','C','D']
const TARGET_MIN = 2

function calcBalance(players, history) {
  const b = {}
  for (const p of players) b[p.id] = 0
  for (const game of history) {
    const vals = Object.values(game.counts)
    if (!vals.length) continue
    const fair = vals.reduce((s,v) => s+v, 0) / vals.length
    for (const [pid, cnt] of Object.entries(game.counts))
      if (b[pid] !== undefined) b[pid] += cnt - fair
  }
  return b
}

function autoAssign(players, dc, rules, history = []) {
  const enabled  = new Set(rules.filter(r => r.enabled).map(r => r.id))
  const custom   = rules.filter(r => r.type === 'custom' && r.enabled)
  const balance  = calcBalance(players, history)
  const lineup   = { inn1:{}, inn2:{}, inn3:{}, inn4:{} }
  const used     = { inn1:new Set(), inn2:new Set(), inn3:new Set(), inn4:new Set() }

  const set = (inn, pos, p) => {
    if (!p || used[inn].has(p)) return false
    lineup[inn][pos] = p; used[inn].add(p); return true
  }
  const unset = (inn, pos) => {
    const p = lineup[inn][pos]; if (!p) return null
    delete lineup[inn][pos]; used[inn].delete(p); return p
  }
  const first = (chart, inn) => (chart||[]).find(p => !used[inn].has(p))

  // 1: custom rules
  for (const r of custom) {
    if (r.template === 'player-must-play') set(r.params.inning, r.params.position, r.params.player)
    if (r.template === 'player-sits-inning') used[r.params.inning].add(r.params.player)
  }

  // 2: team3 lock
  if (enabled.has('team3-lock'))
    for (const g of GROUPS) { const s=dc[g]?.[0]; if(s){set('inn3',GROUP_INFIELD[g],s);set('inn4',GROUP_INFIELD[g],s)} }

  // 3: battery
  const p12=dc.P12||[], p34=dc.P34||[], c12=dc.C12||[], c34=dc.C34||[]
  const sp=first(p12,'inn1'); set('inn1','P',sp)
  if(sp&&!used.inn2.has(sp)) set('inn2','P',sp); else set('inn2','P',first(p12,'inn2'))
  if(enabled.has('rotate-battery')&&p34.length>1){
    set('inn3','P',p34[0]); set('inn4','P',p34.find((_,i)=>i>0&&!used.inn4.has(p34[i]))||first(p34,'inn4'))
  } else { set('inn3','P',first(p34,'inn3')); set('inn4','P',first(p34,'inn4')) }
  const sc=first(c12,'inn1'); set('inn1','C',sc)
  if(sc&&!used.inn2.has(sc)) set('inn2','C',sc); else set('inn2','C',first(c12,'inn2'))
  set('inn3','C',first(c34,'inn3'))
  set('inn4','C',c34.find((_,i)=>i>0&&!used.inn4.has(c34[i]))||first(c34,'inn4'))

  // 4: group positions
  for (const inn of INNINGS) {
    for (const g of GROUPS) {
      const chart=dc[g]||[], inf=GROUP_INFIELD[g], of_=GROUP_OF[g]
      const ls=enabled.has('team3-lock')?chart[0]:null
      if (inn==='inn1') {
        if(ls&&!lineup[inn][of_]) set(inn,of_,ls)
        if(!lineup[inn][inf]){const bk=ls?chart.find(p=>p!==ls&&!used[inn].has(p)):null;if(bk)set(inn,inf,bk);else set(inn,inf,first(chart,inn))}
        if(!lineup[inn][of_]) set(inn,of_,first(chart,inn))
      } else if (inn==='inn2') {
        const pi=lineup.inn1[inf], po=lineup.inn1[of_]
        if(!lineup[inn][inf]&&po&&chart.includes(po)&&!used[inn].has(po)) set(inn,inf,po)
        if(!lineup[inn][of_]&&pi&&chart.includes(pi)&&!used[inn].has(pi)) set(inn,of_,pi)
        if(!lineup[inn][inf]){const bk=ls?chart.find(p=>p!==ls&&!used[inn].has(p)):null;if(bk)set(inn,inf,bk);else set(inn,inf,first(chart,inn))}
        if(!lineup[inn][of_]){if(ls&&!used[inn].has(ls))set(inn,of_,ls);if(!lineup[inn][of_])set(inn,of_,first(chart,inn))}
      } else {
        if(!lineup[inn][inf]) set(inn,inf,first(chart,inn))
        if(!lineup[inn][of_]) set(inn,of_,first(chart,inn))
      }
    }
  }

  // 5: coverage pass
  if (enabled.has('group-coverage')) {
    for (const g of GROUPS) {
      const chart=dc[g]||[], inf=GROUP_INFIELD[g], of_=GROUP_OF[g]
      for (const player of chart) {
        const pc=INNINGS.filter(i=>lineup[i].P===player||lineup[i].C===player).length; if(pc>=2)continue
        const ii=INNINGS.filter(i=>lineup[i][inf]===player), oi=INNINGS.filter(i=>lineup[i][of_]===player)
        if(ii.length===0&&oi.length>0&&pc===0)
          for(const i of oi){if(lineup[i][inf])continue;const s=chart.find(p=>p!==player&&!used[i].has(p));unset(i,of_);set(i,inf,player);if(s)set(i,of_,s);break}
        if(oi.length===0&&ii.length>0&&pc===0)
          for(const i of ii){if(lineup[i][of_])continue;const s=chart.find(p=>p!==player&&!used[i].has(p));unset(i,inf);set(i,of_,player);if(s)set(i,inf,s);break}
      }
    }
  }

  // 6: fill empty OF
  const fl=players.filter(p=>p.floater).map(p=>p.id), all=players.map(p=>p.id)
  for(const inn of INNINGS)for(const pos of['LF','LC','RC','RF'])
    if(!lineup[inn][pos]){const f=fl.find(p=>!used[inn].has(p))||all.find(p=>!used[inn].has(p));if(f)set(inn,pos,f)}

  // 7: max-innings custom rules
  for(const r of custom.filter(r=>r.template==='max-innings')){
    const{player,max}=r.params; let cnt=INNINGS.filter(i=>Object.values(lineup[i]).includes(player)).length
    for(const i of[...INNINGS].reverse()){if(cnt<=max)break;const pos=Object.keys(lineup[i]).find(k=>lineup[i][k]===player);if(pos){unset(i,pos);cnt--}}
  }

  // 8: balance pass
  const playInn = pid => INNINGS.filter(i => Object.values(lineup[i]).includes(pid))
  const hasCS = pl => {
    const si=INNINGS.reduce((a,inn,i)=>{if(!pl.includes(inn))a.push(i);return a},[])
    for(let i=0;i<si.length-1;i++)if(si[i+1]===si[i]+1)return true; return false
  }
  const vp=[]
  for(let i=0;i<INNINGS.length;i++)for(let j=i+1;j<INNINGS.length;j++)if(!hasCS([INNINGS[i],INNINGS[j]]))vp.push([INNINGS[i],INNINGS[j]])

  const bpos = (p, inn) => {
    const r = []
    if (p.floater || !p.group) {
      r.push('LF','LC','RC','RF')
    } else {
      r.push(GROUP_OF[p.group])
      if (inn === 'inn1' || inn === 'inn2') r.push(GROUP_INFIELD[p.group])
    }
    return r
  }

  const findSlot = (player, tInn, planned) => {
    if (used[tInn].has(player.id)) return null
    const positions = bpos(player, tInn).sort((a,b)=>(balance[lineup[tInn][b]]||0)-(balance[lineup[tInn][a]]||0))
    for (const pos of positions) {
      const occ = lineup[tInn][pos]; if (!occ) return { pos, displaced: null }
      const ex = Object.entries(planned).filter(([,o])=>o===occ).map(([i])=>i)
      const np = playInn(occ).filter(i=>i!==tInn&&!ex.includes(i))
      if (np.length < TARGET_MIN || hasCS(np)) continue
      return { pos, displaced: occ }
    }
    return null
  }

  // 8a: release 1 inning from over-served players
  for (const player of players) {
    if ((balance[player.id]||0) < 1.0) continue
    const cur = playInn(player.id); if (cur.length <= TARGET_MIN) continue
    let freed = false
    for (const inn of [...INNINGS].reverse()) {
      const pos=['LF','LC','RC','RF'].find(p=>lineup[inn][p]===player.id); if(!pos)continue
      const np=cur.filter(i=>i!==inn); if(np.length<TARGET_MIN||hasCS(np))continue
      unset(inn,pos); freed=true; break
    }
    if (!freed) {
      for (const inn of ['inn2','inn1']) {
        const bp=lineup[inn]?.P===player.id?'P':lineup[inn]?.C===player.id?'C':null; if(!bp)continue
        const chart=bp==='P'?p12:c12
        const repl=chart.find(p=>p!==player.id&&!used[inn].has(p)); if(!repl)continue
        const np=cur.filter(i=>i!==inn); if(np.length<TARGET_MIN||hasCS(np))continue
        unset(inn,bp); set(inn,bp,repl); break
      }
    }
  }

  // 8b: insert under-served players
  for (let iter=0;iter<30;iter++) {
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

  // 8c: fill freed OF slots
  for(const inn of INNINGS)for(const pos of['LF','LC','RC','RF']){
    if(lineup[inn][pos])continue
    const eligible=players.filter(p=>{
      if(used[inn].has(p.id))return false
      if(!bpos(p,inn).includes(pos))return false
      return !hasCS([...playInn(p.id),inn])
    }).sort((a,b)=>(playInn(a.id).length+(balance[a.id]||0))-(playInn(b.id).length+(balance[b.id]||0)))
    if(eligible.length)set(inn,pos,eligible[0].id)
  }

  // 8d: last resort — place players still below TARGET_MIN in any OF slot (ignores group)
  const findAnyOF=(player,tInn,planned)=>{
    if(used[tInn].has(player.id))return null
    const positions=['LF','LC','RC','RF'].sort((a,b)=>(balance[lineup[tInn][b]]||0)-(balance[lineup[tInn][a]]||0))
    for(const pos of positions){
      const occ=lineup[tInn][pos]; if(!occ)return{pos,displaced:null}
      const ex=Object.entries(planned).filter(([,o])=>o===occ).map(([i])=>i)
      const np=playInn(occ).filter(i=>i!==tInn&&!ex.includes(i))
      if(np.length<TARGET_MIN||hasCS(np))continue
      return{pos,displaced:occ}
    }; return null
  }
  for(let iter=0;iter<30;iter++){
    const cnt={}; for(const p of players)cnt[p.id]=playInn(p.id).length
    const stuck=players.filter(p=>cnt[p.id]<TARGET_MIN).sort((a,b)=>cnt[a.id]-cnt[b.id])
    if(!stuck.length)break; let ok=false
    for(const player of stuck){
      const cp=playInn(player.id)
      if(cp.length===0){
        for(const[iA,iB]of vp){
          const s1=findAnyOF(player,iA,{}); if(!s1)continue
          const s2=findAnyOF(player,iB,{[iA]:s1.displaced}); if(!s2)continue
          if(s1.displaced)unset(iA,s1.pos); set(iA,s1.pos,player.id)
          if(s2.displaced)unset(iB,s2.pos); set(iB,s2.pos,player.id)
          ok=true; break
        }
      } else {
        for(const ti of INNINGS){
          if(cp.includes(ti)||used[ti].has(player.id))continue
          if(hasCS([...cp,ti]))continue
          const s=findAnyOF(player,ti,{}); if(!s)continue
          if(s.displaced)unset(ti,s.pos); set(ti,s.pos,player.id)
          ok=true; break
        }
      }
      if(ok)break
    }
    if(!ok)break
  }

  return lineup
}

// ── Test runner ───────────────────────────────────────────────────────────────
const RULES = [
  { id:'team3-lock',       type:'builtin', enabled:true },
  { id:'group-constraint', type:'builtin', enabled:true },
  { id:'catcher-12',       type:'builtin', enabled:true },
  { id:'pitcher-12',       type:'builtin', enabled:true },
  { id:'pitcher-34',       type:'builtin', enabled:true },
  { id:'group-coverage',   type:'builtin', enabled:true },
  { id:'rotate-battery',   type:'builtin', enabled:true },
]

function innCount(lineup, pid) {
  return INNINGS.filter(i => Object.values(lineup[i]).includes(pid)).length
}

function check(label, players, dc, history = []) {
  const lineup = autoAssign(players, dc, RULES, history)
  const zeroes = [], ones = []
  for (const p of players) {
    const n = innCount(lineup, p.id)
    if (n === 0) zeroes.push(p.id)
    else if (n === 1) ones.push(p.id)
  }
  const ok = zeroes.length === 0 && ones.length === 0
  console.log(`${ok ? '✅' : '❌'} ${label}`)
  if (!ok) {
    if (zeroes.length) console.log(`     0 innings: ${zeroes.join(', ')}`)
    if (ones.length)   console.log(`     1 inning:  ${ones.join(', ')}`)
    for (const inn of INNINGS) {
      const slots = Object.entries(lineup[inn]).map(([p,v])=>`${p}=${v}`).join(' ')
      console.log(`     ${inn}: ${slots}`)
    }
  }
  return ok
}

// Shared base roster
const BASE = [
  { id:'Anna',      group:'B', floater:false },
  { id:'Moon',      group:'A', floater:false },
  { id:'Lena',      group:'D', floater:false },
  { id:'Jordyn',    group:'A', floater:false },
  { id:'Malia',     group:'B', floater:false },
  { id:'Athena',    group:'A', floater:false },
  { id:'Cathyann',  group:'B', floater:false },
  { id:'Niya',      group:'C', floater:false },
  { id:'Amara',     group:'C', floater:false },
  { id:'Hailey',    group:'D', floater:false },
  { id:'Scarlett',  group:'C', floater:false },
  { id:'Giulietta', group:'C', floater:false },
  { id:'Olivia',    group:'D', floater:false },
  { id:'Sienna',    group:null, floater:true  },
]
const BASE_DC = {
  A:['Moon','Jordyn','Athena'], B:['Anna','Malia','Cathyann'],
  C:['Niya','Amara','Scarlett','Giulietta'], D:['Lena','Hailey','Olivia'],
  P12:['Anna','Lena','Moon','Niya'], P34:['Jordyn','Malia'],
  C12:['Moon','Lena'], C34:['Amara','Cathyann','Hailey'],
}

let totalFails = 0

function test(label, players, dc, history) {
  if (!check(label, players, dc, history)) totalFails++
}

// 1: baseline
test('Baseline default config', BASE, BASE_DC)

// 2: player added with no group and not floater
test('Player with no group, not floater',
  [...BASE, { id:'NewGirl', group:null, floater:false }],
  BASE_DC
)

// 3: player with a group but missing from that group's depth chart
test('Player has group but is absent from depth chart',
  [...BASE, { id:'Ghost', group:'A', floater:false }],
  BASE_DC  // Ghost not in dc.A
)

// 4: six players in one group
test('6-player group C',
  [
    ...BASE.filter(p => p.group !== 'C' && p.id !== 'Sienna'),
    { id:'Niya',     group:'C', floater:false },
    { id:'Amara',    group:'C', floater:false },
    { id:'Scarlett', group:'C', floater:false },
    { id:'Giulietta',group:'C', floater:false },
    { id:'Sienna',   group:'C', floater:false },
    { id:'Extra',    group:'C', floater:false },
  ],
  { ...BASE_DC, C:['Niya','Amara','Scarlett','Giulietta','Sienna','Extra'] }
)

// 5: 4-player group A
test('4-player group A',
  BASE.map(p => p.id === 'Scarlett' ? { ...p, group:'A' } : p),
  { ...BASE_DC, A:['Moon','Jordyn','Athena','Scarlett'], C:['Niya','Amara','Giulietta'] }
)

// 6: sub-pitcher with no group — only on P12 chart, no field group
test('Battery-only player (no group, not floater)',
  [...BASE, { id:'SubP', group:null, floater:false }],
  { ...BASE_DC, P12:['Anna','Lena','Moon','Niya','SubP'] }
)

// 7: 12 players, no floaters
test('12 players, 3-player groups, no floater',
  BASE.filter(p => p.id !== 'Sienna'),
  { ...BASE_DC, C:['Niya','Amara','Scarlett'] }
)

// 8: simulate 6 games accumulating history
{
  console.log('\n── 6-game simulation ─────────────────────────────────────')
  const history = []; let fail = false
  for (let g = 1; g <= 6; g++) {
    const lineup = autoAssign(BASE, BASE_DC, RULES, history)
    const counts = {}; for (const p of BASE) counts[p.id] = innCount(lineup, p.id)
    const ok = check(`  Game ${g}`, BASE, BASE_DC, history)
    if (!ok) fail = true
    history.push({ id:`g${g}`, counts })
  }
  if (fail) totalFails++
  console.log(fail ? '  ❌ FAILURES' : '  ✅ ALL PASS')
}

// 9: with carry-over balance skewing under-served players
{
  console.log('\n── With history: Scarlett/Giulietta/Olivia owed innings ───')
  // Manually craft a history where group C/D 3rd-stringers are owed
  const fakeHistory = [
    { id:'h1', counts:{ Anna:4, Moon:4, Lena:3, Jordyn:3, Malia:4, Athena:3, Cathyann:3, Niya:3, Amara:2, Hailey:3, Scarlett:2, Giulietta:2, Olivia:2, Sienna:2 } },
    { id:'h2', counts:{ Anna:4, Moon:4, Lena:3, Jordyn:3, Malia:3, Athena:3, Cathyann:3, Niya:3, Amara:2, Hailey:3, Scarlett:2, Giulietta:2, Olivia:2, Sienna:3 } },
  ]
  if (!check('  After 2 games with under-served C/D players', BASE, BASE_DC, fakeHistory)) totalFails++
}

console.log(`\n${'─'.repeat(50)}`)
console.log(totalFails === 0 ? `✅ ALL SCENARIOS PASS` : `❌ ${totalFails} SCENARIO(S) FAILED`)
