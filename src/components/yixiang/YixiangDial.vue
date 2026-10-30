<script setup lang="ts">
/**
 * 易象罗盘 · 盘面渲染核心
 *
 * 以「当前时刻」为唯一输入，绘制十一层同心环：
 *   周天三百六十度 → 二十八宿分度 → 六十四卦 → 八卦 → 二十四节气 →
 *   十二辟卦 → 七十二候 → 六十甲子 → 纳甲六十四卦 → 十二时辰 → 二十四山
 * 所有「随时间变化」的部分通过高亮与指针体现。
 *
 * 【方位锚定】
 *   各环起始角由 utils/yixiang/rings.ts 的 RING_ANCHORS 反解，
 *   统一锚定到同一套方位基准（上南下北、左东右西）。
 *
 * 【分层开关】
 *   visibleRings 决定显示哪些环。隐藏某环后，剩余各环会按原宽度比例
 *   放大补位（见 utils/yixiang/rings.ts 的 computeLayouts），盘面始终填满整个圆盘。
 *
 * 【卦符】
 *   六十四卦、十二辟卦、纳甲六十四卦三环的每格内除卦名外，还画出六爻爻画：
 *   阳爻一整条、阴爻断开两截，初爻在下、上爻在上。
 *
 * 【嵌入方式】
 *   本组件根节点是 <g>（不是独立 <svg>），由 View 统一放进 1200×1200 的
 *   视口 SVG 内，随视口做缩放 / 平移 / 旋转。盘面自身坐标系保持 800×800，
 *   由 View 侧的 <g transform> 缩放居中，因此这里的几何常量无需改动。
 */
import { computed } from 'vue'

import { XIANTIAN_64_GUA, JING_FANG_64_GUA, getGuaLines } from '@/data/yixiang/gua'
import { PI_GUA, PI_GUA_BY_TERM } from '@/data/yixiang/piGua'
import { BAGUA, BAGUA_XIANTIAN_ANGLE } from '@/data/yixiang/bagua'
import { SOLAR_TERM_BY_LONGITUDE, SOLAR_TERM_MAP } from '@/data/yixiang/solarTerms'
import { JIA_ZI, SHICHEN } from '@/data/yixiang/ganzhi'
import { MANSIONS, MANSION_QUADRANT_COLOR } from '@/data/yixiang/mansions'
import {
  RING_LAYOUTS,
  CENTER_RADIUS_RATIO,
  TWENTY_FOUR_MOUNTAINS,
  computeLayouts,
  layoutScale,
  resolveStartAngle,
  baguaCellAngles
} from '@/utils/yixiang/rings'
import {
  ringSectorPath,
  textTransform,
  polar,
  normalizeAngle,
  cellAngles,
  fitHouName
} from '@/utils/yixiang/geometry'
import { hexagramRects, cellContentLayout } from '@/utils/yixiang/hexagram'
import {
  BAGUA_COLOR,
  WUXING_COLOR,
  SEASON_COLOR,
  PALACE_COLOR,
  BRANCH_COLOR,
  jiaziColor
} from '@/utils/yixiang/palette'
import type { TimeSnapshot } from '@/utils/yixiang/timeEngine'

const props = defineProps<{
  snapshot: TimeSnapshot
  /** 需要显示的环 key 列表 */
  visibleRings: string[]
  /** 排布方向：顺时针 / 逆时针（与站内其它罗盘的「旋转方向」开关一致） */
  direction?: 'clockwise' | 'counterclockwise'
}>()

/** 排布方向因子：+1 顺时针，-1 逆时针 */
const dir = computed<1 | -1>(() => (props.direction === 'counterclockwise' ? -1 : 1))


const CX = 400
const CY = 400
const R = 380

/* ── 环层布局（随可见环集合重排） ───────────────────── */
const layouts = computed(() => computeLayouts(props.visibleRings, dir.value))
const layoutOf = (key: string) => layouts.value.find((l) => l.key === key)

/** 环宽缩放系数（隐藏环后其余环同比放大） */
const fontScale = computed(() => Math.min(1.4, Math.max(0.85, layoutScale(layouts.value))))

/** 某环的内外半径（像素） */
function radii(rInner: number, rOuter: number): [number, number] {
  return [rInner * R, rOuter * R]
}

/** 环的每格角度步长 */
function stepOf(r: (typeof RING_LAYOUTS)[number]): number {
  return 360 / r.count
}

