<script setup>
import { computed, onMounted, ref } from 'vue'
import * as d3 from 'd3'
import KpiStrip from './components/KpiStrip.vue'
import RevenueTimeline from './components/RevenueTimeline.vue'
import ApartmentMatrix from './components/ApartmentMatrix.vue'
import ManagerChart from './components/ManagerChart.vue'
import FeatureAnalysis from './components/FeatureAnalysis.vue'
import RemainingInventory from './components/RemainingInventory.vue'
import { loadApartments, formatMoney, formatPct } from './utils/data'

const apartments = ref([])
const loading = ref(true)
const error = ref('')
const selectedApartment = ref(null)
const factor = ref('view')
const timelinePeriod = ref('week')

const filters = ref({
  building: 'Все',
  rooms: 'Все',
  manager: 'Все',
  status: 'Все',
  view: 'Все',
  featureFactor: null,
  featureValue: null
})

onMounted(async () => {
  try {
    apartments.value = await loadApartments()
  } catch (e) {
    console.error(e)
    error.value = 'Не удалось загрузить apartments.csv'
  } finally {
    loading.value = false
  }
})

const buildings = computed(() => ['Все', ...new Set(apartments.value.map(d => d.building))])
const managers = computed(() => ['Все', ...new Set(apartments.value.filter(d => d.manager).map(d => d.manager))])
const views = computed(() => ['Все', ...new Set(apartments.value.map(d => d.view))])

function matchesFeature(d) {
  if (!filters.value.featureFactor || filters.value.featureValue == null) return true
  const f = filters.value.featureFactor
  const v = filters.value.featureValue
  if (f === 'building') return d.building === v
  if (f === 'rooms') return String(d.rooms) === v
  if (f === 'view') return d.view === v
  if (f === 'layout') return d.layout === v
  if (f === 'floor') {
    return String(d.floor) === v
  }
  if (f === 'area') {
    const band = d.area < 40 ? 'до 40 м²' : d.area < 55 ? '40–55 м²' : d.area < 70 ? '55–70 м²' : '70+ м²'
    return band === v
  }
  if (f === 'price') {
    const band = d.listPrice < 2e6 ? 'до 2 млн' : d.listPrice < 3e6 ? '2–3 млн' : d.listPrice < 4e6 ? '3–4 млн' : d.listPrice < 5e6 ? '4–5 млн' : d.listPrice < 10e6 ? '5–10 млн' : '10+ млн'
    return band === v
  }
  return true
}

const filtered = computed(() => apartments.value.filter(d => {
  if (filters.value.building !== 'Все' && d.building !== filters.value.building) return false
  if (filters.value.rooms !== 'Все' && d.rooms !== +filters.value.rooms) return false
  if (filters.value.manager !== 'Все' && d.manager !== filters.value.manager) return false
  if (filters.value.status === 'Проданы' && !d.sold) return false
  if (filters.value.status === 'В продаже' && d.sold) return false
  if (filters.value.view !== 'Все' && d.view !== filters.value.view) return false
  return matchesFeature(d)
}))

const stats = computed(() => {
  const total = filtered.value.length
  const soldRows = filtered.value.filter(d => d.sold)
  const sold = soldRows.length
  const revenue = d3.sum(soldRows, d => d.salePrice || 0)
  const discount = d3.sum(soldRows, d => d.discount || 0)
  const list = d3.sum(soldRows, d => (d.salePrice || 0) + (d.discount || 0))
  return {
    total,
    sold,
    sellThrough: total ? formatPct(sold / total) : '—',
    revenue: formatMoney(revenue),
    discount: formatMoney(discount),
    discountShare: list ? formatPct(discount / list) : '—',
    avgDays: soldRows.length ? d3.mean(soldRows, d => d.daysInWork || 0).toFixed(1) : '—'
  }
})

function resetFilters() {
  filters.value = { building: 'Все', rooms: 'Все', manager: 'Все', status: 'Все', view: 'Все', featureFactor: null, featureValue: null }
  selectedApartment.value = null
}

function selectManager(name) {
  filters.value.manager = filters.value.manager === name ? 'Все' : name
}

function selectFeature(payload) {
  if (filters.value.featureFactor === payload.factor && filters.value.featureValue === payload.value) {
    filters.value.featureFactor = null
    filters.value.featureValue = null
  } else {
    filters.value.featureFactor = payload.factor
    filters.value.featureValue = payload.value
  }
}

function selectTimelinePeriod({ start, end }) {
  const match = filtered.value.filter(d => d.dealDate && d.dealDate >= start && d.dealDate < end)
  if (match.length) selectedApartment.value = match[0]
}

const timelineTitle = computed(() => ({
  day: 'Выручка и сделки по дням',
  week: 'Выручка и сделки по неделям',
  month: 'Выручка и сделки по месяцам'
})[timelinePeriod.value])


</script>

