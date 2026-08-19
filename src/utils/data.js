import * as d3 from 'd3'

const parseDate = d3.timeParse('%m/%d/%Y')
const num = value => value == null || value === '' ? null : +String(value).replaceAll(',', '').replaceAll(' ', '')

export async function loadApartments() {
  return d3.csv(`${import.meta.env.BASE_URL}data/apartments.csv`, row => ({
    id: row['Квартира'],
    building: row['Корпус'],
    floor: +row['Этаж'],
    rooms: +row['Комнат'],
    layout: row['Планировка'],
    area: +row['Площадь, м²'],
    pricePerM2: num(row['Цена за м², руб.']),
    listPrice: num(row['Цена, руб.']),
    salePrice: num(row['Цена продажи, руб.']),
    discount: num(row['Скидка, руб.']) || 0,
    manager: row['Менеджер'] || null,
    dealDate: row['Дата сделки'] ? parseDate(row['Дата сделки']) : null,
    leadDate: row['Дата обращения'] ? parseDate(row['Дата обращения']) : null,
    daysInWork: row['Дней в работе'] ? +row['Дней в работе'] : null,
    view: row['Вид'],
    sold: Boolean(row['Дата сделки'])
  }))
}

export function moneyMln(value, digits = 0) {
  if (!Number.isFinite(value)) return '—'
  return `${(value / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits })} млн ₽`
}

export function compactDiscount(value) {
  if (!value) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e6) return `−${(abs / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ₽`
  return `−${Math.round(abs / 1e3).toLocaleString('ru-RU')} тыс. ₽`
}

export function pct(value, digits = 0) {
  return `${(value * 100).toLocaleString('ru-RU', { maximumFractionDigits: digits })}%`
}

export const factorDefs = {
  rooms: { label: 'Комнатность', short: 'комнат', value: d => `${d.rooms}-комн.`, order: ['1-комн.', '2-комн.', '3-комн.'] },
  building: { label: 'Корпус', short: 'корпус', value: d => d.building, order: ['ГП1', 'ГП2', 'ГП3', 'ГП4'] },
  view: { label: 'Вид из окна', short: 'вид', value: d => d.view },
  floor: { label: 'Этаж', short: 'этаж', value: d => String(d.floor), sort: (a, b) => +b - +a },
  area: {
    label: 'Площадь', short: 'площадь',
    value: d => d.area < 40 ? 'до 40 м²' : d.area < 55 ? '40–55 м²' : d.area < 70 ? '55–70 м²' : '70+ м²',
    order: ['до 40 м²', '40–55 м²', '55–70 м²', '70+ м²']
  },
  price: {
    label: 'Цена', short: 'цена',
    value: d => d.listPrice < 2e6 ? 'до 2 млн' : d.listPrice < 3e6 ? '2–3 млн' : d.listPrice < 4e6 ? '3–4 млн' : d.listPrice < 5e6 ? '4–5 млн' : d.listPrice < 10e6 ? '5–10 млн' : '10+ млн',
    order: ['до 2 млн', '2–3 млн', '3–4 млн', '4–5 млн', '5–10 млн', '10+ млн']
  },
  layout: { label: 'Планировка', short: 'планировка', value: d => d.layout }
}

export function factorValues(data, key) {
  const def = factorDefs[key]
  let values = [...new Set(data.map(def.value))]
  if (def.order) {
    const rank = new Map(def.order.map((v, i) => [v, i]))
    values.sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999))
  } else if (def.sort) values.sort(def.sort)
  else values.sort((a, b) => String(a).localeCompare(String(b), 'ru'))
  return values
}
