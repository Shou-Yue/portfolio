import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg      = d3.select('#projects-pie-plot');
const legendUl = d3.select('.legend');
const listDiv  = document.querySelector('.projects');
const searchIn = document.querySelector('.searchBar');

const colors   = d3.scaleOrdinal(d3.schemeTableau10);
const arcGen   = d3.arc().innerRadius(0).outerRadius(50);
const pie      = d3.pie().value(d => d.value);

let allProjects  = [];
let selectedYear = null;

function bin(arr){
  return d3.rollups(arr,v=>v.length,d=>d.year)
           .map(([y,c])=>({ label:y,value:c }));
}

function drawPie(data){
  const arcs = pie(data);
  svg.selectAll('path').remove();
  svg.selectAll('path')
     .data(arcs)
     .enter().append('path')
       .attr('d',arcGen)
       .attr('fill',(_,i)=>colors(i))
       .attr('class',d=>d.data.label===selectedYear?'selected':'')
       .on('click',(_,d)=>{ selectedYear = selectedYear===d.data.label ? null : d.data.label; refresh();});
}

function drawLegend(data){
  legendUl.selectAll('li').remove();
  legendUl.selectAll('li')
          .data(data)
          .enter().append('li')
            .attr('class',d=>`legend-item ${d.label===selectedYear?'selected':''}`)
            .style('--color',(_,i)=>colors(i))
            .html(d=>`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
            .on('click',(_,d)=>{ selectedYear = selectedYear===d.label ? null : d.label; refresh();});
}

function refresh(){
  const q   = searchIn.value.toLowerCase();
  const vis = allProjects.filter(p=>Object.values(p).join('\n').toLowerCase().includes(q));
  const toShow = selectedYear ? vis.filter(p=>p.year===selectedYear) : vis;
  renderProjects(toShow,listDiv,'h2');
  const data = bin(toShow);
  drawPie(data);
  drawLegend(data);
}

(async()=>{
  allProjects = await fetchJSON('../lib/projects.json');
  document.querySelector('.projects-title').textContent=`Projects (${allProjects.length})`;
  searchIn.addEventListener('input',refresh);
  refresh();
})();
