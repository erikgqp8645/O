/**
 * 先天六十四卦圆图自检（站内先天六十四卦盘 / 卦关系页先天圆图布局）
 *
 * 圆图（邵雍伏羲六十四卦圆图）以**时间**为序，圆图象天、方图象地。
 * 排布规则（唯一实现在 `@/utils/guaUtils`）：
 *   左半（冬至→夏至，阳顺，天道左旋）：内卦卦主 震→离→兑→乾，
 *         每组内外卦依次 坤→艮→坎→巽→震→离→兑→乾
 *   右半（夏至→冬至，阴逆，地道右旋）：内卦卦主 巽→坎→艮→坤，
 *         每组内外卦依次 乾→兑→离→震→巽→坎→艮→坤
 *
 * 圆周位次（pos 0 起）：复(0) … 乾(31) 姤(32) … 坤(63)
 *   → 复≡冬至、姤≡夏至，二者正对；乾、坤亦正对。
 *
 * 权威依据（两处互证）：
 *   悟行阁《先天六十四卦方圆图解析》—— 圆图 64 卦名单
 *   易象乾坤《伏羲先天六十四卦圆图规律》—— 排布规律
 *
 * ⚠️ 圆图**不是**「相邻两卦变一爻」的次序（那是方图的性质）：
 *   64 条相邻边中只有 34 条恰好变一爻。
 * ⚠️ 圆图位次也不是六爻「位反转」——位反转会把左右两个半圆对调；
 *   位反转真正的用途是**综卦**（上下颠倒），两者不可混用。
 */
import { describe, expect, it } from 'vitest'

import { getXiantianPos, getGuaLines, bitReverse6 } from '@/utils/guaUtils'
import { XIANTIAN_CIRCLE_ORDER, XIANTIAN_64_GUA, getXiantianCenterAngle, GUA_STEP } from '@/data/sixtyFourGua'
import { getGuaAngle } from '@/utils/guaLayoutConstants'
import { computeZonggua } from '@/utils/guaRelations'
import { XIANTIAN_CIRCLE_ORDER as YIXIANG_CIRCLE_ORDER } from '@/data/yixiang/gua'

/**
 * 悟行阁权威名单。
 * 左半按「从乾向左到复」列出（圆周上是复→乾，故此处需倒序比对）；
 * 右半按「从坤向右到姤」列出（圆周上是姤→坤，同样倒序比对）。
 */
const AUTHORITATIVE_LEFT = (
  '乾、夬、大有、大壮、小畜、需、大畜、泰、' +
  '履、兑、睽、归妹、中孚、节、损、临、' +
  '同人、革、离、丰、家人、既济、贲、明夷、' +
  '无妄、随、噬嗑、震、益、屯、颐、复'
).split('、')

const AUTHORITATIVE_RIGHT = (
  '坤、剥、比、观、豫、晋、萃、否、' +
  '谦、艮、蹇、渐、小过、旅、咸、遁、' +
  '师、蒙、坎、涣、解、未济、困、讼、' +
  '升、蛊、井、巽、恒、鼎、大过、姤'
).split('、')

/** 阳爻个数 */
function yangCount(value: number): number {
  return getGuaLines(value).filter(Boolean).length
}

describe('先天圆图：次序', () => {
  it('圆图 64 卦互异，且覆盖全部六十四卦', () => {
    expect(XIANTIAN_CIRCLE_ORDER).toHaveLength(64)
    expect(new Set(XIANTIAN_CIRCLE_ORDER).size, '圆图有重复卦').toBe(64)
  })

  it('左半（冬至→夏至）与权威名单逐字一致', () => {
    expect(XIANTIAN_CIRCLE_ORDER.slice(0, 32).join('、')).toBe(
      AUTHORITATIVE_LEFT.slice().reverse().join('、')
    )
  })

  it('右半（夏至→冬至）与权威名单逐字一致', () => {
    expect(XIANTIAN_CIRCLE_ORDER.slice(32).join('、')).toBe(
      AUTHORITATIVE_RIGHT.slice().reverse().join('、')
    )
  })

  it('关键卦的圆周位次：复 0、乾 31、姤 32、坤 63', () => {
    const pos = (name: string) => XIANTIAN_CIRCLE_ORDER.indexOf(name)
    expect(pos('复')).toBe(0)
    expect(pos('乾')).toBe(31)
    expect(pos('姤')).toBe(32)
    expect(pos('坤')).toBe(63)
  })

  it('复与姤正对、乾与坤正对；复紧邻坤（圆周首尾相接）', () => {
    const pos = (name: string) => XIANTIAN_CIRCLE_ORDER.indexOf(name)
    expect(pos('姤') - pos('复'), '复姤未正对').toBe(32)
    expect(pos('坤') - pos('乾'), '乾坤未正对').toBe(32)
    expect((pos('坤') - pos('复') + 64) % 64, '复应紧邻坤').toBe(63)
  })

  it('与易象罗盘共用同一套排布规则（两处不得漂移）', () => {
    expect(XIANTIAN_CIRCLE_ORDER.join('、')).toBe(YIXIANG_CIRCLE_ORDER.join('、'))
  })

  it('圆图不是「每卦一变」：64 条相邻边中恰好变一爻的只有 34 条', () => {
    const diffs = XIANTIAN_CIRCLE_ORDER.map((name, i) => {
      const a = XIANTIAN_64_GUA.find((g) => g.name === name)!.value
      const next = XIANTIAN_CIRCLE_ORDER[(i + 1) % 64]!
      const b = XIANTIAN_64_GUA.find((g) => g.name === next)!.value
      return getGuaLines(a).filter((x, k) => x !== getGuaLines(b)[k]).length
    })
    expect(diffs.filter((d) => d === 1)).toHaveLength(34)
    expect(diffs.filter((d) => d === 1).length, '「每卦一变」不是圆图性质').toBeLessThan(64)
  })
})

