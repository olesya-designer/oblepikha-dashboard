<script setup>
import { computed } from 'vue'
import * as d3 from 'd3'
import { showTooltip, moveTooltip, hideTooltip } from '../utils/tooltip'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  weeks: { type: Array, default: () => [] },
  maxValue: { type: Number, default: 1 }
})

const label=d3.timeFormat('%d.%m')
const bars = computed(() => {
  const byWeek = new Map(
    d3.rollups(
      (props.rows || []).filter(d => d.dealDate),
      v => ({ revenue:d3.sum(v, d => d.salePrice || 0), deals:v.length }),
      d => +d3.timeMonday.floor(d.dealDate)
    )
  )
  const max = props.maxValue || 1
  return (props.weeks || []).map(ts => {
    const group = byWeek.get(+ts) || {revenue:0,deals:0}
    const value = group.revenue
    return { x:+ts, value, deals:group.deals, h:value ? Math.max(1.5, value / max * 30) : 0, date:ts }
  })
})
function over(event,d){showTooltip(event,`<b>Неделя ${label(d.date)}</b><span>${d.deals} сделок</span><span>${(d.value/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1})} млн ₽ выручки</span>`)}
</script>

<template>
  <svg class="spark" viewBox="0 0 210 34" preserveAspectRatio="none">
    <line x1="0" x2="210" y1="33" y2="33" class="spark-baseline" />
    <rect
      v-for="(d,i) in bars"
      :key="d.x"
      :x="i * (208 / Math.max(1,bars.length))"
      :y="33-d.h"
      :width="Math.max(2,(208 / Math.max(1,bars.length))-1.2)"
      :height="d.h"
      rx="0"
      @mouseenter="over($event,d)"
      @mousemove="moveTooltip"
      @mouseleave="hideTooltip"
    />
  </svg>
</template>
