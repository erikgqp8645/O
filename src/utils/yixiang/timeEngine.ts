/**
 * 时间引擎
 *
 * 以「一个时刻」为唯一输入，推导出盘面所有环层所需的状态：
 *   干支四柱 · 农历 · 节气与候 · 月相 · 时辰 · 京房值卦值爻 · 五行生克
 *
 * 历法计算全部走 lunar-typescript（6tail，MIT），只在本文件做语义化封装。
 * 排盘口径：
 *   年柱 —— 以立春「交节时刻」为界（getYearInGanZhiExact，精确到秒）
 *   月柱 —— 以十二节令「交节时刻」为界（getMonthInGanZhiExact）
 *   日柱 —— 子正换日（0 点换日，getDayInGanZhiExact2）
 *   时柱 —— 五鼠遁自算（时干序 = (日干序×2 + 时支序) mod 10），
 *           时支跨 23:00–00:59，晚子时（23:00–23:59）归当日
 *
 * lunar 库的 getter 命名容易踩坑，这里逐一说明：
 *   getYearInGanZhiByLiChun() —— 按「日期」比立春，立春日 0 点就换年柱，不采用
 *   getYearInGanZhiExact()      —— 按立春「时刻」换年柱，采用
 *   getMonthInGanZhi()          —— 按「日期」切月，不采用
 *   getMonthInGanZhiExact()     —— 按交节「时刻」切月，采用
 *   getDayInGanZhiExact()       —— 23 点换日（子初换日），不采用
 *   getDayInGanZhiExact2()      —— 0 点换日（子正换日），采用
 *   getTimeInGanZhi()           —— 时干跟随 23 点口径，故时干自行推算
 */
import { Solar, LunarUtil } from 'lunar-typescript'

import {
  JIA_ZI,
  JIA_ZI_NAYIN,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  SHICHEN,
  MONTH_ORDERS,
  type WuXing
} from '@/data/yixiang/ganzhi'
import {
  SOLAR_TERMS,
  SOLAR_TERM_MAP,
  SOLAR_TERM_BY_LONGITUDE,
  TWELVE_MONTH_TERMS
} from '@/data/yixiang/solarTerms'
import { JING_FANG_SIXTY_ORDER } from '@/data/yixiang/gua'

/** 盘面时刻快照 */
export interface TimeSnapshot {
  /** 输入时刻 */
  date: Date
  /** 公历 YYYY-MM-DD HH:mm:ss */
  solarText: string
  /** 农历文本 */
  lunarText: string
  /** 干支纪年（以立春为界） */
  yearGanzhi: string
  /** 干支纪月（以节令为界） */
  monthGanzhi: string
  /** 干支纪日 */
  dayGanzhi: string
  /** 干支纪时 */
  hourGanzhi: string
  /** 生肖 */
  shengxiao: string
  /** 当前节气名 */
  jieQi: string
  /** 当前节气索引（在 SOLAR_TERMS 中的下标） */
  jieQiIndex: number
  /** 下一节气名 */
  nextJieQi: string
  /** 当前节气的精确交节时刻 */
  jieQiMoment: Date
  /** 下一节气的精确交节时刻 */
  nextJieQiMoment: Date
  /** 距下一节气的小时数 */
  hoursToNextJieQi: number
  /** 在当前节气内已过的小时数 */
  hoursInJieQi: number
  /** 当前节气的总跨度（小时） */
  jieQiSpanHours: number
  /** 当前候序 0/1/2 */
  houIndex: 0 | 1 | 2
  /** 当前候名 */
  houName: string
  /** 三候全名 */
  houNames: [string, string, string]
  /** 时辰名 */
  shichenName: string
  /** 时辰地支 */
  shichenZhi: string
  /** 时辰时段名 */
  shichenLabel: string
  /** 月相名称 */
  moonPhase: string
  /** 月相索引 0-30（0=朔，15=望，30=晦） */
  moonPhaseIndex: number
  /** 月相照亮比例 0-1 */
  moonIllumination: number
  /** 京房六十卦当日值爻位次 0-359 */
  jingFangPosition: number
  /** 京房值卦索引 0-59 */
  jingFangIndex: number
  /** 京房值卦名 */
  jingFangGuaName: string
  /** 京房值爻（1-6） */
  jingFangYao: 1 | 2 | 3 | 4 | 5 | 6
  /** 四柱纳音 */
  nayin: { year: string; month: string; day: string; hour: string }
  /** 四柱天干地支拆解 */
  pillars: {
    year: { gan: string; zhi: string }
    month: { gan: string; zhi: string }
    day: { gan: string; zhi: string }
    hour: { gan: string; zhi: string }
  }
  /** 当月起始节令 */
  monthTerm: string
  /** 月建（如"十月"） */
  monthOrder: string
}

