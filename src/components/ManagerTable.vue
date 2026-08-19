<script setup>
import { computed } from 'vue'
import * as d3 from 'd3'
import SparkBars from './SparkBars.vue'
import { compactDiscount } from '../utils/data'
import { showTooltip, moveTooltip, hideTooltip } from '../utils/tooltip'

const props = defineProps({ data: Array, selected: String })
const emit = defineEmits(['select'])
const soldRows = computed(() => (props.data || []).filter(d => d.sold && d.manager && d.dealDate))
const managers = computed(() => d3.rollups(soldRows.value, v => ({
  rows:v,
  revenue:d3.sum(v,d=>d.salePrice||0),
  deals:v.length,
  discount:d3.sum(v,d=>d.discount||0),
  avgDays:d3.mean(v.filter(d=>Number.isFinite(d.daysInWork)),d=>d.daysInWork)
}), d=>d.manager).map(([name,v])=>({name,...v})).sort((a,b)=>b.revenue-a.revenue))
const weeks=computed(()=>{
  if(!soldRows.value.length)return[]
  const [a,b]=d3.extent(soldRows.value,d=>d3.timeMonday.floor(d.dealDate))
  return d3.timeMonday.range(a,d3.timeMonday.offset(b,1))
})
const maxWeeklyRevenue=computed(()=>{
  let max=0
  for(const m of managers.value){
    const weekly=d3.rollups(m.rows,v=>d3.sum(v,d=>d.salePrice||0),d=>+d3.timeMonday.floor(d.dealDate))
    max=Math.max(max,d3.max(weekly,d=>d[1])||0)
  }
  return max||1
})
const rev=v=>`${Math.round(v/1e6).toLocaleString('ru-RU')} млн`

function over(event,m){showTooltip(event,`<b>${m.name}</b><span>${m.deals} сделок · ${rev(m.revenue)} ₽ выручки</span><span>Скидка ${compactDiscount(m.discount)} · ${m.avgDays?.toLocaleString('ru-RU',{maximumFractionDigits:1}) ?? '—'} дн. в среднем</span>`)}
</script>

<template>
  <div class="manager-table">
    <div class="manager-head manager-grid">
      <span>менеджер</span><span>выручка</span><span>по неделям</span><span>сделок</span><span>скидка</span>
    </div>
    <button v-for="m in managers" :key="m.name" class="manager-row manager-grid" :class="{active:selected===m.name}" @click="emit('select',m.name)" @mouseenter="over($event,m)" @mousemove="moveTooltip" @mouseleave="hideTooltip">
      <strong>{{m.name}}</strong>
      <span>{{rev(m.revenue)}}</span>
      <SparkBars :rows="m.rows" :weeks="weeks" :max-value="maxWeeklyRevenue"/>
      <span>{{m.deals}}</span>
      <span class="muted">{{compactDiscount(m.discount)}}</span>
    </button>
  </div>
</template>
