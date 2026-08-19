<script setup>
import { computed, onMounted, ref } from 'vue'
import * as d3 from 'd3'
import RevenueChart from './components/RevenueChart.vue'
import ManagerTable from './components/ManagerTable.vue'
import ApartmentMatrix from './components/ApartmentMatrix.vue'
import LiquidityGrid from './components/LiquidityGrid.vue'
import { loadApartments, factorDefs, moneyMln } from './utils/data'

const apartments=ref([]), loading=ref(true), error=ref('')
const period=ref('week')
const matrixFactor=ref('rooms')
const liquidityMode=ref('count')
const selectedApartment=ref(null)
const filters=ref({building:'Все',rooms:'Все',manager:'Все',status:'Все',view:'Все'})

onMounted(async()=>{
  try{apartments.value=await loadApartments()}catch(e){console.error(e);error.value='Не удалось загрузить данные'}finally{loading.value=false}
})
const uniq=fn=>['Все',...new Set(apartments.value.map(fn).filter(Boolean))]
const buildings=computed(()=>uniq(d=>d.building))
const managers=computed(()=>uniq(d=>d.manager))
const views=computed(()=>uniq(d=>d.view))
const filtered=computed(()=>apartments.value.filter(d=>{
  if(filters.value.building!=='Все'&&d.building!==filters.value.building)return false
  if(filters.value.rooms!=='Все'&&d.rooms!==+filters.value.rooms)return false
  if(filters.value.manager!=='Все'&&d.manager!==filters.value.manager)return false
  if(filters.value.status==='Проданы'&&!d.sold)return false
  if(filters.value.status==='В продаже'&&d.sold)return false
  if(filters.value.view!=='Все'&&d.view!==filters.value.view)return false
  return true
}))
const stats=computed(()=>{
  const sold=filtered.value.filter(d=>d.sold), unsold=filtered.value.filter(d=>!d.sold)
  const worked=sold.filter(d=>Number.isFinite(d.daysInWork))
  return {
    sold:sold.length,total:filtered.value.length,
    revenue:d3.sum(sold,d=>d.salePrice||0),
    left:unsold.length,potential:d3.sum(unsold,d=>d.listPrice||0),
    discount:d3.sum(sold,d=>d.discount||0),
    avgDays:worked.length?d3.mean(worked,d=>d.daysInWork):null
  }
})
function reset(){
  filters.value={building:'Все',rooms:'Все',manager:'Все',status:'Все',view:'Все'}
  selectedApartment.value=null
}
function selectManager(name){filters.value.manager=filters.value.manager===name?'Все':name}
function selectApartment(d){selectedApartment.value=selectedApartment.value?.id===d.id?null:d}
</script>

<template>
  <div class="dashboard-shell">
    <header class="dashboard-header">
      <div class="header-top">
        <div class="brand">
          <h1>ЖК «Облепиха»</h1>
          <p>Новосибирск, ул. Сиреневая, д. 1</p>
        </div>
        <section class="kpi-strip" aria-label="Общая информация">
          <div class="kpi kpi-green"><b>{{stats.sold}} <em>из {{stats.total}}</em></b><span>продано квартир</span></div>
          <div class="kpi kpi-green"><b>{{moneyMln(stats.revenue)}}</b><span>получено выручки</span></div>
          <div class="kpi kpi-blue"><b>{{stats.left}}</b><span>квартир осталось</span></div>
          <div class="kpi kpi-blue"><b>{{moneyMln(stats.potential)}}</b><span>ожидаемая выручка</span></div>
          <div class="kpi kpi-orange"><b>{{moneyMln(stats.discount,1)}}</b><span>скидок по сделкам</span></div>
          <div class="kpi kpi-purple"><b>{{stats.avgDays == null ? '—' : stats.avgDays.toLocaleString('ru-RU',{maximumFractionDigits:1}) + ' дн.'}}</b><span>средний срок сделки</span></div>
        </section>
      </div>
      <div class="filters">
        <label><span>корпус</span><select v-model="filters.building"><option v-for="v in buildings" :key="v">{{v}}</option></select></label>
        <label><span>комнат</span><select v-model="filters.rooms"><option>Все</option><option>1</option><option>2</option><option>3</option></select></label>
        <label><span>менеджер</span><select v-model="filters.manager"><option v-for="v in managers" :key="v">{{v}}</option></select></label>
        <label><span>статус</span><select v-model="filters.status"><option>Все</option><option>Проданы</option><option>В продаже</option></select></label>
        <label><span>вид</span><select v-model="filters.view"><option v-for="v in views" :key="v">{{v}}</option></select></label>
        <button class="reset" @click="reset">Сбросить фильтры</button>
      </div>
    </header>

    <div v-if="loading" class="state">Загружаю данные…</div>
    <div v-else-if="error" class="state">{{error}}</div>
    <template v-else>
      <main class="dashboard-grid">
        <section class="panel revenue-panel">
          <div class="panel-heading">
            <div><h2>Выручка и сделки</h2><p>линия — выручка · столбцы — сделки</p></div>
            <div class="segmented">
              <button :class="{active:period==='day'}" @click="period='day'">дни</button>
              <button :class="{active:period==='week'}" @click="period='week'">недели</button>
              <button :class="{active:period==='month'}" @click="period='month'">месяцы</button>
            </div>
          </div>
          <RevenueChart :data="filtered" :period="period"/>
        </section>

        <section class="panel managers-panel">
          <div class="panel-heading"><div><h2>Менеджеры</h2></div></div>
          <ManagerTable :data="filtered" :selected="filters.manager" @select="selectManager"/>
        </section>

        <section class="panel matrix-panel">
          <div class="panel-heading matrix-head">
            <div><h2>Все квартиры объекта</h2></div>
            <label class="inline-select"><span>цвет по</span><select v-model="matrixFactor"><option v-for="(def,key) in factorDefs" :key="key" :value="key">{{def.label}}</option></select></label>
          </div>
          <ApartmentMatrix :data="filtered" :factor="matrixFactor" :selected-id="selectedApartment?.id" @select="selectApartment"/>
          <div v-if="selectedApartment" class="apartment-detail">
            <strong>{{selectedApartment.id}}</strong>
            <span>{{selectedApartment.building}} · {{selectedApartment.floor}} этаж · {{selectedApartment.rooms}} комн. · {{selectedApartment.area}} м²</span>
            <span>{{selectedApartment.view}} · {{selectedApartment.layout}}</span>
            <span v-if="selectedApartment.sold">{{selectedApartment.manager}} · {{selectedApartment.daysInWork}} дн. · {{moneyMln(selectedApartment.salePrice,1)}} · скидка {{moneyMln(selectedApartment.discount,1)}}</span>
            <span v-else>в продаже · {{moneyMln(selectedApartment.listPrice,1)}}</span>
          </div>
        </section>

        <section class="panel liquidity-panel">
          <div class="panel-heading liquidity-head">
            <div><h2>Что продаётся лучше</h2></div>
            <div class="segmented">
              <button :class="{active:liquidityMode==='count'}" @click="liquidityMode='count'">количество</button>
              <button :class="{active:liquidityMode==='money'}" @click="liquidityMode='money'">млн ₽</button>
            </div>
          </div>
          <LiquidityGrid :data="filtered" :mode="liquidityMode"/>
        </section>
      </main>
    </template>
  </div>
</template>
