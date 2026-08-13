<script setup>
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'

const props = defineProps({ data: { type: Array, required: true }, factor: { type: String, required: true } })
const emit = defineEmits(['selectValue'])
const root = ref(null)
const axisRoot = ref(null)

const priceOrder = ['до 2 млн', '2–3 млн', '3–4 млн', '4–5 млн', '5–10 млн', '10+ млн']
const areaOrder = ['до 40 м²', '40–55 м²', '55–70 м²', '70+ м²']

const factorMeta = {
  building: { get: d => d.building },
  rooms: { get: d => `${d.rooms}` },
  view: { get: d => d.view },
  layout: { get: d => d.layout },
  floor: { get: d => `${d.floor}` },
  area: { get: d => d.area < 40 ? 'до 40 м²' : d.area < 55 ? '40–55 м²' : d.area < 70 ? '55–70 м²' : '70+ м²' },
  price: { get: d => d.listPrice < 2e6 ? 'до 2 млн' : d.listPrice < 3e6 ? '2–3 млн' : d.listPrice < 4e6 ? '3–4 млн' : d.listPrice < 5e6 ? '4–5 млн' : d.listPrice < 10e6 ? '5–10 млн' : '10+ млн' }
}

function sortRows(rows) {
  if (props.factor === 'floor') return rows.sort((a, b) => d3.descending(+a.name, +b.name))
  if (props.factor === 'rooms') return rows.sort((a, b) => d3.ascending(+a.name, +b.name))
  if (props.factor === 'price') return rows.sort((a, b) => priceOrder.indexOf(a.name) - priceOrder.indexOf(b.name))
  if (props.factor === 'area') return rows.sort((a, b) => areaOrder.indexOf(a.name) - areaOrder.indexOf(b.name))
  if (props.factor === 'building') return rows.sort((a, b) => d3.ascending(a.name, b.name))
  return rows.sort((a, b) => d3.descending(a.total, b.total))
}

function draw() {
  const el = root.value
  const axisEl = axisRoot.value
  if (!el || !axisEl) return
  el.innerHTML = ''
  axisEl.innerHTML = ''
  if (!props.data.length) return

  const meta = factorMeta[props.factor] || factorMeta.rooms
  let rows = d3.rollups(
    props.data,
    v => ({ total: v.length, sold: d3.sum(v, d => d.sold ? 1 : 0) }),
    meta.get
  ).map(([name, v]) => ({ name: String(name), ...v, unsold: v.total - v.sold, rate: v.sold / v.total }))

  if (props.factor === 'layout') rows = rows.filter(d => d.total >= 8)
  rows = sortRows(rows)

  const width = Math.max(620, el.clientWidth || 620)
  const rowH = 34
  const m = { top: 10, right: 78, bottom: 8, left: 130 }
  const height = Math.max(120, rows.length * rowH + m.top + m.bottom)
  const maxTotal = d3.max(rows, d => d.total) || 1
  const x = d3.scaleLinear().domain([0, maxTotal]).nice().range([m.left, width - m.right])
  const y = d3.scaleBand().domain(rows.map(d => d.name)).range([m.top, height - m.bottom]).padding(.28)
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`)

  svg.append('g')
    .attr('class', 'feature-grid')
    .attr('transform', `translate(0,${height - m.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickSize(-(height - m.top - m.bottom)).tickFormat(''))
    .call(g => g.select('.domain').remove())

  svg.append('g')
    .attr('transform', `translate(${m.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select('.domain').remove())

  const rowsG = svg.append('g').selectAll('g.feature-row').data(rows).join('g')
    .attr('class', 'feature-row')
    .style('cursor', 'pointer')
    .on('click', (_, d) => emit('selectValue', { factor: props.factor, value: d.name }))

  // Sold segment: the amount sold, not the percentage axis.
  rowsG.append('rect')
    .attr('x', m.left)
    .attr('y', d => y(d.name))
    .attr('width', d => Math.max(0, x(d.sold) - m.left))
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('class', 'feature-sold')

  // Unsold segment completes the bar to the total number of apartments.
  rowsG.append('rect')
    .attr('x', d => x(d.sold))
    .attr('y', d => y(d.name))
    .attr('width', d => Math.max(0, x(d.total) - x(d.sold)))
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('class', 'feature-unsold')

  rowsG.append('text')
    .attr('x', d => x(d.total) + 8)
    .attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
    .attr('class', 'bar-label')
    .text(d => `${d.total} · ${d3.format('.0%')(d.rate)}`)

  rowsG.append('title')
    .text(d => `${d.name}: ${d.total} квартир · куплено ${d.sold} (${d3.format('.1%')(d.rate)}) · в продаже ${d.unsold}`)

  // The scale is outside the scrollable list, so it stays visible while the user scrolls rows.
  const axisHeight = 34
  const axisSvg = d3.select(axisEl).append('svg').attr('viewBox', `0 0 ${width} ${axisHeight}`)
  axisSvg.append('g')
    .attr('transform', 'translate(0,2)')
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')))
    .call(g => g.select('.domain').attr('stroke', '#cfd4cc'))
  axisSvg.append('text')
    .attr('x', width - m.right)
    .attr('y', 31)
    .attr('text-anchor', 'end')
    .attr('class', 'axis-note')
    .text('квартир')
}

onMounted(draw)
watch(() => [props.data, props.factor], draw, { deep: true })
</script>

<template>
  <div class="feature-chart-shell">
    <div ref="root" class="feature-scroll"></div>
    <div ref="axisRoot" class="feature-axis"></div>
  </div>
</template>