/** 由干支字符串拆出天干地支 */
function splitGanzhi(gz: string): { gan: string; zhi: string } {
  return { gan: gz.slice(0, 1), zhi: gz.slice(1, 2) }
}

/** Solar → JS Date */
function toDate(solar: Solar): Date {
  return new Date(
    solar.getYear(),
    solar.getMonth() - 1,
    solar.getDay(),
    solar.getHour(),
    solar.getMinute(),
    solar.getSecond()
  )
}

/**
 * 二十四节气名循环序列（自「大雪」起算，长度 24）。
 *
 * lunar 的 getJieQiTable() 固定返回 31 项，时刻自上一年大雪排到次年惊蛰：
 *   大雪(上一年) → 冬至(上一年) → 小寒 → 大寒 → 立春 → 雨水 → 惊蛰 → 春分
 *   → … → 小雪 → 大雪 → 冬至 → 小寒 → 大寒 → 立春 → 雨水 → 惊蛰(次年)
 * 名字会随滚动位置在「中文 / 拼音」之间轮换（大雪=DA_XUE、冬至=DONG_ZHI、
 * 小寒=XIAO_HAN …），因此不能靠 key 认名字。
 *
 * 但「按时刻排序后的序号」是确定的：首项恒为「大雪」，其后严格按黄经顺序
 * 递增 15°。故名序 = 黄经序从「大雪」起转 24 位，再按序号循环取名。
 */
const TERM_CYCLE_FROM_DA_XUE: readonly string[] = (() => {
  const start = SOLAR_TERM_BY_LONGITUDE.findIndex((t) => t.name === '大雪')
  if (start < 0) throw new Error('节气表缺少「大雪」，无法建立名序循环')
  return Array.from({ length: 24 }, (_, i) => SOLAR_TERM_BY_LONGITUDE[(start + i) % 24]!.name)
})()

/** 一年一档的节气时刻表缓存 */
const termTableCache = new Map<number, { name: string; moment: Date }[]>()

/**
 * 取某个公历年的节气时刻表（31 项，自上一年大雪至次年惊蛰，按时刻升序）。
 *
 * lunar 内部以 `LunarYear.fromYear(solar.getYear())` 定位节气表，
 * 所以同一公历年的任何一天拿到的都是同一张表，探测日不影响结果。
 */
export function solarTermTable(year: number): { name: string; moment: Date }[] {
  const cached = termTableCache.get(year)
  if (cached) return cached
  const raw = Solar.fromYmd(year, 1, 1).getLunar().getJieQiTable()
  const moments = Object.values(raw)
    .map((s) => toDate(s))
    .sort((a, b) => a.getTime() - b.getTime())
  const out: { name: string; moment: Date }[] = []
  let last = Number.NaN
  for (const m of moments) {
    const sec = Math.floor(m.getTime() / 1000)
    if (sec === last) continue
    last = sec
    out.push({ name: TERM_CYCLE_FROM_DA_XUE[out.length % 24]!, moment: m })
  }
  termTableCache.set(year, out)
  return out
}

/**
 * 求指定年份某个节气的精确交节时刻。
 *
 * 表中每个节气名都会出现两次（上一年一次、本年一次），
 * 取「交节时刻落在该公历年内」的那一条即为所求。
 */
export function solarTermMoment(year: number, termName: string): Date | null {
  for (const e of solarTermTable(year)) {
    if (e.name === termName && e.moment.getFullYear() === year) return e.moment
  }
  return null
}

/** 节气定位结果 */
export interface TermPosition {
  /** 当前已交节的节气名 */
  name: string
  /** 交节时刻 */
  moment: Date
  /** 下一节气名 */
  nextName: string
  /** 下一节气的交节时刻 */
  nextMoment: Date
}

