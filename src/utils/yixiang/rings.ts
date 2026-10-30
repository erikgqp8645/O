/**
 * 环层布局定义
 *
 * 定义盘面从外到内的各环：名称、内半径占比、外半径占比、分格数，
 * 以及每格的取数与配色规则。
 * 半径占比为相对外接圆半径 (0~1)。
 *
 * 【方位锚定】
 * 传统风水罗盘的各环不是各自随意排布的，而是全部锚定到同一套方位基准：
 *   正北（子中）· 正东（卯中）· 正南（午中）· 正西（酉中）
 * 本盘沿用罗盘古式「上南下北、左东右西」：
 *   正上 = 南（午）· 正下 = 北（子）· 正左 = 东（卯）· 正右 = 西（酉）
 *
 * 每个环用「锚点」声明——环内第 index 格必须落在 bearing 方位角上，
 * 起始角由锚点反解得到（见 `resolveStartAngle`）。
 * 这样调整环的先后顺序、增减格数都不会破坏环与环之间的对位关系。
 *
 * 【各环锚点依据】
 *   二十四山    子在正北（与周天 0° 重合）——传统度盘基准
 *   二十四节气  冬至与子中同轴（二分二至精确落在子卯午酉）
 *   十二辟卦    复卦位在冬至（正北），大壮春分、姤夏至、观秋分——四正卦落在子卯午酉
 *   八卦        乾居正南（先天方位）
 *   纳甲六十四卦 坎为水直冬至（京房四正卦主二分二至：坎冬至、离夏至、震春分、兑秋分）
 *   十二时辰    子时与子中同轴
 *   六十甲子    甲子与子中同轴
 *   七十二候    与所属节气同轴
 *   二十八宿    巽中起角木蛟，逆行二十四山
 *   周天刻度    0° 在正北（子中）
 *   先天六十四卦 乾为天居正南（圆周位次 pos 尚待复核，对位随 pos 自动跟随）
 */

import { XIANTIAN_64_GUA, JING_FANG_64_GUA } from '@/data/yixiang/gua'
import { BAGUA_XIANTIAN_ANGLE } from '@/data/yixiang/bagua'
import { SOLAR_TERM_BY_LONGITUDE } from '@/data/yixiang/solarTerms'
import { JIA_ZI, SHICHEN } from '@/data/yixiang/ganzhi'
import { bearingToSvg, normalizeAngle } from './geometry'

/** 方位角（bearing）：0° = 正北，顺时针增加（地理罗盘标准） */
export type Bearing = number

/** 锚点落点方式 */
export type AnchorMode = 'center' | 'start'

/** 环的方位锚点：环内第 index 格须落在 bearing 方位角上 */
export interface RingAnchor {
  /** 锚点标签（用于图例与自检） */
  label: string
  /** 目标方位角（0° = 正北，顺时针） */
  bearing: Bearing
  /** 锚点在环内的格序号（0 起） */
  index: number
  /**
   * 锚点落点方式：
   *   center —— 锚点格的**圆心**落在方位上（等分格各环用此，默认）
   *   start  —— 锚点格的**起点**落在方位上（周天刻度环、二十八宿用此）
   */
  mode?: AnchorMode
}

export interface RingLayout {
  /** 环标识 */
  key: string
  /** 环名（用于图例） */
  label: string
  /** 内半径占比 */
  rInner: number
  /** 外半径占比 */
  rOuter: number
  /** 分格数 */
  count: number
  /**
   * 起始角（度，SVG 空间：0=正右，90=正下，180=正左，270=正上，顺时针增加）。
   * 罗盘古式方位：正上=南（午）· 正下=北（子）· 正左=东（卯）· 正右=西（酉）。
   *
   * ⚠️ `RING_LAYOUTS` 里声明的 0 只是占位值，实际值由 `computeLayouts()`
   *    依据锚点算出后写入，请勿直接读取原始数组的 startAngle。
   */
  startAngle: number
  /** 方位锚点 */
  anchor?: RingAnchor
  /** 备注 */
  description?: string
}

