/**
 * 方位锚点对位自检
 *
 * 传统风水罗盘的各环不是各自随意排布的，而是全部锚定到同一套方位基准：
 *   正北（子中）· 正东（卯中）· 正南（午中）· 正西（酉中）
 *
 * 本盘采用罗盘古式「上南下北、左东右西」：
 *   正上 = 南（午）· 正下 = 北（子）· 正左 = 东（卯）· 正右 = 西（酉）
 *
 * 断言口径：
 *   bearing —— 方位角，0° = 正北，顺时针增加
 */
import { describe, expect, it } from 'vitest'

import {
  RING_LAYOUTS,
  TWENTY_FOUR_MOUNTAINS,
  baguaCellAngles,
  computeLayouts,
  resolveStartAngle,
  type RingLayout
} from '@/utils/yixiang/rings'
import { svgToBearing } from '@/utils/yixiang/geometry'
import { XIANTIAN_64_GUA, JING_FANG_64_GUA, getGuaLines } from '@/data/yixiang/gua'
import { PI_GUA } from '@/data/yixiang/piGua'
import { BAGUA_XIANTIAN_ANGLE } from '@/data/yixiang/bagua'
import { SOLAR_TERM_BY_LONGITUDE } from '@/data/yixiang/solarTerms'
import { JIA_ZI, SHICHEN } from '@/data/yixiang/ganzhi'
import { MANSIONS, MANSIONS_TOTAL_DEGREE } from '@/data/yixiang/mansions'

/** 取出某一环的已解算布局（起始角已按锚点算好） */
function ring(key: string, dir: 1 | -1 = 1): RingLayout {
  const l = computeLayouts([key], dir)[0]
  expect(l, `环 ${key} 未解算`).toBeTruthy()
  return l!
}

/** 环内第 index 格的圆心方位角 */
function bearingOfCell(layout: RingLayout, index: number, dir: 1 | -1 = 1): number {
  const step = 360 / layout.count
  return svgToBearing(layout.startAngle + dir * (index + 0.5) * step)
}

/** 环内第 index 格的圆心方位角，落在 [-180°, 180°) 区间（便于做区间断言） */
function signedBearing(layout: RingLayout, index: number, dir: 1 | -1 = 1): number {
  const b = bearingOfCell(layout, index, dir)
  return ((b + 540) % 360) - 180
}

/** 锚点实际落点（等分格算圆心，起算格算起点） */
function anchorLanding(layout: RingLayout, dir: 1 | -1 = 1): number {
  const a = layout.anchor!
  const step = 360 / layout.count
  const offset = a.mode === 'start' ? a.index : a.index + 0.5
  return svgToBearing(layout.startAngle + dir * offset * step)
}

/** 某标签在环内的格序号 */
function idxOf(list: readonly { name: string }[], name: string): number {
  return list.findIndex((x) => x.name === name)
}

describe('方位锚点：解算机制', () => {
  it('每一层环都声明了锚点', () => {
    for (const l of RING_LAYOUTS) {
      expect(l.anchor, `${l.key} 缺锚点`).toBeTruthy()
    }
  })

  it('锚点无论顺时针还是逆时针排布都落在同一方位', () => {
    for (const l of RING_LAYOUTS) {
      expect(anchorLanding(ring(l.key, 1), 1), `${l.key} 顺时针`).toBeCloseTo(
        l.anchor!.bearing,
        6
      )
      expect(anchorLanding(ring(l.key, -1), -1), `${l.key} 逆时针`).toBeCloseTo(
        l.anchor!.bearing,
        6
      )
    }
  })

  it('computeLayouts 解出的起始角与 resolveStartAngle 一致', () => {
    for (const l of RING_LAYOUTS) {
      expect(computeLayouts([l.key], 1)[0]!.startAngle).toBeCloseTo(
        resolveStartAngle(l, 1),
        6
      )
    }
  })
})