/** 某环在指定半径处的单格弧宽（像素） */
function arcWidth(radius: number, count: number): number {
  return radius * ((2 * Math.PI) / count)
}

/* ── 先天六十四卦环（含爻画卦符） ───────────────────── */
const guaRing = computed(() => {
  const layout = layoutOf('gua')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  const depth = ro - ri
  const font = Math.min(13 * fontScale.value, depth * 0.26)
  const arc = arcWidth(ro, layout.count)
  return XIANTIAN_64_GUA.map((g) => {
    const { a0, a1, mid } = cellAngles(layout.startAngle, step, g.pos, dir.value)
    const two = g.name.length === 2
    const L = cellContentLayout(depth, arc, font, two ? 2 : 1)
    return {
      key: `gua-${g.value}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      char0: two ? g.name[0]! : g.name,
      char1: two ? g.name[1]! : '',
      color: BAGUA_COLOR[g.outer] ?? 'var(--ink-3)',
      innerColor: BAGUA_COLOR[g.inner] ?? 'var(--ink-3)',
      // 两字卦上下叠，字距 1.05em；单字卦居中
      dy0: two ? '-0.525em' : '0',
      dy1: '1.05em',
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      hex: hexagramRects(g.lines, L.hexTop, {
        lineWidth: L.lineWidth,
        rowHeight: L.rowHeight,
        thickness: L.thickness,
        gap: L.gap
      }),
      nameY: L.nameCenter,
      fontSize: font,
      title: `${g.unicode} ${g.name}（${g.inner}下${g.outer}上）· 先天第${g.pos + 1}位`,
      data: g
    }
  })
})

/* ── 八卦环（先天方位，乾南坤北 → 上南下北布局） ───────── */
const baguaRing = computed(() => {
  const layout = layoutOf('bagua')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  // 先天方位角（方位角制，0=正北顺时针）转 SVG 角（0=正右顺时针）：SVG = 方位角 + 90
  return BAGUA.map((b) => {
    const bearing = BAGUA_XIANTIAN_ANGLE[b.name] ?? 0
    // 卦格居中于该卦的先天方位（乾在南、坤在北、离在东、坎在西）
    const { a0, a1, mid } = baguaCellAngles(bearing, step)
    return {
      key: `bagua-${b.name}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      label: b.name,
      unicode: b.unicode,
      color: BAGUA_COLOR[b.name] ?? 'var(--ink-3)',
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      nameTransform: textTransform(CX, CY, ri + 13, mid),
      fontSize: Math.min(19 * fontScale.value, (ro - ri) * 0.5),
      nameFontSize: Math.min(11 * fontScale.value, (ro - ri) * 0.3),
      title: `${b.unicode} ${b.name}｜${b.element}｜先天${b.xiantianDirection}｜后天${b.houtianDirection}｜${b.nature}`,
      data: b
    }
  })
})

/* ── 二十四节气环 ─────────────────────────────────── */
const termsRing = computed(() => {
  const layout = layoutOf('terms')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  const current = props.snapshot.jieQi
  return SOLAR_TERM_BY_LONGITUDE.map((t, i) => {
    const { a0, a1, mid } = cellAngles(layout.startAngle, step, i, dir.value)
    const active = t.name === current
    return {
      key: `term-${t.name}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      label: t.name,
      color: SEASON_COLOR[t.season] ?? 'var(--ink-3)',
      active,
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      fontSize: Math.min(12 * fontScale.value, (ro - ri) * 0.42),
      title: `${t.name}｜${t.season}｜${t.element}｜三候：${t.hou.join('、')}`,
      data: t
    }
  })
})

/* ── 十二辟卦环（十二消息卦，含爻画卦符） ───────────── */
const piRing = computed(() => {
  const layout = layoutOf('pi')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  const depth = ro - ri
  const font = Math.min(12 * fontScale.value, depth * 0.24)
  const arc = arcWidth(ro, layout.count)
  const current = PI_GUA_BY_TERM[props.snapshot.jieQi]
  return PI_GUA.map((p) => {
    const { a0, a1, mid } = cellAngles(layout.startAngle, step, p.index, dir.value)
    const two = p.name.length === 2
    const L = cellContentLayout(depth, arc, font, two ? 2 : 1)
    const lines = getGuaLines(p.guaValue)
    return {
      key: `pi-${p.name}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      char0: two ? p.name[0]! : p.name,
      char1: two ? p.name[1]! : '',
      color: SEASON_COLOR[p.season] ?? 'var(--ink-3)',
      active: current?.name === p.name,
      // 两字卦上下叠，字距 1.05em；单字卦居中
      dy0: two ? '-0.525em' : '0',
      dy1: '1.05em',
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      hex: hexagramRects(lines, L.hexTop, {
        lineWidth: L.lineWidth,
        rowHeight: L.rowHeight,
        thickness: L.thickness,
        gap: L.gap
      }),
      nameY: L.nameCenter,
      fontSize: font,
      title: `${p.name}｜${p.yangCount}阳｜${p.month}｜所辖节气：${p.terms.join('、')}`,
      data: p
    }
  })
})