<template>
  <main class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">ЖК «Облепиха» · Новосибирск</p>
        <h1>Продажи квартир в ЖК «Облепиха»</h1>
      </div>
      <button class="reset" @click="resetFilters">Сбросить фильтры</button>
    </header>

    <p v-if="loading" class="state">Загружаю данные…</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else>
      <section class="filters card">
        <label>Корпус<select v-model="filters.building"><option v-for="v in buildings" :key="v">{{ v }}</option></select></label>
        <label>Комнат<select v-model="filters.rooms"><option>Все</option><option>1</option><option>2</option><option>3</option></select></label>
        <label>Менеджер<select v-model="filters.manager"><option v-for="v in managers" :key="v">{{ v }}</option></select></label>
        <label>Статус<select v-model="filters.status"><option>Все</option><option>Проданы</option><option>В продаже</option></select></label>
        <label>Вид<select v-model="filters.view"><option v-for="v in views" :key="v">{{ v }}</option></select></label>
        <div v-if="filters.featureValue" class="active-filter">{{ filters.featureValue }} <button @click="filters.featureFactor=null; filters.featureValue=null">×</button></div>
      </section>

      <KpiStrip :stats="stats" />

      <section class="card section-card">
        <div class="section-head">
          <div class="timeline-heading">
            <p class="section-no">01 · Динамика</p>
            <h2>{{ timelineTitle }}</h2>
            <p class="timeline-legend">Выручка, млн ₽ — линия · сделки — столбцы</p>
          </div>
          <div class="timeline-controls">
            <div class="period-switch" aria-label="Период агрегации">
              <button :class="{ active: timelinePeriod === 'day' }" @click="timelinePeriod='day'">Дни</button>
              <button :class="{ active: timelinePeriod === 'week' }" @click="timelinePeriod='week'">Недели</button>
              <button :class="{ active: timelinePeriod === 'month' }" @click="timelinePeriod='month'">Месяцы</button>
            </div>
            <p class="section-note">Данные заканчиваются 25.08 — последний период может быть неполным.</p>
          </div>
        </div>
        <RevenueTimeline :data="filtered" :period="timelinePeriod" @select-period="selectTimelinePeriod" />
      </section>

      <section class="card section-card">
        <div class="section-head compact">
          <div>
            <p class="section-no">02 · Остаток и потенциал</p>
            <h2>Сколько квартир осталось и сколько они могут дать выручки</h2>
          </div>
        </div>
        <p class="chart-hint inventory-hint">По текущей цене квартир в продаже. Слева — количество, справа — ожидаемая выручка.</p>
        <RemainingInventory :data="filtered" />
      </section>

      <section class="card section-card">
        <div class="section-head">
          <div><p class="section-no">03 · Квартиры</p><h2>Все квартиры объекта</h2></div>
          <div class="legend"><span><i class="sold-dot"></i> продана</span><span><i class="unsold-dot"></i> в продаже</span></div>
        </div>
        <ApartmentMatrix :data="filtered" :selected-id="selectedApartment?.id" @select-apartment="selectedApartment=$event" />
        <div v-if="selectedApartment" class="detail">
          <strong>{{ selectedApartment.id }}</strong>
          <span>{{ selectedApartment.building }} · {{ selectedApartment.floor }} этаж · {{ selectedApartment.rooms }} комн. · {{ selectedApartment.area }} м²</span>
          <span>{{ selectedApartment.view }} · {{ selectedApartment.layout }}</span>
          <span v-if="selectedApartment.sold">{{ selectedApartment.manager }} · {{ selectedApartment.daysInWork }} дн. · {{ formatMoney(selectedApartment.salePrice) }} · скидка {{ formatMoney(selectedApartment.discount) }}</span>
          <span v-else>В продаже · {{ formatMoney(selectedApartment.listPrice) }}</span>
        </div>
      </section>

      <div class="two-col">
        <section class="card section-card">
          <div class="section-head compact"><div><p class="section-no">04 · Менеджеры</p><h2>Выручка, сделки, скидки</h2></div></div>
          <p class="chart-hint">Позиция — выручка · размер круга — число сделок · цвет — доля скидки. Подпись справа: сделки · скидки.</p>
          <ManagerChart :data="filtered" :selected="filters.manager" @select-manager="selectManager" />
        </section>

        <section class="card section-card">
          <div class="section-head compact">
            <div><p class="section-no">05 · Ликвидность</p><h2>Что продаётся лучше</h2></div>
            <select v-model="factor" class="factor-select">
              <option value="view">Вид из окна</option>
              <option value="building">Корпус</option>
              <option value="rooms">Комнатность</option>
              <option value="floor">Этаж</option>
              <option value="area">Площадь</option>
              <option value="price">Цена</option>
              <option value="layout">Планировка</option>
            </select>
          </div>
          <p class="chart-hint">Длина — количество квартир. Зелёная часть — продано, серая — в продаже; доля зелёного внутри строки показывает процент купленных квартир. Нажмите на строку, чтобы отфильтровать весь дашборд.</p>
          <FeatureAnalysis :data="filtered" :factor="factor" @select-value="selectFeature" />
        </section>
      </div>

      <footer>
        Источник: учебный датасет ЖК «Облепиха». Важное ограничение: в данных нет всех обращений/лидов, поэтому нельзя честно сравнить конверсию менеджеров из обращения в сделку.
      </footer>
    </template>
  </main>
</template>