describe('方位锚点：各环对位', () => {
  it('二十四山：子在正北、午在正南、卯在正东、酉在正西', () => {
    const l = ring('mountains')
    const at = (n: string) => bearingOfCell(l, idxOf(TWENTY_FOUR_MOUNTAINS, n))
    expect(at('子')).toBeCloseTo(0, 6)
    expect(at('午')).toBeCloseTo(180, 6)
    expect(at('卯')).toBeCloseTo(90, 6)
    expect(at('酉')).toBeCloseTo(270, 6)
  })

  it('二十四节气：冬至与子中同轴，二分二至落在子卯午酉', () => {
    const l = ring('terms')
    const at = (n: string) =>
      bearingOfCell(l, SOLAR_TERM_BY_LONGITUDE.findIndex((t) => t.name === n))
    expect(at('冬至')).toBeCloseTo(0, 6)
    expect(at('春分')).toBeCloseTo(90, 6)
    expect(at('夏至')).toBeCloseTo(180, 6)
    expect(at('秋分')).toBeCloseTo(270, 6)
  })

  it('七十二候：三候严格三等分所属节气格（每候 5°，一候起于节气起点）', () => {
    const hou = ring('hou')
    const terms = ring('terms')
    const stepT = 360 / terms.count
    const stepH = 360 / hou.count
    for (let i = 0; i < SOLAR_TERM_BY_LONGITUDE.length; i++) {
      const termStart = terms.startAngle + i * stepT
      const termName = SOLAR_TERM_BY_LONGITUDE[i]!.name
      for (let j = 0; j < 3; j++) {
        const houStart = hou.startAngle + (i * 3 + j) * stepH
        expect(houStart, `${termName} 第${j + 1}候未与节气格边界对齐`).toBeCloseTo(
          termStart + j * stepH,
          6
        )
      }
    }
  })

  it('七十二候：冬至三候全部落在子中 ±7.5° 内，不越入小寒格', () => {
    const hou = ring('hou')
    const termIdx = SOLAR_TERM_BY_LONGITUDE.findIndex((t) => t.name === '冬至')
    for (let j = 0; j < 3; j++) {
      const mid = signedBearing(hou, termIdx * 3 + j)
      expect(mid, `冬至第${j + 1}候越出了冬至格`).toBeGreaterThan(-7.5 - 1e-9)
      expect(mid, `冬至第${j + 1}候越出了冬至格`).toBeLessThan(7.5 + 1e-9)
    }
    // 三候自西向东依次：初候 -5° → 二候 0°（子中）→ 三候 +5°
    expect(signedBearing(hou, termIdx * 3)).toBeCloseTo(-5, 6)
    expect(signedBearing(hou, termIdx * 3 + 1)).toBeCloseTo(0, 6)
    expect(signedBearing(hou, termIdx * 3 + 2)).toBeCloseTo(5, 6)
  })

  it('八卦：乾居正南、坤居正北、离居正东、坎居正西（卦格居中于方位）', () => {
    const step = 360 / 8
    const at = (name: string) =>
      svgToBearing(baguaCellAngles(BAGUA_XIANTIAN_ANGLE[name]!, step).mid)
    expect(at('乾')).toBeCloseTo(180, 6)
    expect(at('坤')).toBeCloseTo(0, 6)
    expect(at('离')).toBeCloseTo(90, 6)
    expect(at('坎')).toBeCloseTo(270, 6)
  })

  it('纳甲六十四卦：坎≡冬至、离≡夏至、震≡春分、兑≡秋分', () => {
    const l = ring('najia')
    const at = (name: string) => bearingOfCell(l, idxOf(JING_FANG_64_GUA, name))
    expect(at('坎')).toBeCloseTo(0, 6)
    expect(at('震')).toBeCloseTo(90, 6)
    expect(at('离')).toBeCloseTo(180, 6)
    expect(at('兑')).toBeCloseTo(270, 6)
  })

  it('十二时辰：子时与子中同轴', () => {
    const l = ring('shichen')
    expect(bearingOfCell(l, SHICHEN.findIndex((s) => s.zhi === '子'))).toBeCloseTo(0, 6)
  })

  it('六十甲子：甲子与子中同轴', () => {
    const l = ring('jiazi')
    expect(bearingOfCell(l, JIA_ZI.findIndex((j) => j.name === '甲子'))).toBeCloseTo(0, 6)
  })

  it('先天六十四卦：乾为天居正南', () => {
    const l = ring('gua')
    expect(bearingOfCell(l, idxOf(XIANTIAN_64_GUA, '乾'))).toBeCloseTo(180, 6)
  })

  it('周天刻度：0° 刻线在正北', () => {
    expect(svgToBearing(ring('scale').startAngle)).toBeCloseTo(0, 6)
  })

  it('二十八宿：角宿起于巽（后天巽位在东南 135°），逆行二十四山', () => {
    expect(svgToBearing(ring('mansions').startAngle)).toBeCloseTo(135, 6)
  })

  it('二十八宿：二十八宿齐全，宿度合计 358 度', () => {
    expect(MANSIONS).toHaveLength(28)
    expect(MANSIONS_TOTAL_DEGREE).toBeCloseTo(358, 6)
    expect(MANSIONS.map((m) => m.name)).toContain('角')
    expect(MANSIONS.map((m) => m.name)).toContain('轸')
  })
})

