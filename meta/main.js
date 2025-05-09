/* meta/main.js — complete feature-rich version
   =========================================================== */
   import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

   /* ───────────────────────────────────────────────────────────── */
   /* 1. Load & normalise CSV                                      */
   /* ───────────────────────────────────────────────────────────── */
   async function loadData() {
     return d3.csv('loc.csv', row => ({
       ...row,
       line:     +row.line,
       depth:    +row.depth,
       length:   +row.length,
       date:     new Date(row.date + 'T00:00' + row.timezone),
       datetime: new Date(row.datetime)
     }));
   }
   
   /* ───────────────────────────────────────────────────────────── */
   /* 2. Convert lines → commits                                   */
   /* ───────────────────────────────────────────────────────────── */
   function processCommits(lines) {
     return d3.groups(lines, d => d.commit).map(([hash, arr]) => {
       const f = arr[0];
       const obj = {
         id:   hash,
         url:  `https://github.com/YOUR_REPO/commit/${hash}`,
         author:  f.author,
         datetime:f.datetime,
         hourFrac:f.datetime.getHours() + f.datetime.getMinutes() / 60,
         totalLines: arr.length
       };
       Object.defineProperty(obj, 'lines', { value: arr, enumerable: false });
       return obj;
     });
   }
   
   /* ───────────────────────────────────────────────────────────── */
   /* 3. Summary numbers                                           */
   /* ───────────────────────────────────────────────────────────── */
   function renderSummary(lines, commits) {
     const sec = d3.select('#stats').append('section').attr('class', 'stats-wrap');
     sec.append('h2').text('Summary');
   
     const dl = sec.append('dl').attr('class', 'stats');
   
     const files = new Set(lines.map(d => d.file));
     const longestLine = d3.max(lines, d => d.length);
     const maxLinesPerFile = d3.max(
       d3.rollups(lines, v => d3.max(v, d => d.line), d => d.file),
       d => d[1]
     );
   
     [
       ['Commits', commits.length],
       ['Files', files.size],
       ['Total LOC', lines.length],
       ['Longest Line', longestLine],
       ['Max Lines', maxLinesPerFile]
     ].forEach(([lab, val]) => {
       const m = dl.append('div').attr('class', 'metric');
       m.append('dt').text(lab);
       m.append('dd').text(val);
     });
   }
   
   /* ───────────────────────────────────────────────────────────── */
   /* 4. Tooltip helpers                                           */
   /* ───────────────────────────────────────────────────────────── */
   function renderTooltipContent(c) {
     if (!c) return;
     d3.select('#commit-link').attr('href', c.url).text(c.id.slice(0, 7));
     d3.select('#commit-date').text(c.datetime.toLocaleDateString());
     d3.select('#commit-time').text(c.datetime.toLocaleTimeString());
     d3.select('#commit-author').text(c.author);
     d3.select('#commit-lines').text(c.totalLines);
   }
   function showTip() { document.getElementById('commit-tooltip').hidden = false; }
   function hideTip() { document.getElementById('commit-tooltip').hidden = true; }
   function moveTip(e) {
     const tip = document.getElementById('commit-tooltip');
     const off = 18;
     tip.style.left = `${e.clientX + off}px`;
     tip.style.top  = `${e.clientY + off}px`;
   }
   
   /* ───────────────────────────────────────────────────────────── */
   /* 5. Selection-count & language breakdown                      */
   /* ───────────────────────────────────────────────────────────── */
   function renderSelectionCount(selection, commits, isSelected) {
     const countEl = document.getElementById('selection-count');
     countEl.textContent = `${isSelected.length || 'No'} commits selected`;
   }
   
   function renderLanguageBreakdown(selection, commits, isSelected) {
     const container = document.getElementById('language-breakdown');
     const chosen = isSelected.length ? isSelected : commits;
     if (!isSelected.length) { container.innerHTML = ''; return; }
   
     const lines = chosen.flatMap(c => c.lines);
     const breakdown = d3.rollup(lines, v => v.length, d => d.type);
   
     container.innerHTML = '';
     for (const [lang, count] of breakdown) {
       const pct = d3.format('.1~%')(count / lines.length);
       container.insertAdjacentHTML(
         'beforeend',
         `<dt>${lang}</dt><dd>${count} lines (${pct})</dd>`
       );
     }
   }
   
   /* ───────────────────────────────────────────────────────────── */
   /* 6. Main scatter-plot                                         */
   /* ───────────────────────────────────────────────────────────── */
   function renderScatterPlot(commits) {
     /* sort so smallest dots draw last (higher z-order) */
     commits = d3.sort(commits, d => -d.totalLines);
   
     const width = 1000, height = 550;
     const margin = { top: 10, right: 10, bottom: 40, left: 40 };
     const usable = {
       left: margin.left,
       right: width - margin.right,
       top: margin.top,
       bottom: height - margin.bottom,
       width: width - margin.left - margin.right,
       height: height - margin.top - margin.bottom
     };
   
     /* scales */
     const x = d3.scaleTime()
       .domain(d3.extent(commits, d => d.datetime))
       .range([usable.left, usable.right])
       .nice();
   
     const y = d3.scaleLinear()
       .domain([0, 24])
       .range([usable.bottom, usable.top]);
   
     const color = d3.scaleSequential()
       .domain([0, 24])
       .interpolator(t => d3.interpolateHclLong('#1f3fff', '#ff7d29')(t % 1));
   
     const [minL, maxL] = d3.extent(commits, d => d.totalLines);
     const rScale = d3.scaleSqrt().domain([minL, maxL]).range([2, 30]);
   
     /* svg */
     const svg = d3.select('#chart')
       .append('svg')
       .attr('viewBox', `0 0 ${width} ${height}`)
       .style('overflow', 'visible');
   
     /* gridlines */
     svg.append('g')
       .attr('transform', `translate(${usable.left},0)`)
       .call(d3.axisLeft(y).tickSize(-usable.width).tickFormat(''))
       .selectAll('line')
       .attr('stroke', d => color(d))
       .attr('stroke-opacity', .25);
   
     /* dots */
     const dots = svg.append('g').attr('class', 'dots');
     dots.selectAll('circle')
       .data(commits)
       .join('circle')
       .attr('cx', d => x(d.datetime))
       .attr('cy', d => y(d.hourFrac))
       .attr('r', d => rScale(d.totalLines))
       .attr('fill', d => color(d.hourFrac))
       .style('fill-opacity', .7)
       .on('mouseenter', (e, d) => { moveTip(e); renderTooltipContent(d); showTip(); })
       .on('mousemove', moveTip)
       .on('mouseleave', hideTip);
   
     /* axes */
     svg.append('g')
       .attr('transform', `translate(0,${usable.bottom})`)
       .call(d3.axisBottom(x));
   
     svg.append('g')
       .attr('transform', `translate(${usable.left},0)`)
       .call(d3.axisLeft(y).tickFormat(h => String(h % 24).padStart(2, '0') + ':00'));
   
     /* ─────────── brushing ─────────── */
     const brush = d3.brush()
       .extent([[usable.left, usable.top], [usable.right, usable.bottom]])
       .on('start brush end', brushed);
   
     svg.call(brush);
     svg.selectAll('.dots, .overlay ~ *').raise();  // dots over brush overlay
   
     function isCommitSelected(sel, d) {
       if (!sel) return false;
       const [x0, y0] = sel[0], [x1, y1] = sel[1];
       const px = x(d.datetime), py = y(d.hourFrac);
       return x0 <= px && px <= x1 && y0 <= py && py <= y1;
     }
   
     function brushed(event) {
       const sel = event.selection;
       const selected = commits.filter(c => isCommitSelected(sel, c));
   
       dots.selectAll('circle')
         .classed('selected', d => selected.includes(d));
   
       renderSelectionCount(sel, commits, selected);
       renderLanguageBreakdown(sel, commits, selected);
     }
   }
   
   /* ───────────────────────────────────────────────────────────── */
   /* 7. Bootstrap async                                            */
   /* ───────────────────────────────────────────────────────────── */
   (async () => {
     const lines   = await loadData();
     const commits = processCommits(lines);
   
     renderSummary(lines, commits);
     renderScatterPlot(commits);
   })();
   