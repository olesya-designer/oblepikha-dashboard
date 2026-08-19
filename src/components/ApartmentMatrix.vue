<script setup>
import { onMounted, ref, watch, onBeforeUnmount, computed } from 'vue'
import * as d3 from 'd3'
import { factorDefs, factorValues, moneyMln } from '../utils/data'
import { showTooltip, moveTooltip, hideTooltip } from '../utils/tooltip'

const props = defineProps({
  data: Array,
  factor: { type:String, default:'rooms' },
  selectedId: { type:String, default:null }
})
const emit = defineEmits(['select'])
const root = ref(null)
let observer
const palette = ['#13a86b','#4278f5','#ff7849','#805ad5','#f2b531','#00a4a6','#e84e78','#66854e','#ff9d36','#2c88c9','#c856b2','#31b889','#f06139','#5f72db','#d89028','#2eb57b','#dc5e8a','#466ca8','#96a62e']
const legend = computed(() => factorValues(props.data || [], props.factor).map((v,i)=>({v,color:palette[i%palette.length]})))

function draw(){
  const el=root.value; if(!el) return; el.innerHTML=''
  const data=props.data||[]; if(!data.length) return
  const width=Math.max(500,el.clientWidth||500), height=Math.max(360,Math.min(430,el.clientHeight||400))
  const buildings=['ГП1','ГП2','ГП3','ГП4'].filter(b=>data.some(d=>d.building===b))
  const floors=d3.range(d3.max(data,d=>d.floor)||1,0,-1)
  const m={top:28,right:8,bottom:45,left:24}, gap=20
  const bw=(width-m.left-m.right-gap*(buildings.length-1))/buildings.length
  const rowH=(height-m.top-m.bottom)/floors.length
  const maxUnits=d3.max(buildings.flatMap(b=>floors.map(f=>data.filter(d=>d.building===b&&d.floor===f).length)))||1
  const squareSize=Math.max(4,Math.min(10,rowH-2,(bw-6-(maxUnits-1)*1.5)/maxUnits))
  const squareGap=1.5
  const svg=d3.select(el).append('svg').attr('width',width).attr('height',height)
  const vals=factorValues(data,props.factor), color=d3.scaleOrdinal(vals,palette.slice(0,Math.max(vals.length,1)))
  const val= factorDefs[props.factor].value

  svg.selectAll('.floor').data(floors).join('text').attr('class','floor-tick').attr('x',2).attr('y',(f,i)=>m.top+i*rowH+rowH*.68).text(f=>f)

  buildings.forEach((b,bi)=>{
    const bx=m.left+bi*(bw+gap)
    svg.append('text').attr('class','building-title').attr('x',bx+bw/2).attr('y',14).attr('text-anchor','middle').text(b)
    floors.forEach((floor,fi)=>{
      const units=data.filter(d=>d.building===b&&d.floor===floor).sort((a,b)=>a.id.localeCompare(b.id))
      if(!units.length) return
      const totalW=units.length*(squareSize+squareGap)-squareGap, sx=bx+(bw-totalW)/2
      units.forEach((d,ui)=>{
        const fill=color(val(d))
        const rect=svg.append('rect').datum(d)
          .attr('class',`apartment-square${props.selectedId===d.id?' selected':''}`)
          .attr('x',sx+ui*(squareSize+squareGap)).attr('y',m.top+fi*rowH+(rowH-squareSize)/2).attr('width',squareSize).attr('height',squareSize).attr('rx',0)
          .attr('fill',fill).attr('opacity',d.sold?1:.22).attr('stroke',props.selectedId===d.id?'#122018':(d.sold?'none':fill)).attr('stroke-width',props.selectedId===d.id?2:(d.sold?0:1))
          .style('cursor','pointer')
          .on('click',()=>emit('select',d))
          .on('mouseenter',(event)=>showTooltip(event, `<b>${d.id}</b><span>${d.building} · ${d.floor} этаж · ${d.rooms} комн. · ${d.area} м²</span><span>${factorDefs[props.factor].label}: ${val(d)}</span><span>${d.sold ? `Продана · ${moneyMln(d.salePrice,1)}` : `В продаже · ${moneyMln(d.listPrice,1)}`}</span>${d.sold && d.manager ? `<span>${d.manager} · ${d.daysInWork ?? '—'} дн. · скидка ${moneyMln(d.discount,1)}</span>` : ''}`))
          .on('mousemove',moveTooltip)
          .on('mouseleave',hideTooltip)
      })
    })
    const bd=data.filter(d=>d.building===b), soldCount=bd.filter(d=>d.sold).length, soldShare=bd.length?soldCount/bd.length:0
    const y=height-28
    svg.append('line').attr('x1',bx).attr('x2',bx+bw).attr('y1',y).attr('y2',y).attr('class','roi-track')
    svg.append('line').attr('x1',bx).attr('x2',bx+bw*soldShare).attr('y1',y).attr('y2',y).attr('class','roi-fill')
    svg.append('text').attr('class','roi-label').attr('x',bx).attr('y',height-8).text(`продано ${Math.round(soldShare*100)}%`)
  })
}

onMounted(()=>{draw();observer=new ResizeObserver(draw);observer.observe(root.value)})
watch(()=>[props.data,props.factor,props.selectedId],draw,{deep:true})
onBeforeUnmount(()=>observer?.disconnect())
</script>
<template>
  <div class="matrix-wrap">
    <div class="matrix-legend"><span v-for="x in legend" :key="x.v"><i :style="{background:x.color}"></i>{{x.v}}</span><em>бледный — в продаже</em></div>
    <div ref="root" class="matrix-chart"></div>
  </div>
</template>
