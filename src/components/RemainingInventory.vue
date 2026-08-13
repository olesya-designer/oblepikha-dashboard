<script setup>
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { formatMoney } from '../utils/data'

const props = defineProps({ data: { type: Array, required: true } })
const root = ref(null)

function draw() {
  const el = root.value
  if (!el) return
  el.innerHTML = ''
  const unsold = props.data.filter(d => !d.sold)
  if (!unsold.length) return

  const byBuilding = d3.rollups(
    unsold,
    v => ({ apartments: v.length, revenue: d3.sum(v, d => d.listPrice || 0) }),
    d => d.building
  ).map(([building, v]) => ({ building, ...v })).sort((a, b) => d3.ascending(a.building, b.building))

  const total = {
    building: 'Всего',
    apartments: unsold.length,
    revenue: d3.sum(unsold, d => d.listPrice || 0),
    total: true
  }
  const rows = [...byBuilding, total]

  const width = Math.max(760, el.clientWidth || 760)
  const height = Math.max(250, 64 + rows.length * 46)
  const m = { top: 46, right: 105, bottom: 30, left: 82 }
  const gap = 70
  const colW = (width - m.left - m.right - gap) / 2
  const leftStart = m.left
  const rightStart = m.left + colW + gap
  const y = d3.scaleBand().domain(rows.map(d => d.building)).range([m.top, height - m.bottom]).padding(.36)
  const countX = d3.scaleLinear().domain([0, d3.max(rows, d => d.apartments)]).nice().range([leftStart, leftStart + colW])
  const revenueX = d3.scaleLinear().domain([0, d3.max(rows, d => d.revenue)]).nice().range([rightStart, rightStart + colW])
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`)

  svg.append('text').attr('x', leftStart).attr('y', 18).attr('class', 'inventory-head').text('Квартир в продаже')
  svg.append('text').attr('x', rightStart).attr('y', 18).attr('class', 'inventory-head').text('Ожидаемая выручка, млн ₽')

  svg.append('g').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y)).call(g => g.select('.domain').remove())

  const g = svg.append('g').selectAll('g.inventory-row').data(rows).join('g').attr('class', d => d.total ? 'inventory-row inventory-total' : 'inventory-row')

  g.append('rect')
    .attr('x', leftStart)
    .attr('y', d => y(d.building))
    .attr('width', d => Math.max(2, countX(d.apartments) - leftStart))
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('class', 'inventory-count-bar')

  g.append('text')
    .attr('x', d => countX(d.apartments) + 7)
    .attr('y', d => y(d.building) + y.bandwidth() / 2 + 4)
    .attr('class', 'inventory-value')
    .text(d => d.apartments)

  g.append('rect')
    .attr('x', rightStart)
    .attr('y', d => y(d.building))
    .attr('width', d => Math.max(2, revenueX(d.revenue) - rightStart))
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('class', 'inventory-revenue-bar')

  g.append('text')
    .attr('x', d => revenueX(d.revenue) + 7)
    .attr('y', d => y(d.building) + y.bandwidth() / 2 + 4)
    .attr('class', 'inventory-value')
    .text(d => formatMoney(d.revenue))

  svg.append('g')
    .attr('transform', `translate(0,${height - m.bottom + 4})`)
    .call(d3.axisBottom(countX).ticks(4).tickFormat(d3.format('d')))
    .call(g => g.select('.domain').remove())

  svg.append('g')
    .attr('transform', `translate(0,${height - m.bottom + 4})`)
    .call(d3.axisBottom(revenueX).ticks(4).tickFormat(d => `${d / 1e6} млн ₽`))
    .call(g => g.select('.domain').remove())
}

onMounted(draw)
watch(() => props.data, draw, { deep: true })
</script>

<template><div ref="root" class="chart inventory-chart"></div></template>