/* ── 七十二候环 ───────────────────────────────────── */
const houRing = computed(() => {
  const layout = layoutOf('hou')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  const currentTerm = SOLAR_TERM_MAP[props.snapshot.jieQi]
  const currentHou = props.snapshot.houName
  const depth = ro - ri
  const rMid = (ri + ro) / 2
  // 72 格在 rMid 处单格弧长约 19 单位
  const arc = (rMid * step * Math.PI) / 180
  // 序号放内圈、当前候名放外圈，互不挤占。
  // 「一/二/三」只有横画，字号不够大就看不出来 —— 故序号取 10 单位并加粗。
  const ordinalFont = Math.min(Math.max(arc * 0.55, 4), 10)
  const rOrdinal = ri + depth * 0.26
  // 候名沿弧排在外圈，可用宽度以「所属节气格」（15°）为界：
  // 越出节气格就会压到邻节气的分隔线，且描边色会盖错底色。
  const rName = ro - depth * 0.24
  const out: {
    key: string
    path: string
    label: string
    ordinal: string
    color: string
    active: boolean
    inCurrentTerm: boolean
    ordinalTransform: string
    nameTransform: string
    ordinalFontSize: number
    nameFontSize: number
    title: string
  }[] = []
  SOLAR_TERM_BY_LONGITUDE.forEach((t, i) => {
    t.hou.forEach((h, j) => {
      const { a0, a1, mid } = cellAngles(layout.startAngle, step, i * 3 + j, dir.value)
      const inCurrentTerm = t.name === currentTerm?.name
      // 候名字号与位置：由 fitHouName 保证整体容于所属节气格，不压邻格分隔线
      const len = Math.max(h.length, 1)
      const { fontSize: nameFont, angleOffset } = fitHouName(len, rName, step, j - 1, dir.value)
      out.push({
        key: `hou-${t.name}-${j}`,
        path: ringSectorPath(CX, CY, ri, ro, a0, a1),
        label: h,
        ordinal: ['一', '二', '三'][j] ?? '·',
        color: SEASON_COLOR[t.season] ?? 'var(--ink-3)',
        active: inCurrentTerm && h === currentHou,
        inCurrentTerm,
        ordinalTransform: textTransform(CX, CY, rOrdinal, mid),
        nameTransform: textTransform(CX, CY, rName, normalizeAngle(mid + angleOffset)),
        ordinalFontSize: ordinalFont,
        nameFontSize: Number(nameFont.toFixed(2)),
        title: `${t.name} · 第${['一', '二', '三'][j]}候：${h}`
      })
    })
  })
  return out
})

