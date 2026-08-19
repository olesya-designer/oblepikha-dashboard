<script setup>
import SplitBarChart from './SplitBarChart.vue'
const props=defineProps({data:Array,mode:String})
const leftFactors=['rooms','area','view']
const rightFactors=['price','layout']
</script>
<template>
  <div class="liquidity-grid">
    <div class="liquidity-column">
      <SplitBarChart v-for="f in leftFactors" :key="f" :data="data" :factor="f" :mode="mode"/>
    </div>
    <div class="liquidity-column">
      <SplitBarChart v-for="f in rightFactors" :key="f" :data="data" :factor="f" :mode="mode"/>
    </div>
  </div>
</template>
