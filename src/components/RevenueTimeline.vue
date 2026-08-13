<script setup>
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { formatMoney } from '../utils/data'

const props = defineProps({
  data: { type: Array, required: true },
  period: { type: String, default: 'week' }
})
const emit = defineEmits(['selectPeriod'])
const root = ref(null)

const configs = {
  day: {
    floor: d3.timeDay.floor,
    offset: d => d3.timeDay.offset(d, 1),
    label: d3.timeFormat('%d.%m'),
    axis: d3.timeDay.every(7)
  },
  week: {
    floor: d3.timeMonday.floor,
    offset: d => d3.timeMonday.offset(d, 1),
    label: d3.timeFormat('%d.%m'),
    axis: d3.timeMonday.every(2)
  },
  month: {
    floor: d3.timeMonth.floor,
    offset: d => d3.timeMonth.offset(d, 1),
    label: d3.timeFormat('%m.%Y'),
    axis: d3.timeMonth.every(1)
  }
}

function draw() {
  const el = root.value
  if (!el) return
  el.innerHTML = ''
  const sold = props.data.filter(d => d.sold && d.dealDate)
  if (!sold.length) return

  const cfg = configs[props.period] || configs.week
  const periods = d3.rollups(
    sold,
    v => ({ revenue: d3.sum(v, d => d.salePrice || 0), deals: v.length }),
    d => cfg.floor(d.dealDate)
  ).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date - b.date)

  const width = Math.max(680, el.clientWidth || 680)
  const height = 310
  const m = { top: 20, right: 54, bottom: 42, left: 92 }
  const plotWidth = width - m.left - m.right
  const barW = Math.max(5, Math.min(28, plotWidth / Math.max(periods.length, 1) * (props.period === 'day' ? .5 : .42)))
  const xPad = barW / 2 + 5
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`)

  let domain = d3.extent(periods, d => d.date)
  if (+domain[0] === +domain[1]) domain = [domain[0], cfg.offset(domain[1])]
  const x = d3.scaleTime().domain(domain).range([m.left + xPad, width - m.right - xPad])
  const y = d3.scaleLinear().domain([0, d3.max(periods, d => d.revenue) * 1.12]).nice().range([height - m.bottom, m.top])
  const yDeals = d3.scaleLinear().domain([0, d3.max(periods, d => d.deals) * 1.15]).nice().range([height - m.bottom, m.top])

  svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-plotWidth).tickFormat('')).call(g => g.select('.domain').remove())
  svg.append('g').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).ticks(cfg.axis).tickFormat(cfg.label)).call(g => g.select('.domain').remove())
  svg.append('g').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d / 1e6} млн ₽`)).call(g => g.select('.domain').remove())

  svg.append('g').selectAll('rect').data(periods).join('rect')
    .attr('class', 'deal-bar')
    .attr('x', d => x(d.date) - barW / 2)
    .attr('y', d => yDeals(d.deals))
    .attr('width', barW)
    .attr('height', d => height - m.bottom - yDeals(d.deals))
    .attr('rx', 3)
    .on('click', (_, d) => emit('selectPeriod', { start: d.date, end: cfg.offset(d.date) }))
    .append('title').text(d => `${cfg.label(d.date)} · ${d.deals} сделок`)

  const line = d3.line().x(d => x(d.date)).y(d => y(d.revenue)).curve(d3.curveMonotoneX)
  svg.append('path').datum(periods).attr('class', 'revenue-line').attr('d', line)
  svg.append('g').selectAll('circle').data(periods).join('circle')
    .attr('class', 'revenue-dot').attr('cx', d => x(d.date)).attr('cy', d => y(d.revenue)).attr('r', 5)
    .on('click', (_, d) => emit('selectPeriod', { start: d.date, end: cfg.offset(d.date) }))
    .append('title').text(d => `${cfg.label(d.date)} · ${formatMoney(d.revenue)} · ${d.deals} сделок`)
}

onMounted(draw)
watch(() => [props.data, props.period], draw, { deep: true })
</script>

<template><div ref="root" class="chart revenue-chart"></div></template>
