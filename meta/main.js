import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm'
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm'

let commitsAll = []
let commitsNow = []
let xScale, yScale
const colors = d3.scaleOrdinal(d3.schemeTableau10)

/* ─── data load ────────────────────────────────────────────── */
async function loadData () {
  return d3.csv('loc.csv', r => ({
    ...r,
    line:+r.line, depth:+r.depth, length:+r.length,
    date:new Date(r.date+'T00:00'+r.timezone),
    datetime:new Date(r.datetime)
  }))
}
function processCommits (lines) {
  return d3.groups(lines, d => d.commit)
           .map(([id, arr]) => {
             const f = arr[0]
             const c = {
               id,
               url:`https://github.com/Shou-Yue/portfolio/commit/${id}`,
               author:f.author,
               datetime:f.datetime,
               hourFrac:f.datetime.getHours()+f.datetime.getMinutes()/60,
               totalLines:arr.length
             }
             Object.defineProperty(c,'lines',{ value:arr, enumerable:false })
             return c
           })
           .sort((a,b) => d3.ascending(a.datetime,b.datetime))
}

/* ─── summary panel ───────────────────────────────────────── */
function renderSummary (lines, commits) {
  const dl = d3.select('#stats').append('dl').attr('class','stats')
  const files = new Set(lines.map(d => d.file))
  const longest = d3.max(lines, d => d.length)
  const maxPerFile = d3.max(
      d3.rollups(lines, v => d3.max(v,d=>d.line), d=>d.file),
      d => d[1])
  ;[
    ['Commits', commits.length, 'm-commits'],
    ['Files', files.size, 'm-files'],
    ['Total LOC', lines.length, 'm-loc'],
    ['Longest Line', longest, null],
    ['Max Lines', maxPerFile, null]
  ].forEach(([lab,val,id])=>{
    const div = dl.append('div').attr('class','metric')
    div.append('dt').text(lab)
    const dd = div.append('dd').text(val)
    if (id) dd.attr('id',id)
  })
}
function updateSummary (sub) {
  const lines = sub.flatMap(c=>c.lines)
  d3.select('#m-commits').text(sub.length)
  d3.select('#m-files').text(new Set(lines.map(d=>d.file)).size)
  d3.select('#m-loc').text(lines.length)
}

/* ─── tooltip helpers ─────────────────────────────────────── */
function moveTip (e){
  const t=document.getElementById('commit-tooltip')
  t.style.left=`${e.clientX+18}px`
  t.style.top =`${e.clientY+18}px`
}
const showTip = ()=>document.getElementById('commit-tooltip').hidden=false
const hideTip = ()=>document.getElementById('commit-tooltip').hidden=true
function tooltip (c){
  d3.select('#commit-link').attr('href',c.url).text(c.id.slice(0,7))
  d3.select('#commit-date').text(c.datetime.toLocaleDateString())
  d3.select('#commit-time').text(c.datetime.toLocaleTimeString())
  d3.select('#commit-author').text(c.author)
  d3.select('#commit-lines').text(c.totalLines)
}

/* ─── banner + language helpers ───────────────────────────── */
function renderSelectionCount (sel, selected, universe) {
  let txt
  if (!sel)           txt = 'All commits selected, click and drag for specific onces'
  else if (selected.length)
                      txt = `${selected.length} commit${selected.length>1?'s':''} selected`
  else                txt = 'No commits selected'
  d3.select('#selection-count').text(txt)
}
function renderLanguageBreakdown (selected, universe) {
  const box = d3.select('#language-breakdown')
  const lines = selected.length
        ? selected.flatMap(c=>c.lines)
        : universe.flatMap(c=>c.lines)

  const brk = d3.rollup(lines, v=>v.length, d=>d.type)

  box.html('')
  for (const [lang,n] of brk){
    const pct = d3.format('.1~%')(n/lines.length)
    box.append('dt').text(lang)
    box.append('dd').text(`${n} lines (${pct})`)
  }
}

