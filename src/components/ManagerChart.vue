<script setup>
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { formatMoney } from '../utils/data'

const props = defineProps({ data: { type: Array, required: true }, selected: String })
const emit = defineEmits(['selectManager'])
const root = ref(null)

function draw(){
  const el=root.value; if(!el) return; el.innerHTML=''
  const sold=props.data.filter(d=>d.sold && d.manager)
  const rows=d3.rollups(sold, v=>({
    sold:v.length,
    revenue:d3.sum(v,d=>d.salePrice||0),
    discount:d3.sum(v,d=>d.discount||0),
    avgDays:d3.mean(v,d=>d.daysInWork||0),
    discountRate:d3.sum(v,d=>d.discount||0)/d3.sum(v,d=>(d.salePrice||0)+(d.discount||0))
  }), d=>d.manager).map(([manager,v])=>({manager,...v})).sort((a,b)=>d3.descending(a.revenue,b.revenue))
  if(!rows.length) return
  const width=Math.max(680,el.clientWidth||680), height=300, m={top:20,right:90,bottom:42,left:88}
  const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${width} ${height}`)
  const x=d3.scaleLinear().domain([0,d3.max(rows,d=>d.revenue)*1.12]).nice().range([m.left,width-m.right])
  const y=d3.scaleBand().domain(rows.map(d=>d.manager)).range([m.top,height-m.bottom]).padding(.42)
  const r=d3.scaleSqrt().domain(d3.extent(rows,d=>d.sold)).range([8,18])
  const c=d3.scaleSequential(d3.interpolateYlOrBr).domain([0,d3.max(rows,d=>d.discountRate)||.03])

  svg.append('g').attr('class','grid').attr('transform',`translate(0,${height-m.bottom})`).call(d3.axisBottom(x).ticks(5).tickSize(-(height-m.top-m.bottom)).tickFormat('')).call(g=>g.select('.domain').remove())
  svg.append('g').attr('transform',`translate(0,${height-m.bottom})`).call(d3.axisBottom(x).ticks(5).tickFormat(d=>`${d/1e6} млн ₽`)).call(g=>g.select('.domain').remove())
  svg.append('g').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y)).call(g=>g.select('.domain').remove())

  const g=svg.append('g').selectAll('g.manager-row').data(rows).join('g').attr('class','manager-row').style('cursor','pointer').on('click',(_,d)=>emit('selectManager',d.manager))
  g.append('line').attr('x1',m.left).attr('x2',d=>x(d.revenue)).attr('y1',d=>y(d.manager)+y.bandwidth()/2).attr('y2',d=>y(d.manager)+y.bandwidth()/2).attr('class','manager-stick')
  g.append('circle').attr('cx',d=>x(d.revenue)).attr('cy',d=>y(d.manager)+y.bandwidth()/2).attr('r',d=>r(d.sold)).attr('fill',d=>c(d.discountRate)).attr('class',d=>props.selected===d.manager?'manager-dot selected':'manager-dot')
  g.append('text').attr('x',d=>x(d.revenue)+24).attr('y',d=>y(d.manager)+y.bandwidth()/2+4).attr('class','manager-value').text(d=>`${d.sold} · ${formatMoney(d.discount)}`)
  g.append('title').text(d=>`${d.manager}\n${d.sold} сделок · ${formatMoney(d.revenue)} выручки\nСкидки ${formatMoney(d.discount)} · ${(d.discountRate*100).toFixed(1)}% от прайса\nСредний срок ${d.avgDays.toFixed(1)} дн.`)
}
onMounted(draw)
watch(()=>[props.data,props.selected],draw,{deep:true})
</script>
<template><div ref="root" class="chart"></div></template>