/** 二十四山名（每地支两位：壬子癸、丑艮寅、甲卯乙、辰巽巳、丙午丁、未坤申、庚酉辛、戌乾亥） */
export const TWENTY_FOUR_MOUNTAINS: readonly { name: string; zhi: string; element: string }[] = [
  { name: '壬', zhi: '子', element: '水' },
  { name: '子', zhi: '子', element: '水' },
  { name: '癸', zhi: '子', element: '水' },
  { name: '丑', zhi: '丑', element: '土' },
  { name: '艮', zhi: '丑', element: '土' },
  { name: '寅', zhi: '寅', element: '木' },
  { name: '甲', zhi: '寅', element: '木' },
  { name: '卯', zhi: '卯', element: '木' },
  { name: '乙', zhi: '卯', element: '木' },
  { name: '辰', zhi: '辰', element: '土' },
  { name: '巽', zhi: '辰', element: '木' },
  { name: '巳', zhi: '巳', element: '火' },
  { name: '丙', zhi: '午', element: '火' },
  { name: '午', zhi: '午', element: '火' },
  { name: '丁', zhi: '午', element: '火' },
  { name: '未', zhi: '未', element: '土' },
  { name: '坤', zhi: '申', element: '土' },
  { name: '申', zhi: '申', element: '金' },
  { name: '庚', zhi: '酉', element: '金' },
  { name: '酉', zhi: '酉', element: '金' },
  { name: '辛', zhi: '酉', element: '金' },
  { name: '戌', zhi: '戌', element: '土' },
  { name: '乾', zhi: '亥', element: '金' },
  { name: '亥', zhi: '亥', element: '水' }
]

/** 在列表中按名称查序号，查不到返回 0（保证锚点永远可解） */
function indexOf<T>(list: readonly T[], name: string, pick: (item: T) => string): number {
  const i = list.findIndex((item) => pick(item) === name)
  return i >= 0 ? i : 0
}

const TERM_WINTER_SOLSTICE = indexOf(SOLAR_TERM_BY_LONGITUDE, '冬至', (t) => t.name)

/**
 * 各环的方位锚点。
 *
 * 方位角 0° = 正北，顺时针增加；罗盘古式下正北在正下（SVG 90°）。
 */
export const RING_ANCHORS: Readonly<Record<string, RingAnchor>> = Object.freeze({
  /** 周天刻度：0° 刻线落在正北（子中），与地盘二十四山同轴 */
  scale: { label: '0°', bearing: 0, index: 0, mode: 'start' },
  /** 二十八宿：角宿起于巽山（后天巽位在东南）中线，逆行二十四山 */
  mansions: { label: '角', bearing: 135, index: 0, mode: 'start' },
  /** 先天六十四卦：乾为天居正南 */
  gua: {
    label: '乾',
    bearing: 180,
    index: indexOf(XIANTIAN_64_GUA, '乾', (g) => g.name)
  },
  /** 八卦：乾居正南（先天方位） */
  bagua: { label: '乾', bearing: 180, index: 6 },
  /** 二十四节气：冬至与子中同轴（居中对位） */
  terms: { label: '冬至', bearing: 0, index: TERM_WINTER_SOLSTICE },
  /** 十二辟卦：复卦位在冬至（正北），大壮在春分、姤在夏至、观在秋分 */
  pi: { label: '复', bearing: 0, index: 0 },
  /** 七十二候：与所属节气同轴 */
  hou: { label: '冬至初候', bearing: 0, index: TERM_WINTER_SOLSTICE * 3 },
  /** 六十甲子：甲子与子中同轴 */
  jiazi: { label: '甲子', bearing: 0, index: indexOf(JIA_ZI, '甲子', (j) => j.name) },
  /** 纳甲六十四卦：坎为水直冬至（京房四正卦主二分二至） */
  najia: {
    label: '坎',
    bearing: 0,
    index: indexOf(JING_FANG_64_GUA, '坎', (g) => g.name)
  },
  /** 十二时辰：子时与子中同轴 */
  shichen: { label: '子时', bearing: 0, index: indexOf(SHICHEN, '子', (s) => s.zhi) },
  /** 二十四山：子在正北 */
  mountains: { label: '子', bearing: 0, index: indexOf(TWENTY_FOUR_MOUNTAINS, '子', (m) => m.name) }
})