/* ── 六十甲子环 ───────────────────────────────────── */
const jiaziRing = computed(() => {
  const layout = layoutOf('jiazi')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  const dayGz = props.snapshot.dayGanzhi
  return JIA_ZI.map((j, i) => {
    const { a0, a1, mid } = cellAngles(layout.startAngle, step, i, dir.value)
    const active = j.name === dayGz
    return {
      key: `jz-${j.name}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      label: j.name,
      color: jiaziColor(j.nayinElement),
      active,
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      fontSize: Math.min(10 * fontScale.value, (ro - ri) * 0.5),
      title: `${j.name}｜纳音${j.nayin}（${j.nayinElement}）`,
      data: j
    }
  })
})

/* ── 纳甲六十四卦环（京房八宫，含爻画卦符） ─────────────── */
const najiaRing = computed(() => {
  const layout = layoutOf('najia')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  const depth = ro - ri
  const font = Math.min(10 * fontScale.value, depth * 0.24)
  const arc = arcWidth(ro, layout.count)
  const activeValue = JING_FANG_64_GUA.find(
    (g) => g.name === props.snapshot.jingFangGuaName
  )?.value
  return JING_FANG_64_GUA.map((g) => {
    const { a0, a1, mid } = cellAngles(layout.startAngle, step, g.jingFangOrder, dir.value)
    const active = g.value === activeValue
    const two = g.name.length === 2
    const L = cellContentLayout(depth, arc, font, two ? 2 : 1)
    return {
      key: `nj-${g.jingFangOrder}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      label: g.name,
      char0: two ? g.name[0]! : g.name,
      char1: two ? g.name[1]! : '',
      dy0: two ? '-0.525em' : '0',
      dy1: '1.05em',
      color: PALACE_COLOR[g.palace] ?? 'var(--ink-3)',
      active,
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      hex: hexagramRects(getGuaLines(g.value), L.hexTop, {
        lineWidth: L.lineWidth,
        rowHeight: L.rowHeight,
        thickness: L.thickness,
        gap: L.gap
      }),
      nameY: L.nameCenter,
      fontSize: font,
      title: `${g.name}｜${g.palace}宫${g.shiyingType}｜世在${g.shiYao}爻、应在${g.yingYao}爻`,
      data: g
    }
  })
})

/* ── 十二时辰环 ───────────────────────────────────── */
const shichenRing = computed(() => {
  const layout = layoutOf('shichen')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  return SHICHEN.map((s, i) => {
    const { a0, a1, mid } = cellAngles(layout.startAngle, step, i, dir.value)
    const active = s.zhi === props.snapshot.shichenZhi
    return {
      key: `sc-${s.zhi}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      label: s.name,
      color: BRANCH_COLOR[s.zhi] ?? 'var(--ink-3)',
      active,
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      fontSize: Math.min(13 * fontScale.value, (ro - ri) * 0.42),
      title: `${s.name}（${s.zhi}）｜${s.label}｜${s.startHour}:00-${s.endHour}:00`,
      data: s
    }
  })
})

/* ── 二十四山环 ───────────────────────────────────── */
const mountainsRing = computed(() => {
  const layout = layoutOf('mountains')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const step = stepOf(layout)
  return TWENTY_FOUR_MOUNTAINS.map((m, i) => {
    const { a0, a1, mid } = cellAngles(layout.startAngle, step, i, dir.value)
    return {
      key: `mt-${m.name}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      label: m.name,
      color: WUXING_COLOR[m.element] ?? 'var(--ink-3)',
      transform: textTransform(CX, CY, (ri + ro) / 2, mid),
      fontSize: Math.min(10 * fontScale.value, (ro - ri) * 0.5),
      title: `${m.name}（${m.zhi}）｜${m.element}`,
      data: m
    }
  })
})

/* ── 周天三百六十度刻度环 ─────────────────────────── */
/**
 * 0° 刻线落在正北（子中），与地盘二十四山同轴。
 * 每 1° 一细刻、每 10° 一中刻、每 30° 标注度数；
 * 刻线合并为一条 path 输出，避免生成 360 个独立节点。
 */
const scaleRing = computed(() => {
  const layout = layoutOf('scale')
  if (!layout) return null
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const depth = ro - ri
  const ticks: string[] = []
  const labels: { text: string; transform: string }[] = []
  for (let d = 0; d < 360; d++) {
    const a = layout.startAngle + dir.value * d
    const inner = d % 30 === 0 ? ri + depth * 0.38 : d % 10 === 0 ? ro - depth * 0.72 : ro - depth * 0.48
    const [x1, y1] = polar(CX, CY, inner, a)
    const [x2, y2] = polar(CX, CY, ro - depth * 0.08, a)
    ticks.push(`M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`)
  }
  for (let d = 0; d < 360; d += 30) {
    const a = layout.startAngle + dir.value * d
    labels.push({ text: String(d), transform: textTransform(CX, CY, ri + depth * 0.22, a) })
  }
  return { ticks: ticks.join(' '), labels, fontSize: Math.min(9 * fontScale.value, depth * 0.46) }
})

/* ── 二十八宿分度环 ───────────────────────────────── */
/**
 * 巽中起角木蛟，逆行二十四山；宿度不等宽，按比例映射到周天 360°。
 * 角宿起点锚在巽山（后天巽位在东南）中线，宿序相对山环逆行。
 */
