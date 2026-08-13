<script setup>
defineProps({ stats: { type: Object, required: true } })
</script>

<template>
  <section class="kpis" aria-label="Ключевые показатели">
    <article class="kpi"><span>Продано</span><strong>{{ stats.sold }} / {{ stats.total }}</strong><small>{{ stats.sellThrough }}</small></article>
    <article class="kpi"><span>Выручка</span><strong>{{ stats.revenue }}</strong><small>по цене сделки</small></article>
    <article class="kpi"><span>Скидки</span><strong>{{ stats.discount }}</strong><small>{{ stats.discountShare }} от прайса</small></article>
    <article class="kpi"><span>Срок сделки</span><strong>{{ stats.avgDays }} дней</strong><small>среднее обращение → сделка</small></article>
  </section>
</template>