/**
 * 盘面环层顺序（由外向内）：
 *   1. 周天三百六十度刻度
 *   2. 二十八宿分度（巽中起角，逆行二十四山）
 *   3. 六十四卦（先天圆图）
 *   4. 八卦（先天方位）
 *   5. 二十四节气
 *   6. 十二辟卦（十二消息卦，每卦统摄两个节气）
 *   7. 七十二候（每节气三候）
 *   8. 六十甲子（纳音）
 *   9. 纳甲六十四卦（京房六日七分）
 *  10. 十二时辰
 *  11. 二十四山（十二支双位）
 */
export const RING_LAYOUTS: readonly RingLayout[] = [
  {
    key: 'scale',
    label: '周天三百六十度',
    rInner: 0.948,
    rOuter: 0.995,
    count: 360,
    startAngle: 0,
    anchor: RING_ANCHORS.scale,
    description: '周天度数，0° 在正北（子中），与二十四山同轴'
  },
  {
    key: 'mansions',
    label: '二十八宿分度',
    rInner: 0.888,
    rOuter: 0.943,
    count: 28,
    startAngle: 0,
    anchor: RING_ANCHORS.mansions,
    description: '巽中起角木蛟，逆行二十四山；宿度不等宽'
  },
  {
    key: 'gua',
    label: '六十四卦',
    rInner: 0.789,
    rOuter: 0.883,
    count: 64,
    startAngle: 0,
    anchor: RING_ANCHORS.gua,
    description: '先天圆图，乾为天居正南'
  },
  {
    key: 'bagua',
    label: '八卦',
    rInner: 0.744,
    rOuter: 0.784,
    count: 8,
    startAngle: 0,
    anchor: RING_ANCHORS.bagua,
    description: '先天方位，乾南坤北、离东坎西'
  },
  {
    key: 'terms',
    label: '二十四节气',
    rInner: 0.675,
    rOuter: 0.739,
    count: 24,
    startAngle: 0,
    anchor: RING_ANCHORS.terms,
    description: '冬至与子中同轴，二分二至落在子卯午酉'
  },
  {
    key: 'pi',
    label: '十二辟卦',
    rInner: 0.615,
    rOuter: 0.67,
    count: 12,
    startAngle: 0,
    anchor: RING_ANCHORS.pi,
    description: '十二消息卦，复卦位在冬至，每卦统摄两个节气'
  },
  {
    key: 'hou',
    label: '七十二候',
    rInner: 0.552,
    rOuter: 0.61,
    count: 72,
    startAngle: 0,
    anchor: RING_ANCHORS.hou,
    description: '每节气三候，与所属节气同轴'
  },
  {
    key: 'jiazi',
    label: '六十甲子',
    rInner: 0.474,
    rOuter: 0.547,
    count: 60,
    startAngle: 0,
    anchor: RING_ANCHORS.jiazi,
    description: '甲子与子中同轴'
  },
  {
    key: 'najia',
    label: '纳甲六十四卦',
    rInner: 0.384,
    rOuter: 0.469,
    count: 64,
    startAngle: 0,
    anchor: RING_ANCHORS.najia,
    description: '京房八宫，坎为水直冬至'
  },
  {
    key: 'shichen',
    label: '十二时辰',
    rInner: 0.306,
    rOuter: 0.379,
    count: 12,
    startAngle: 0,
    anchor: RING_ANCHORS.shichen,
    description: '子时与子中同轴'
  },
  {
    key: 'mountains',
    label: '二十四山',
    rInner: 0.255,
    rOuter: 0.301,
    count: 24,
    startAngle: 0,
    anchor: RING_ANCHORS.mountains,
    description: '地盘正针，子在正北'
  }
]

/** 中心区半径占比（内盘） */
export const CENTER_RADIUS_RATIO = 0.245