const mansionsRing = computed(() => {
  const layout = layoutOf('mansions')
  if (!layout) return []
  const [ri, ro] = radii(layout.rInner, layout.rOuter)
  const total = MANSIONS.reduce((s, m) => s + m.degree, 0)
  const mid = (ri + ro) / 2
  const font = Math.min(11 * fontScale.value, (ro - ri) * 0.46)
  const out: {
    key: string
    path: string
    label: string
    color: string
    transform: string
    fontSize: number
    title: string
  }[] = []
  let acc = 0
  for (const m of MANSIONS) {
    const d0 = acc * (360 / total)
    const d1 = (acc + m.degree) * (360 / total)
    acc += m.degree
    // 宿序相对山环逆行
    const a0 = layout.startAngle - dir.value * d0
    const a1 = layout.startAngle - dir.value * d1
    // 弧宽不足一个字的宿（如觜宿仅半度）不落字，靠悬停提示
    const arc = (Math.abs(a1 - a0) * Math.PI * mid) / 180
    out.push({
      key: `ms-${m.name}`,
      path: ringSectorPath(CX, CY, ri, ro, a0, a1),
      label: arc >= font ? m.name : '',
      color: MANSION_QUADRANT_COLOR[m.quadrant],
      transform: textTransform(CX, CY, mid, normalizeAngle((a0 + a1) / 2)),
      fontSize: font,
      title: `${m.name}宿｜${m.quadrant}｜宿度 ${m.degreeText}（${m.degree}°）`
    })
  }
  return out
})

/* ── 分隔圆环线 ───────────────────────────────────── */
const separatorCircles = computed(() =>
  layouts.value.map((r) => r.rOuter * R).concat([CENTER_RADIUS_RATIO * R])
)

/* ── 当前时刻指针 ─────────────────────────────────── */
/**
 * 指针角度：以「当前时辰」为基准，落在该时辰格的起点（子时 = 时辰环 0 号格起点），
 * 随时辰内时间在格内推进。角度只依赖十二时辰环的起始角与格数，与半径无关，
 * 因此即使该环被隐藏，指针仍按同一规律指向。
 */
const pointerAngle = computed(() => {
  const layout = RING_LAYOUTS.find((r) => r.key === 'shichen')!
  const start = resolveStartAngle(layout, dir.value)
  const step = stepOf(layout)
  const idx = SHICHEN.findIndex((s) => s.zhi === props.snapshot.shichenZhi)
  // 时辰内进度：把分钟映射到该时辰的角度
  const d = props.snapshot.date
  const minutes = d.getHours() * 60 + d.getMinutes()
  const shichenStart = idx >= 0 ? SHICHEN[idx]!.startHour : 0
  const progress = (minutes - shichenStart * 60) / 120
  // 指针落在「时辰格起点 + 格内进度」，方向随排布方向翻转
  return normalizeAngle(start + dir.value * ((idx < 0 ? 0 : idx) + progress) * step)
})

const pointerTip = computed(() => {
  const a = pointerAngle.value
  const rad = (a * Math.PI) / 180
  const outer = (layouts.value[0]?.rOuter ?? RING_LAYOUTS[0]!.rOuter) * R
  return {
    x1: CX + Math.cos(rad) * (CENTER_RADIUS_RATIO * R),
    y1: CY + Math.sin(rad) * (CENTER_RADIUS_RATIO * R),
    x2: CX + Math.cos(rad) * outer,
    y2: CY + Math.sin(rad) * outer
  }
})

/* ── 二十四节气进度弧 ─────────────────────────────── */
const termProgressArc = computed(() => {
  const layout = layoutOf('terms')
  if (!layout) return null
  const termIdx = SOLAR_TERM_BY_LONGITUDE.findIndex((t) => t.name === props.snapshot.jieQi)
  if (termIdx < 0) return null
  const step = stepOf(layout)
  // 角度保持连续（不归一），否则最后一格的进度弧会跨过 0° 变成大圆弧
  const a0 = layout.startAngle + dir.value * termIdx * step
  const ratio = Math.min(1, Math.max(0, props.snapshot.hoursInJieQi / props.snapshot.jieQiSpanHours))
  const a1 = a0 + dir.value * step * ratio
  const r = ((layout.rInner + layout.rOuter) / 2) * R
  const [x0, y0] = polar(CX, CY, r, a0)
  const [x1, y1] = polar(CX, CY, r, a1)
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  const sweep = dir.value === 1 ? 1 : 0
  return {
    d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    color: SEASON_COLOR[SOLAR_TERM_MAP[props.snapshot.jieQi]?.season ?? '春']
  }
})