describe('先天圆图：阴阳消长', () => {
  const valueOf = (name: string) => XIANTIAN_64_GUA.find((g) => g.name === name)!.value

  it('左半阳爻合计 112、阴爻 80；右半反之（经典圆图的半圆统计）', () => {
    const sum = (names: readonly string[]) =>
      names.reduce((s, n) => s + yangCount(valueOf(n)), 0)
    expect(sum(XIANTIAN_CIRCLE_ORDER.slice(0, 32)), '左半阳爻合计').toBe(112)
    expect(sum(XIANTIAN_CIRCLE_ORDER.slice(32)), '右半阳爻合计').toBe(80)
  })

  it('四个转折点：复一阳生、乾六阳尽、姤一阴生、坤六阴尽', () => {
    expect(yangCount(valueOf('复')), '复').toBe(1)
    expect(yangCount(valueOf('乾')), '乾').toBe(6)
    expect(yangCount(valueOf('姤')), '姤').toBe(5)
    expect(yangCount(valueOf('坤')), '坤').toBe(0)
  })
})

describe('先天圆图：盘面角度（SVG 空间，0°正右 / 90°正下 / 270°正上）', () => {
  const angleOf = (name: string) => {
    const g = XIANTIAN_64_GUA.find((x) => x.name === name)!
    return getXiantianCenterAngle(g.pos)
  }

  it('乾居正上 270°、坤居正下 90°，二者正对', () => {
    expect(angleOf('乾')).toBeCloseTo(270, 6)
    expect(angleOf('坤')).toBeCloseTo(90, 6)
  })

  it('姤紧邻乾之右、复紧邻坤之左（各差半格 5.625°）', () => {
    expect(angleOf('姤')).toBeCloseTo(270 + GUA_STEP, 6)
    expect(angleOf('夬')).toBeCloseTo(270 - GUA_STEP, 6)
    expect(angleOf('复')).toBeCloseTo(90 + GUA_STEP, 6)
  })

  it('两仪各占半圆：阳仪（复…乾）在左半、阴仪（姤…坤）在右半', () => {
    const yangHalf = XIANTIAN_64_GUA.filter((g) => g.pos <= 31)
    const yinHalf = XIANTIAN_64_GUA.filter((g) => g.pos >= 32)
    expect(yangHalf).toHaveLength(32)
    expect(yinHalf).toHaveLength(32)
    // 正上/正下轴上的各一卦：乾（阳半端）、坤（阴半端）
    const onAxis = (deg: number) => Math.abs(Math.cos((deg * Math.PI) / 180)) < 1e-9
    expect(yangHalf.filter((g) => onAxis(g.centerAngle)).map((g) => g.name)).toEqual(['乾'])
    expect(yinHalf.filter((g) => onAxis(g.centerAngle)).map((g) => g.name)).toEqual(['坤'])
    // 其余各 31 卦：阳仪居左半（cos<0）、阴仪居右半（cos>0）
    expect(
      yangHalf.filter((g) => !onAxis(g.centerAngle) && Math.cos((g.centerAngle * Math.PI) / 180) < 0)
    ).toHaveLength(31)
    expect(
      yinHalf.filter((g) => !onAxis(g.centerAngle) && Math.cos((g.centerAngle * Math.PI) / 180) > 0)
    ).toHaveLength(31)
  })

  it('卦关系页的「先天圆图」布局与本盘同一套角度', () => {
    for (const g of XIANTIAN_64_GUA) {
      expect(getGuaAngle(g.value, 'xiantian'), `${g.name} 布局角`).toBeCloseTo(g.centerAngle, 6)
    }
  })

  it('pos 与卦名互为闭环（渲染数据与规则一致）', () => {
    XIANTIAN_64_GUA.forEach((g, i) => {
      expect(g.pos, `${g.name} 的 pos`).toBe(i)
      expect(g.name, `pos ${i} 的卦名`).toBe(XIANTIAN_CIRCLE_ORDER[i])
      expect(getXiantianPos(g.value), `${g.name} 的位次`).toBe(i)
    })
  })
})

describe('圆图位次与位反转（综卦）是两回事', () => {
  it('综卦仍取六爻位反转，不受圆图位次修正影响', () => {
    // 复（value 1）综之得剥（value 32）；位反转 = 32
    expect(computeZonggua(1)).toBe(32)
    expect(computeZonggua(1)).toBe(bitReverse6(1))
    // 屯（value 17）综之得蒙（value 34）
    expect(computeZonggua(17)).toBe(34)
    // 乾六爻全阳，倒过来仍是乾（自综）
    expect(computeZonggua(63)).toBe(63)
  })

  it('圆图位次与位反转互不相同（早前把二者混用才导致左右半圆对调）', () => {
    const same = XIANTIAN_64_GUA.filter((g) => g.pos === bitReverse6(g.value))
    expect(same, '圆图位次不应整体等同于位反转').toHaveLength(0)
  })
})