/**
 * 定位某时刻所处的节气。
 *
 * 不依赖 lunar.getPrevJieQi()：该方法在「交节当日但尚未到交节时刻」时
 * 会错误地返回尚未到来的节气（实测 2027-01-05 11:00 返回 22:09 才交的小寒）。
 * 这里改为从按年缓存的节气表里自行比对时刻，取「不晚于当前时刻的最后一根」。
 */
export function locateTerm(date: Date): TermPosition {
  const table = solarTermTable(date.getFullYear())
  const t = date.getTime()
  let cur = table[0]!
  let next = table[1] ?? table[0]!
  for (let i = 0; i < table.length; i++) {
    const e = table[i]!
    if (e.moment.getTime() <= t) {
      cur = e
      next = table[i + 1] ?? e
    } else {
      break
    }
  }
  return {
    name: cur.name,
    moment: cur.moment,
    nextName: next.name,
    nextMoment: next.moment
  }
}

/**
 * 求某年冬至的精确时刻（用于京房六日七分锚点）。
 *
 * 年份表覆盖「上一年大雪 → 次年惊蛰」，其中含本年 12 月的冬至，
 * 按「交节时刻落在本年」筛选即可。
 */
export function winterSolsticeOf(year: number): Date {
  return solarTermMoment(year, '冬至') ?? new Date(year, 11, 22, 0, 0, 0)
}

/**
 * 京房六日七分位次计算。
 *
 * 体系：冬至起卦，中孚初九爻对齐冬至日。此后「日行一爻」，
 * 一周 60 卦 × 6 爻 = 360 爻，而一回归年为 365.2422 日，
 * 故每爻实长 365.2422 / 360 ≈ 1.01456 日，闰余逐日累积。
 * 返回 0-359 的位次：整除 6 得值卦索引（0-59），余 1-6 得值爻。
 */
export function computeJingFangPosition(date: Date): number {
  const year = date.getFullYear()
  const winter = winterSolsticeOf(year)
  let days = (date.getTime() - winter.getTime()) / (24 * 60 * 60 * 1000)
  if (days < 0) {
    // 早于本年冬至 → 回退到上一年的冬至锚点
    const prevWinter = winterSolsticeOf(year - 1)
    days += (winter.getTime() - prevWinter.getTime()) / (24 * 60 * 60 * 1000)
  }
  // 日行一爻：360 爻配一回归年，闰余累积
  const total = Math.floor(days * (360 / 365.2422))
  return ((total % 360) + 360) % 360
}

