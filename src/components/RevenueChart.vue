<script setup>
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import { showTooltip, moveTooltip, hideTooltip } from '../utils/tooltip'

const props = defineProps({ data: Array, period: { type: String, default: 'week' } })
const root = ref(null)
let observer

const config = {
  day: { floor: d3.timeDay.floor, offset: d => d3.timeDay.offset(d, 1), label: d3.timeFormat('%d.%m') },
  week: { floor: d3.timeMonday.floor, offset: d => d3.timeMonday.offset(d, 1), label: d3.timeFormat('%d.%m') },
  month: { floor: d3.timeMonth.floor, offset: d => d3.timeMonth.offset(d, 1), label: d3.timeFormat('%m.%y') }
}

function draw() {
  const el = root.value
  if (!el) return
  el.innerHTML = ''
  const sold = (props.data || []).filter(d => d.sold && d.dealDate)
  if (!sold.length) return
  const cfg = config[props.period] || config.week
  const rows = d3.rollups(sold, v => ({ revenue: d3.sum(v, d => d.salePrice || 0), deals: v.length }), d => cfg.floor(d.dealDate))
    .map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date - b.date)

  const width = Math.max(460, el.clientWidth || 460)
  const height = Math.max(170, el.clientHeight || 190)
  const margin = { top: 30, right: 20, bottom: 24, left: 34 }
  const svg = d3.select(el).append('svg').attr('width', width).attr('height', height)
  const x = d3.scaleBand().domain(rows.map(d => +d.date)).range([margin.left, width - margin.right]).padding(0.18)
  const yRevenue = d3.scaleLinear().domain([0, d3.max(rows, d => d.revenue) * 1.12]).nice().range([height - margin.bottom, margin.top])
  const yDeals = d3.scaleLinear().domain([0, d3.max(rows, d => d.deals) * 1.12]).nice().range([height - margin.bottom, margin.top])

  svg.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yRevenue).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(''))
    .call(g => g.select('.domain').remove())

  const bars=svg.append('g').selectAll('rect').data(rows).join('rect')
    .attr('class','revenue-bar')
    .attr('x', d => x(+d.date)).attr('y', d => yDeals(d.deals))
    .attr('width', x.bandwidth()).attr('height', d => height - margin.bottom - yDeals(d.deals))
    .attr('rx', 0)
  bars
    .on('mouseenter', (event,d) => showTooltip(event, `<b>${cfg.label(d.date)}</b><span>${d.deals} сделок</span><span>${(d.revenue/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1})} млн ₽ выручки</span>`))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip)

  const line = d3.line().x(d => x(+d.date) + x.bandwidth()/2).y(d => yRevenue(d.revenue)).curve(d3.curveMonotoneX)
  svg.append('path').datum(rows).attr('d', line).attr('class','revenue-line')
  const dots=svg.append('g').selectAll('circle').data(rows).join('circle')
    .attr('class','revenue-dot')
    .attr('cx', d => x(+d.date) + x.bandwidth()/2).attr('cy', d => yRevenue(d.revenue)).attr('r', 3.2)
  dots
    .on('mouseenter', (event,d) => showTooltip(event, `<b>${cfg.label(d.date)}</b><span>${(d.revenue/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1})} млн ₽ выручки</span><span>${d.deals} сделок</span>`))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip)

  const xAxis = svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat(v => {
      const d = new Date(+v)
      if (props.period === 'week' || props.period === 'month') return cfg.label(d)
      const idx = rows.findIndex(r => +r.date === +v)
      return idx % Math.max(1, Math.ceil(rows.length / 12)) === 0 ? cfg.label(d) : ''
    }))
  xAxis.call(g => g.select('.domain').remove())
  if (props.period === 'week' && x.bandwidth() < 24) {
    xAxis.selectAll('text').attr('transform','rotate(-32)').attr('text-anchor','end').attr('dx','-.35em').attr('dy','.15em')
  }

  svg.append('g').attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yRevenue).ticks(4).tickSize(0).tickPadding(8).tickFormat(v => `${Math.round(v/1e6)}`))
    .call(g => g.select('.domain').remove())
  svg.append('text').attr('x', 0).attr('y', 26).attr('text-anchor','start').attr('class','axis-caption').text('млн ₽')

  svg.append('g').attr('transform', `translate(${width - margin.right},0)`)
    .call(d3.axisRight(yDeals).ticks(4).tickSize(0).tickPadding(8).tickFormat(d3.format('d')))
    .call(g => g.select('.domain').remove())
  svg.append('text').attr('x', width).attr('y', 26).attr('text-anchor','end').attr('class','axis-caption').text('сделок')
}

onMounted(() => { draw(); observer = new ResizeObserver(draw); observer.observe(root.value) })
watch(() => [props.data, props.period], draw, { deep: true })
onBeforeUnmount(() => observer?.disconnect())
</script>
<template><div ref="root" class="revenue-chart"></div></template>