describe('十二辟卦（十二消息卦）', () => {
  const pi = () => ring('pi')
  const termIdx = (name: string) =>
    SOLAR_TERM_BY_LONGITUDE.findIndex((t) => t.name === name)

  it('四正卦落在子卯午酉：复≡冬至、大壮≡春分、姤≡夏至、观≡秋分', () => {
    const l = pi()
    const at = (name: string) => bearingOfCell(l, idxOf(PI_GUA, name))
    expect(at('复')).toBeCloseTo(0, 6)
    expect(at('大壮')).toBeCloseTo(90, 6)
    expect(at('姤')).toBeCloseTo(180, 6)
    expect(at('观')).toBeCloseTo(270, 6)
  })

  it('四正卦与二十四节气环的二分二至逐点重合', () => {
    const l = pi()
    const terms = ring('terms')
    for (const [piName, termName] of [
      ['复', '冬至'],
      ['大壮', '春分'],
      ['姤', '夏至'],
      ['观', '秋分']
    ] as const) {
      expect(bearingOfCell(l, idxOf(PI_GUA, piName))).toBeCloseTo(
        bearingOfCell(terms, termIdx(termName)),
        6
      )
    }
  })

  it('每卦格心对准所辖第一个节气，第二个节气落在格界（错半格关系）', () => {
    const l = pi()
    const terms = ring('terms')
    for (const p of PI_GUA) {
      expect(bearingOfCell(l, p.index)).toBeCloseTo(
        bearingOfCell(terms, termIdx(p.terms[0])),
        6
      )
      // 所辖第二个节气与第一个相隔一个节气格（15°）
      expect(bearingOfCell(terms, termIdx(p.terms[1]))).toBeCloseTo(
        bearingOfCell(terms, termIdx(p.terms[0])) + 15,
        6
      )
    }
  })

  it('十二卦 × 每卦两个节气，恰好覆盖二十四节气', () => {
    expect(PI_GUA).toHaveLength(12)
    const covered = PI_GUA.flatMap((p) => [...p.terms])
    expect(covered).toHaveLength(24)
    expect(new Set(covered).size).toBe(24)
    for (const t of SOLAR_TERM_BY_LONGITUDE) {
      expect(covered).toContain(t.name)
    }
  })

  it('阴阳消长：复一阳渐增至乾六阳，姤五阳渐减至坤全阴', () => {
    expect(PI_GUA.map((p) => p.yangCount)).toEqual([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0])
    // 爻象须与六十四卦表同源：阳爻数与爻画一致
    for (const p of PI_GUA) {
      const yang = getGuaLines(p.guaValue).filter(Boolean).length
      expect(yang, `${p.name} 阳爻数与爻画不符`).toBe(p.yangCount)
    }
  })

  it('复卦一阳生于初爻，剥卦一阳残于上爻', () => {
    const fu = getGuaLines(PI_GUA[0]!.guaValue)
    expect(fu[0]).toBe(true)
    expect(fu.slice(1).every((x) => !x)).toBe(true)
    const bo = getGuaLines(PI_GUA[10]!.guaValue)
    expect(bo[5]).toBe(true)
    expect(bo.slice(0, 5).every((x) => !x)).toBe(true)
  })
})
