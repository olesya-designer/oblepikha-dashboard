<script setup>
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import { factorDefs, factorValues } from '../utils/data'
import { showTooltip, moveTooltip, hideTooltip } from '../utils/tooltip'

const props=defineProps({ data:Array, factor:String, mode:{type:String,default:'count'} })
const root=ref(null); let observer

function draw(){
  const el=root.value;if(!el)return;el.innerHTML=''
  const data=props.data||[]; if(!data.length)return
  const def=factorDefs[props.factor], cats=factorValues(data,props.factor)
  const rows=cats.map(name=>{
    const group=data.filter(d=>def.value(d)===name), sold=group.filter(d=>d.sold), unsold=group.filter(d=>!d.sold)
    return {
      name,
      sold:props.mode==='money'?d3.sum(sold,d=>d.salePrice||0):sold.length,
      unsold:props.mode==='money'?d3.sum(unsold,d=>d.listPrice||0):unsold.length,
      soldCount:sold.length,
      unsoldCount:unsold.length
    }
  })
  const width=Math.max(340,el.clientWidth||340)
  const compact=props.factor==='layout'
  const titleH=34, rowH=compact?19:24, bottom=8
  const height=titleH+rows.length*rowH+bottom
  const labelW=Math.min(112,Math.max(82,width*.25))
  const valueW=34
  const center=Math.max(labelW+valueW+72,width*.57)
  const leftStart=labelW+valueW
  const rightEnd=width-valueW-4
  const max=d3.max(rows,d=>Math.max(d.sold,d.unsold))||1
  const leftScale=d3.scaleLinear().domain([0,max]).range([center,leftStart])
  const rightScale=d3.scaleLinear().domain([0,max]).range([center,rightEnd])
  const barH=compact?10:12
  const svg=d3.select(el).append('svg').attr('width',width).attr('height',height).attr('viewBox',`0 0 ${width} ${height}`)

  svg.append('text').attr('class','mini-title').attr('x',0).attr('y',15).text(def.label)
  svg.append('text').attr('class','mini-side sold-side').attr('x',center-8).attr('y',15).attr('text-anchor','end').text('продано')
  svg.append('text').attr('class','mini-side').attr('x',center+8).attr('y',15).text('осталось')
  svg.append('line').attr('x1',center).attr('x2',center).attr('y1',22).attr('y2',height-bottom).attr('stroke','#bfc8c1').attr('stroke-width',1)

  const fmt=v=>props.mode==='money'?(v/1e6).toLocaleString('ru-RU',{maximumFractionDigits:0}):Math.round(v).toLocaleString('ru-RU')
  rows.forEach((d,i)=>{
    const y=titleH+i*rowH+rowH/2
    svg.append('text').attr('class','mini-label').attr('x',0).attr('y',y+4).text(d.name)

    const soldRect=svg.append('rect').attr('class','mini-bar mini-bar-sold')
      .attr('x',leftScale(d.sold)).attr('y',y-barH/2).attr('width',Math.max(0,center-leftScale(d.sold))).attr('height',barH).attr('rx',0)
    soldRect
      .on('mouseenter',(event)=>showTooltip(event, `<b>${def.label}: ${d.name}</b><span>Продано: ${d.soldCount} квартир</span><span>${props.mode==='money' ? `${fmt(d.sold)} млн ₽ получено` : `${d.soldCount + d.unsoldCount ? Math.round(d.soldCount/(d.soldCount+d.unsoldCount)*100) : 0}% от группы`}</span>`))
      .on('mousemove',moveTooltip).on('mouseleave',hideTooltip)

    const unsoldRect=svg.append('rect').attr('class','mini-bar mini-bar-unsold')
      .attr('x',center).attr('y',y-barH/2).attr('width',Math.max(0,rightScale(d.unsold)-center)).attr('height',barH).attr('rx',0)
    unsoldRect
      .on('mouseenter',(event)=>showTooltip(event, `<b>${def.label}: ${d.name}</b><span>Осталось: ${d.unsoldCount} квартир</span><span>${props.mode==='money' ? `${fmt(d.unsold)} млн ₽ потенциальной выручки` : `${d.soldCount + d.unsoldCount ? Math.round(d.unsoldCount/(d.soldCount+d.unsoldCount)*100) : 0}% от группы`}</span>`))
      .on('mousemove',moveTooltip).on('mouseleave',hideTooltip)

    svg.append('text').attr('class','mini-value').attr('x',leftScale(d.sold)-6).attr('y',y+4).attr('text-anchor','end').text(fmt(d.sold))
    svg.append('text').attr('class','mini-value muted').attr('x',rightScale(d.unsold)+6).attr('y',y+4).text(fmt(d.unsold))
  })
}
onMounted(()=>{draw();observer=new ResizeObserver(draw);observer.observe(root.value)})
watch(()=>[props.data,props.factor,props.mode],draw,{deep:true})
onBeforeUnmount(()=>observer?.disconnect())
</script>
<template><div ref="root" class="split-chart"></div></template>
