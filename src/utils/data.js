import * as d3 from 'd3'

const parseDate = d3.timeParse('%m/%d/%Y')

const number = value => {
  if (value == null || value === '') return null
  const n = Number(String(value).replaceAll(',', '').replaceAll(' ', ''))
  return Number.isFinite(n) ? n : null
}

export const parseApartment = row => {
  const dealDate = row['Дата сделки'] ? parseDate(row['Дата сделки']) : null
  const contactDate = row['Дата обращения'] ? parseDate(row['Дата обращения']) : null
  const listPrice = number(row['Цена, руб.'])
  const salePrice = number(row['Цена продажи, руб.'])
  const discount = number(row['Скидка, руб.']) ?? 0

  return {
    id: row['Квартира'],
    building: row['Корпус'],
    floor: +row['Этаж'],
    rooms: +row['Комнат'],
    layout: row['Планировка'],
    area: +row['Площадь, м²'],
    pricePerM2: number(row['Цена за м², руб.']) ?? (listPrice / +row['Площадь, м²']),
    listPrice,
    salePrice,
    discount,
    manager: row['Менеджер'] || null,
    dealDate,
    contactDate,
    daysInWork: row['Дней в работе'] === '' ? null : +row['Дней в работе'],
    view: row['Вид'],
    sold: Boolean(dealDate)
  }
}

export async function loadApartments() {
  const rows = await d3.csv('./data/apartments.csv')
  return rows.map(parseApartment)
}

export const formatMoney = value => {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1e9) return `${d3.format('.2f')(value / 1e9)} млрд ₽`
  if (Math.abs(value) >= 1e6) return `${d3.format('.1f')(value / 1e6)} млн ₽`
  if (Math.abs(value) >= 1e3) return `${d3.format('.0f')(value / 1e3)} тыс. ₽`
  return `${d3.format(',.0f')(value).replaceAll(',', ' ')} ₽`
}

export const formatInt = value => d3.format(',d')(Math.round(value)).replaceAll(',', ' ')
export const formatPct = value => `${d3.format('.0f')(value * 100)}%`