/** 环与环之间的标准间隙（半径占比） */
export const RING_GAP = 0.005

/** 中心圆与最内一环之间的间隙（半径占比） */
export const CENTER_GAP = 0.01

/**
 * 由锚点反解环的起始角。
 *
 * 等分格（mode = center）：锚点格的圆心角 = startAngle + dir × (index + 0.5) × step
 *   → startAngle = bearingToSvg(bearing) − dir × (index + 0.5) × step
 * 起算格（mode = start）：锚点格的起点角 = startAngle + dir × index × step
 *   → startAngle = bearingToSvg(bearing) − dir × index × step
 *
 * @param layout 环布局
 * @param dir    排布方向：+1 顺时针，−1 逆时针
 */
export function resolveStartAngle(layout: RingLayout, dir: 1 | -1 = 1): number {
  const anchor = layout.anchor
  if (!anchor) return layout.startAngle
  const step = 360 / layout.count
  const svgAnchor = bearingToSvg(anchor.bearing)
  const offset = anchor.mode === 'start' ? anchor.index : anchor.index + 0.5
  return normalizeAngle(svgAnchor - dir * offset * step)
}

/**
 * 八卦格的几何：以该卦的先天方位（方位角制）为中心，取 step 宽的一格。
 *
 * 八卦环不参与起始角排布——每个卦的位置直接由先天方位决定，
 * 卦格须**居中于**该方位（乾在南、坤在北、离在东、坎在西）。
 */
export function baguaCellAngles(
  bearing: Bearing,
  step: number
): { a0: number; a1: number; mid: number } {
  const mid = bearingToSvg(bearing)
  return { a0: mid - step / 2, a1: mid + step / 2, mid }
}

/**
 * 按「可见环集合」重算各环的内外半径与起始角。
 *
 * 隐藏某环后，剩余各环会按原宽度比例放大并向上（向外）补位，
 * 盘面始终填满整个圆盘，不会留下空洞。
 * 全部十一环都可见时，k = 1，结果与 RING_LAYOUTS 完全一致。
 *
 * @param visibleKeys 需要显示的环 key
 * @param dir        排布方向：+1 顺时针，−1 逆时针
 */
export function computeLayouts(visibleKeys: readonly string[], dir: 1 | -1 = 1): RingLayout[] {
  const visible = RING_LAYOUTS.filter((r) => visibleKeys.includes(r.key))
  if (!visible.length) return []
  const outer = RING_LAYOUTS[0]!.rOuter
  const total = outer - CENTER_RADIUS_RATIO
  const widths = visible.reduce((s, r) => s + (r.rOuter - r.rInner), 0)
  const gaps = (visible.length - 1) * RING_GAP + CENTER_GAP
  // 统一缩放系数：环宽与间隙同比放大
  const k = total / (widths + gaps)
  const out: RingLayout[] = []
  let o = outer
  for (let i = 0; i < visible.length; i++) {
    const r = visible[i]!
    const w = (r.rOuter - r.rInner) * k
    out.push({ ...r, startAngle: resolveStartAngle(r, dir), rOuter: o, rInner: o - w })
    const gap = i === visible.length - 1 ? CENTER_GAP : RING_GAP
    o = o - w - gap * k
  }
  return out
}

/**
 * 由重排后的环层反推统一缩放系数（供字号自适应使用）。
 * 全部可见时为 1。
 */
export function layoutScale(layouts: readonly RingLayout[]): number {
  if (!layouts.length) return 1
  const orig = RING_LAYOUTS.find((r) => r.key === layouts[0]!.key)
  if (!orig) return 1
  const a = layouts[0]!.rOuter - layouts[0]!.rInner
  const b = orig.rOuter - orig.rInner
  return b > 0 ? a / b : 1
}

/** 指针：从中心指向盘外，标示当前时刻 */
export const POINTER_ANGLE_OFFSET = 0

/** 八卦方位角（0 = 正北顺时针）——供八卦环按先天方位直接定位 */
export const BAGUA_BEARING = BAGUA_XIANTIAN_ANGLE