/* ─── scatter-plot ────────────────────────────────────────── */
function renderScatter () {
  const W=1000,H=550,M={t:10,r:10,b:40,l:40}
  const U={l:M.l,r:W-M.r,t:M.t,b:H-M.b,w:W-M.l-M.r}
  xScale = d3.scaleTime().domain(d3.extent(commitsAll,d=>d.datetime))
                         .range([U.l,U.r]).nice()
  yScale = d3.scaleLinear().domain([0,24]).range([U.b,U.t])

  const col = d3.scaleSequential().domain([0,24])
                .interpolator(t=>d3.interpolateHclLong('#1f3fff','#ff7d29')(t%1))

  const svg = d3.select('#chart').append('svg').attr('viewBox',`0 0 ${W} ${H}`)

  svg.append('g').attr('transform',`translate(${U.l},0)`)
     .call(d3.axisLeft(yScale).tickSize(-U.w).tickFormat(''))
     .selectAll('line').attr('stroke',d=>col(d)).attr('stroke-opacity',.25)

  svg.append('g').attr('class','x-axis')
     .attr('transform',`translate(0,${U.b})`).call(d3.axisBottom(xScale))

  svg.append('g').attr('transform',`translate(${U.l},0)`)
     .call(d3.axisLeft(yScale).tickFormat(h=>`${String(h%24).padStart(2,'0')}:00`))

  svg.append('g').attr('class','dots')

  /* brush */
  const brush = d3.brush()
    .extent([[U.l,U.t],[U.r,U.b]])
    .on('start brush end', brushed)

  svg.call(brush)
  svg.selectAll('.dots, .overlay ~ *').raise()

  function brushed (ev){
    const sel = ev.selection

    const inside = d => sel &&
      xScale(d.datetime)>=sel[0][0] && xScale(d.datetime)<=sel[1][0] &&
      yScale(d.hourFrac)>=sel[0][1] && yScale(d.hourFrac)<=sel[1][1]

    const selected = sel ? commitsNow.filter(inside) : commitsNow

    svg.select('.dots').selectAll('circle')
       .classed('selected',d=>selected.includes(d))

    renderSelectionCount(sel, selected, commitsNow)
    renderLanguageBreakdown(selected, commitsNow)
  }
}
function updateScatter (sub) {
  commitsNow = sub
  const svg = d3.select('#chart svg')
  xScale.domain(d3.extent(sub,d=>d.datetime))
  svg.select('.x-axis').call(d3.axisBottom(xScale))

  const [minL,maxL] = d3.extent(sub,d=>d.totalLines)
  const r = d3.scaleSqrt().domain([minL,maxL]).range([2,30])
  const col = d3.scaleSequential().domain([0,24])
                .interpolator(t=>d3.interpolateHclLong('#1f3fff','#ff7d29')(t%1))

  svg.select('.dots').selectAll('circle')
     .data(d3.sort(sub,d=>-d.totalLines),d=>d.id)
     .join(
       e=>e.append('circle')
           .attr('cx',d=>xScale(d.datetime))
           .attr('cy',d=>yScale(d.hourFrac))
           .attr('r',0)
           .attr('fill',d=>col(d.hourFrac))
           .style('fill-opacity',.7)
           .on('mouseenter',(ev,d)=>{moveTip(ev);tooltip(d);showTip()})
           .on('mousemove',moveTip)
           .on('mouseleave',hideTip),
       u=>u,
       x=>x.remove())
     .each(function(d){this.style.setProperty('--r',r(d.totalLines))})
     .transition()
     .attr('cx',d=>xScale(d.datetime))
     .attr('cy',d=>yScale(d.hourFrac))
     .attr('r', d=>r(d.totalLines))
}

/* ─── unit-dot file viz ───────────────────────────────────── */
function updateFiles (sub) {
  const lines = sub.flatMap(c=>c.lines)
  const files = d3.groups(lines,d=>d.file)
                  .map(([name,arr])=>({name,lines:arr,type:arr[0].type}))
                  .sort((a,b)=>b.lines.length-a.lines.length)

  const cont = d3.select('#files').selectAll('div')
                 .data(files,d=>d.name)
                 .join(enter=>enter.append('div').call(div=>{
                   div.append('dt').append('code')
                   div.append('dd')
                 }))

  cont.select('dt > code').html(d=>`${d.name}<small>${d.lines.length} lines</small>`)

  cont.attr('style',d=>`--color:${colors(d.type)}`)
      .select('dd').selectAll('div')
      .data(d=>d.lines)
      .join('div').attr('class','loc')
}

/* ─── apply state for a given max date ────────────────────── */
function applyState (until) {
  const sub = commitsAll.filter(c=>c.datetime<=until)
  updateScatter(sub)
  updateFiles(sub)
  updateSummary(sub)
  renderSelectionCount(null, sub, sub)
  renderLanguageBreakdown(sub, sub)
}

/* ─── scrollers ───────────────────────────────────────────── */
function initScrolly () {
  d3.select('#scatter-story').selectAll('.step')
    .data(commitsAll)
    .join('div')
    .attr('class','step')
    .html((d,i)=>`On ${d.datetime.toLocaleString('en',{dateStyle:'full',timeStyle:'short'})},
      I made <a href="${d.url}" target="_blank">${
        i ? 'another commit':'my first commit'}</a>,
      editing ${d.totalLines} lines in ${d3.rollups(d.lines,v=>v.length,x=>x.file).length} files.`)

  d3.select('#files-story').selectAll('.step')
    .data(commitsAll)
    .join('div')
    .attr('class','step')
    .text(d=>d.datetime.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}))

  scrollama().setup({container:'#scrolly-1',step:'#scrolly-1 .step'})
    .onStepEnter(res=>applyState(res.element.__data__.datetime))

  scrollama().setup({container:'#scrolly-2',step:'#scrolly-2 .step'})
    .onStepEnter(res=>applyState(res.element.__data__.datetime))
}

/* ─── boot ────────────────────────────────────────────────── */
;(async()=>{
  const lines = await loadData()
  commitsAll = processCommits(lines)

  renderSummary(lines, commitsAll)
  renderScatter()
  updateScatter(commitsAll)
  updateFiles(commitsAll)
  renderSelectionCount(null, commitsAll, commitsAll)   /* banner */
  renderLanguageBreakdown(commitsAll, commitsAll)      /* full breakdown */
  initScrolly()
})()