/** 计算指定时刻的盘面快照 */
export function buildSnapshot(date: Date): TimeSnapshot {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  // 年柱：以立春「交节时刻」为界（Exact 口径）
  const yearGanzhi = lunar.getYearInGanZhiExact()
  // 月柱：以十二节令「交节时刻」为界
  const monthGanzhi = lunar.getMonthInGanZhiExact()
  // 日柱：子正换日（0 点换日）—— lunar 的 Exact2 才是 0 点口径，
  // Exact 是 23 点换日（子初换日），这里取 Exact2
  const dayGanzhi = lunar.getDayInGanZhiExact2()

  // 时柱：时支由 lunar 给出（子时跨 23:00–00:59），
  // 时干用五鼠遁自算：时干序 = (日干序 × 2 + 时支序) mod 10。
  // 这样 23:00–23:59 的「晚子时」时干取当日（0 点换日）日干，与日柱自洽。
  const shichenZhi = lunar.getTimeZhi()
  const dayGanIdx = HEAVENLY_STEMS.indexOf(dayGanzhi.slice(0, 1))
  const zhiIdx = EARTHLY_BRANCHES.indexOf(shichenZhi)
  const hourGanzhi =
    dayGanIdx >= 0 && zhiIdx >= 0
      ? HEAVENLY_STEMS[(dayGanIdx * 2 + zhiIdx) % 10]! + shichenZhi
      : lunar.getTimeInGanZhi()

  // 节气：自行按时刻定位（lunar.getPrevJieQi 在交节当日会返回尚未到来的节气）
  const termPos = locateTerm(date)
  const jieQiName = termPos.name
  const termInfo = SOLAR_TERM_MAP[jieQiName]
  const jieQiMoment = termPos.moment
  const nextJieQiMoment = termPos.nextMoment

  const hoursInJieQi = Math.max(0, (date.getTime() - jieQiMoment.getTime()) / 3_600_000)
  const jieQiSpanHours = Math.max(1, (nextJieQiMoment.getTime() - jieQiMoment.getTime()) / 3_600_000)
  const hoursToNextJieQi = Math.max(0, (nextJieQiMoment.getTime() - date.getTime()) / 3_600_000)

  // 候：每节气三候，各占约 1/3（一候约五日）
  const ratio = hoursInJieQi / jieQiSpanHours
  const houIndex: 0 | 1 | 2 = ratio < 1 / 3 ? 0 : ratio < 2 / 3 ? 1 : 2
  const houNames: [string, string, string] = termInfo ? termInfo.hou : ['', '', '']
  const houName = houNames[houIndex] ?? ''

  // 时辰
  const shichen = SHICHEN.find((s) => s.zhi === shichenZhi)

  // 月相：LunarUtil.YUE_XIANG 为 31 元素表（0=朔，15=望，30=晦）
  const moonPhase = lunar.getYueXiang()
  const moonPhaseIndex = LunarUtil.YUE_XIANG.indexOf(moonPhase)
  // 照亮比例：按朔→望→晦的半圆推算
  const moonIllumination = (1 - Math.cos((Math.PI * Math.max(0, moonPhaseIndex)) / 15)) / 2

  // 京房六日七分
  const jingFangPosition = computeJingFangPosition(date)
  const jingFangIndex = Math.floor(jingFangPosition / 6)
  const jingFangYao = ((jingFangPosition % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6

  // 月建（以节令定月）
  const monthZhi = splitGanzhi(monthGanzhi).zhi
  const monthOrder = MONTH_ORDERS.find((m) => m.zhi === monthZhi)
  const monthTerm = monthOrder ? monthOrder.startTerm : ''

  return {
    date,
    solarText: solar.toYmdHms(),
    lunarText: lunar.toString(),
    yearGanzhi,
    monthGanzhi,
    dayGanzhi,
    hourGanzhi,
    shengxiao: lunar.getYearShengXiaoExact(),
    jieQi: jieQiName,
    jieQiIndex: SOLAR_TERMS.findIndex((t) => t.name === jieQiName),
    nextJieQi: termPos.nextName,
    jieQiMoment,
    nextJieQiMoment,
    hoursToNextJieQi,
    hoursInJieQi,
    jieQiSpanHours,
    houIndex,
    houName,
    houNames,
    shichenName: shichen ? shichen.name : '',
    shichenZhi,
    shichenLabel: shichen ? shichen.label : '',
    moonPhase,
    moonPhaseIndex,
    moonIllumination,
    jingFangPosition,
    jingFangIndex,
    jingFangGuaName: JING_FANG_SIXTY_ORDER[jingFangIndex] ?? '',
    jingFangYao,
    nayin: {
      year: JIA_ZI_NAYIN[yearGanzhi] ?? '',
      month: JIA_ZI_NAYIN[monthGanzhi] ?? '',
      day: JIA_ZI_NAYIN[dayGanzhi] ?? '',
      hour: JIA_ZI_NAYIN[hourGanzhi] ?? ''
    },
    pillars: {
      year: splitGanzhi(yearGanzhi),
      month: splitGanzhi(monthGanzhi),
      day: splitGanzhi(dayGanzhi),
      hour: splitGanzhi(hourGanzhi)
    },
    monthTerm,
    monthOrder: monthOrder ? monthOrder.monthName : ''
  }
}

/** 由日干支求旬首（甲子旬等）与旬空 */
export function getXunKong(dayGanzhi: string): { xun: string; kong: string[] } {
  const idx = JIA_ZI.findIndex((j) => j.name === dayGanzhi)
  if (idx < 0) return { xun: '', kong: [] }
  const xunStart = idx - (idx % 10)
  const xun = JIA_ZI[xunStart]!.name
  const kong = [JIA_ZI[xunStart + 10]!.zhi, JIA_ZI[xunStart + 11]!.zhi]
  return { xun, kong }
}

/** 五行生克关系 */
export function wuXingRelation(a: WuXing, b: WuXing): string {
  const sheng: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const ke: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  if (a === b) return '比和'
  if (sheng[a] === b) return `${a}生${b}`
  if (sheng[b] === a) return `${b}生${a}`
  if (ke[a] === b) return `${a}克${b}`
  return `${b}克${a}`
}

export { TWELVE_MONTH_TERMS }
