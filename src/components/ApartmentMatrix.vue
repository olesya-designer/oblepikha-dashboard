<script setup>
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { formatMoney } from '../utils/data'

const props = defineProps({ data: { type: Array, required: true }, selectedId: String })
const emit = defineEmits(['selectApartment'])
const root = ref(null)

function draw() {
  const el = root.value
  if (!el) return
  el.innerHTML = ''
  const data = [...props.data].sort((a,b) => d3.ascending(a.building,b.building) || b.floor-a.floor || d3.ascending(a.id,b.id))
  if (!data.length) return
  const buildings = [...new Set(data.map(d => d.building))]
  const maxFloor = d3.max(data, d => d.floor)
  const width = Math.max(760, el.clientWidth || 760)
  const height = 430
  const m = { top: 42, right: 20, bottom: 28, left: 32 }
  const blockW = (width - m.left - m.right) / buildings.length
  const rowH = (height - m.top - m.bottom) / maxFloor
  const cell = Math.max(4, Math.min(13, rowH - 3))
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`)

  buildings.forEach((building, bi) => {
    const x0 = m.left + bi * blockW
    svg.append('text').attr('x', x0 + blockW/2).attr('y', 20).attr('text-anchor','middle').attr('class','building-label').text(building)
    const bdata = data.filter(d => d.building === building)
    const floors = d3.groups(bdata, d => d.floor)
    floors.forEach(([floor, apts]) => {
      const y = m.top + (maxFloor - floor) * rowH
      const sorted = [...apts].sort((a,b)=>d3.ascending(a.id,b.id))
      const totalW = sorted.length * (cell + 3)
      const start = x0 + (blockW - totalW)/2
      svg.append('g').selectAll('rect').data(sorted).join('rect')
        .attr('x', (_,i) => start + i*(cell+3)).attr('y', y)
        .attr('width', cell).attr('height', cell).attr('rx', 2)
        .attr('class', d => `apartment ${d.sold ? 'sold' : 'unsold'} ${props.selectedId === d.id ? 'selected' : ''}`)
        .on('click', (_,d) => emit('selectApartment', d))
        .append('title').text(d => `${d.id}\n${d.rooms} комн. · ${d.area} м² · этаж ${d.floor}\n${d.sold ? 'Продана за '+formatMoney(d.salePrice) : 'В продаже · '+formatMoney(d.listPrice)}\n${d.view}`)
    })
  })

  for (let floor=1; floor<=maxFloor; floor+=2) {
    const y = m.top + (maxFloor-floor)*rowH + cell*.8
    svg.append('text').attr('x', m.left-8).attr('y', y).attr('text-anchor','end').attr('class','floor-label').text(floor)
  }
}
onMounted(draw)
watch(() => [props.data, props.selectedId], draw, { deep:true })
</script>

<template><div ref="root" class="chart matrix"></div></template>