/** 交互提示 */
const hovered = defineModel<string | null>('hovered', { default: null })
function onEnter(t: string) {
  hovered.value = t
}

/* ── 当前候引线标注 ───────────────────────────────── */
const currentHouMark = computed(() => {
  const layout = layoutOf('hou')
  if (!layout) return null
  const step = stepOf(layout)
  const currentTerm = SOLAR_TERM_MAP[props.snapshot.jieQi]
  if (!currentTerm) return null
  const termIdx = SOLAR_TERM_BY_LONGITUDE.findIndex((t) => t.name === currentTerm.name)
  if (termIdx < 0) return null
  const a = cellAngles(layout.startAngle, step, termIdx * 3 + props.snapshot.houIndex, dir.value).mid
  // 标记点画在候环外缘（再外推一点，避免压住外圈的当前候名）
  const rMark = layout.rOuter * R + 5.5
  const [cx, cy] = polar(CX, CY, rMark, a)
  return { cx, cy }
})

/** 盘面上是否有任何一层可见 */
const hasAnyRing = computed(() => layouts.value.length > 0)
</script>

<template>
  <g class="dial">
    <defs>
      <radialGradient id="yx-center-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="var(--center-glow)" />
        <stop offset="100%" stop-color="var(--center-bg)" />
      </radialGradient>
      <filter id="yx-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <!-- 底盘 -->
    <circle :cx="CX" :cy="CY" :r="R" class="plate-bg" />
    <circle :cx="CX" :cy="CY" :r="CENTER_RADIUS_RATIO * R" fill="url(#yx-center-glow)" class="plate-center" />

    <!-- 分隔圆 -->
    <circle
      v-for="(r, i) in separatorCircles"
      :key="`sep-${i}`"
      :cx="CX"
      :cy="CY"
      :r="r"
      class="ring-separator"
    />

    <!-- 周天三百六十度刻度：0° 在正北（子中），与地盘二十四山同轴 -->
    <g v-if="scaleRing" class="ring ring-scale">
      <path :d="scaleRing.ticks" class="scale-ticks" />
      <text
        v-for="l in scaleRing.labels"
        :key="`sc-${l.text}`"
        :transform="l.transform"
        class="cell-text cell-scale"
        :style="{ fontSize: `${scaleRing.fontSize}px` }"
      >
        {{ l.text }}
      </text>
    </g>

    <!-- 二十八宿分度：巽中起角木蛟，逆行二十四山 -->
    <g class="ring ring-mansions">
      <g v-for="s in mansionsRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path :d="s.path" :fill="s.color" class="sector sector-thin" />
        <text
          v-if="s.label"
          :transform="s.transform"
          class="cell-text cell-mansion"
          :style="{ fontSize: `${s.fontSize}px` }"
        >
          {{ s.label }}
        </text>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 六十四卦：卦符爻画 + 卦名竖排，贴近原盘刻法 -->
    <g class="ring ring-gua">
      <g v-for="s in guaRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path :d="s.path" :fill="s.color" class="sector" />
        <g :transform="s.transform">
          <rect
            v-for="(r, i) in s.hex"
            :key="`y-${i}`"
            :x="r.x"
            :y="r.y"
            :width="r.w"
            :height="r.h"
            class="yao"
          />
          <text
            :transform="`translate(0 ${s.nameY})`"
            class="cell-text cell-gua"
            :style="{ fontSize: `${s.fontSize}px` }"
          >
            <tspan x="0" :dy="s.dy0">{{ s.char0 }}</tspan>
            <tspan x="0" :dy="s.dy1">{{ s.char1 }}</tspan>
          </text>
        </g>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 八卦 -->
    <g class="ring ring-bagua">
      <g v-for="s in baguaRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path :d="s.path" :fill="s.color" class="sector" />
        <text
          :transform="s.transform"
          class="cell-text cell-bagua"
          :style="{ fontSize: `${s.fontSize}px` }"
        >
          {{ s.unicode }}
        </text>
        <text
          :transform="s.nameTransform"
          class="cell-text cell-bagua-name"
          :style="{ fontSize: `${s.nameFontSize}px` }"
        >
          {{ s.label }}
        </text>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 二十四节气 -->
    <g class="ring ring-terms">
      <g v-for="s in termsRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path
          :d="s.path"
          :fill="s.color"
          :class="['sector', { 'is-active': s.active }]"
        />
        <text
          :transform="s.transform"
          class="cell-text cell-term"
          :style="{ fontSize: `${s.fontSize}px` }"
        >
          {{ s.label }}
        </text>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 十二辟卦（十二消息卦）：卦符爻画 + 卦名，复卦位在正北冬至 -->
    <g class="ring ring-pi">
      <g v-for="s in piRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path
          :d="s.path"
          :fill="s.color"
          :class="['sector', { 'is-active': s.active }]"
        />
        <g :transform="s.transform">
          <rect
            v-for="(r, i) in s.hex"
            :key="`y-${i}`"
            :x="r.x"
            :y="r.y"
            :width="r.w"
            :height="r.h"
            class="yao"
          />
          <text
            :transform="`translate(0 ${s.nameY})`"
            class="cell-text cell-pi"
            :style="{ fontSize: `${s.fontSize}px` }"
          >
            <tspan x="0" :dy="s.dy0">{{ s.char0 }}</tspan>
            <tspan x="0" :dy="s.dy1">{{ s.char1 }}</tspan>
          </text>
        </g>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 七十二候：72 格过密。每格标出「第X候」序号，一眼可辨一/二/三的先后；
         当前候另补一个候名（可溢出本格，邻格此时只有内圈序号，不会打架）；其余靠悬停提示 -->
    <g class="ring ring-hou">
      <g v-for="s in houRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path
          :d="s.path"
          :fill="s.color"
          :class="['sector', 'sector-thin', { 'is-active': s.active }]"
        />
        <text
          :transform="s.ordinalTransform"
          class="cell-text cell-hou-ordinal"
          :class="{ 'is-current': s.inCurrentTerm }"
          :style="{ fontSize: `${s.ordinalFontSize}px` }"
        >
          {{ s.ordinal }}
        </text>
        <text
          v-if="s.active"
          :transform="s.nameTransform"
          class="cell-text cell-hou-name"
          :style="{ fontSize: `${s.nameFontSize}px`, stroke: s.color }"
        >
          {{ s.label }}
        </text>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 六十甲子 -->
    <g class="ring ring-jiazi">
      <g v-for="s in jiaziRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path
          :d="s.path"
          :fill="s.color"
          :class="['sector', 'sector-thin', { 'is-active': s.active }]"
        />
        <text
          :transform="s.transform"
          class="cell-text cell-jiazi"
          :style="{ fontSize: `${s.fontSize}px` }"
        >
          {{ s.label }}
        </text>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 纳甲六十四卦：卦符爻画 + 卦名 -->
    <g class="ring ring-najia">
      <g v-for="s in najiaRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path
          :d="s.path"
          :fill="s.color"
          :class="['sector', 'sector-thin', { 'is-active': s.active }]"
        />
        <g :transform="s.transform">
          <rect
            v-for="(r, i) in s.hex"
            :key="`y-${i}`"
            :x="r.x"
            :y="r.y"
            :width="r.w"
            :height="r.h"
            class="yao"
          />
          <text
            :transform="`translate(0 ${s.nameY})`"
            class="cell-text cell-najia"
            :style="{ fontSize: `${s.fontSize}px` }"
          >
            <tspan x="0" :dy="s.dy0">{{ s.char0 }}</tspan>
            <tspan x="0" :dy="s.dy1">{{ s.char1 }}</tspan>
          </text>
        </g>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 十二时辰 -->
    <g class="ring ring-shichen">
      <g v-for="s in shichenRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path
          :d="s.path"
          :fill="s.color"
          :class="['sector', { 'is-active': s.active }]"
        />
        <text
          :transform="s.transform"
          class="cell-text cell-shichen"
          :style="{ fontSize: `${s.fontSize}px` }"
        >
          {{ s.label }}
        </text>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 二十四山 -->
    <g class="ring ring-mountains">
      <g v-for="s in mountainsRing" :key="s.key" @mouseenter="onEnter(s.title)">
        <path :d="s.path" :fill="s.color" class="sector sector-thin" />
        <text
          :transform="s.transform"
          class="cell-text cell-mountain"
          :style="{ fontSize: `${s.fontSize}px` }"
        >
          {{ s.label }}
        </text>
        <title>{{ s.title }}</title>
      </g>
    </g>

    <!-- 节气进度弧 -->
    <path
      v-if="termProgressArc"
      :d="termProgressArc.d"
      :stroke="termProgressArc.color"
      class="term-progress"
      filter="url(#yx-soft-glow)"
    />

    <!-- 当前候标记（高亮格外缘的三角标，不遮挡文字） -->
    <g v-if="currentHouMark" class="hou-mark">
      <circle :cx="currentHouMark.cx" :cy="currentHouMark.cy" r="5" class="hou-ring" />
      <circle :cx="currentHouMark.cx" :cy="currentHouMark.cy" r="2.8" class="hou-dot" />
    </g>

    <!-- 当前时刻指针 -->
    <line
      :x1="pointerTip.x1"
      :y1="pointerTip.y1"
      :x2="pointerTip.x2"
      :y2="pointerTip.y2"
      class="time-pointer"
    />
    <circle
      :cx="pointerTip.x2"
      :cy="pointerTip.y2"
      :r="6"
      class="pointer-head"
    />
    <title v-if="!hasAnyRing">盘面暂无可见环层</title>
  </g>
</template>

<style scoped>
.dial {
  user-select: none;
}

.plate-bg {
  fill: var(--plate-bg);
  stroke: var(--plate-edge);
  stroke-width: 2;
}

.plate-center {
  stroke: var(--plate-edge);
  stroke-width: 1.5;
}

.ring-separator {
  fill: none;
  stroke: var(--ring-separator);
  stroke-width: 1;
}

.sector {
  stroke: var(--cell-stroke);
  stroke-width: 0.8;
  transition: opacity 0.25s ease, filter 0.25s ease;
  cursor: pointer;
}

.sector-thin {
  stroke-width: 0.5;
}

.sector.is-active {
  filter: url(#yx-soft-glow);
  stroke: var(--cell-active-stroke);
  stroke-width: 1.6;
}

.ring:hover .sector {
  opacity: 0.55;
}

.ring:hover .sector:hover,
.ring:hover .sector.is-active {
  opacity: 1;
}

.cell-text {
  fill: var(--cell-ink);
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  font-family: var(--font-heiti);
}

.yao {
  fill: var(--cell-ink);
  opacity: 0.82;
  pointer-events: none;
}

.cell-gua {
  font-weight: 600;
}

.cell-bagua {
  font-weight: 600;
}

.cell-bagua-name {
  font-weight: 600;
}

.cell-term {
  font-weight: 600;
}

/* 七十二候：序号（内圈）与当前候名（外圈） */
.cell-hou-ordinal {
  fill: var(--ink-2);
  opacity: 0.6;
  font-weight: 600;
}

.cell-hou-ordinal.is-current {
  fill: var(--accent);
  opacity: 1;
  font-weight: 700;
}

.cell-hou-name {
  fill: var(--ink-1);
  font-weight: 700;
  /* 先描边后填字：描边取该格底色，把穿过的扇形分隔线让到字下面，候名才清楚 */
  paint-order: stroke fill;
  stroke-width: 3.4px;
  stroke-linejoin: round;
}

.cell-pi {
  font-weight: 600;
}

.cell-najia {
  font-weight: 600;
}

.cell-shichen {
  font-weight: 600;
}

.scale-ticks {
  fill: none;
  stroke: var(--ink-3);
  stroke-width: 0.6;
  opacity: 0.8;
  pointer-events: none;
}

.cell-scale {
  fill: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.cell-mansion {
  fill: #f7f0e2;
  font-weight: 600;
}

.term-progress {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  opacity: 0.9;
  pointer-events: none;
}

.time-pointer {
  stroke: var(--pointer-color);
  stroke-width: 2.2;
  stroke-linecap: round;
  pointer-events: none;
  filter: url(#yx-soft-glow);
}

.hou-dot {
  fill: var(--accent);
}

.hou-ring {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.2;
  opacity: 0.55;
}

.pointer-head {
  fill: var(--pointer-color);
  stroke: var(--plate-bg);
  stroke-width: 1.5;
  pointer-events: none;
}
</style>
