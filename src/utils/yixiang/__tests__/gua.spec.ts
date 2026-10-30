/**
 * 先天六十四卦圆图自检
 *
 * 圆图（邵雍伏羲六十四卦圆图）以**时间**为序，圆图象天、方图象地。
 * 方位：上南见乾、下北见坤、左东右西；分左右两个半圆：
 *   左半（冬至→夏至，阳顺，天道左旋）：下卦卦主 震→离→兑→乾，
 *         每组内上卦依次 坤→艮→坎→巽→震→离→兑→乾
 *   右半（夏至→冬至，阴逆，地道右旋）：下卦卦主 巽→坎→艮→坤，
 *         每组内上卦依次 乾→兑→离→震→巽→坎→艮→坤
 *
 * 圆周位次（pos 0 起）：复(0) … 乾(31) 姤(32) … 坤(63)
 *   → 复≡冬至、姤≡夏至，二者正对；乾南坤北亦正对。
 *
 * 权威依据（两处互证）：
 *   悟行阁《先天六十四卦方圆图解析》—— 圆图 64 卦名单
 *   易象乾坤《伏羲先天六十四卦圆图规律》—— 排布规律
 *
 * ⚠️ 圆图**不是**「相邻两卦变一爻」的次序（那是方图的性质）：
 *   64 条相邻边中只有 34 条恰好变一爻。下面的断言把这一点也钉住，
 *   免得日后又有人拿「每卦一变」当圆图规则去反推。
 */
import { describe, expect, it } from 'vitest'

import {
  XIANTIAN_64_GUA,
  XIANTIAN_CIRCLE_ORDER,
  WENWANG_GUA_BY_VALUE,
  getGuaLines
} from '@/data/yixiang/gua'

/** 阳爻个数 */
function yangCount(value: number): number {
  return getGuaLines(value).filter(Boolean).length
}

/** value → 卦名 */
const NAME_BY_VALUE = new Map(WENWANG_GUA_BY_VALUE.map((m) => [m.value, m.name] as const))

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

describe('先天六十四卦圆图：次序', () => {
  it('圆图 64 卦互异，且覆盖全部六十四卦', () => {
    expect(XIANTIAN_CIRCLE_ORDER).toHaveLength(64)
    expect(new Set(XIANTIAN_CIRCLE_ORDER).size, '圆图有重复卦').toBe(64)
    expect(new Set(XIANTIAN_CIRCLE_ORDER)).toEqual(new Set(WENWANG_GUA_BY_VALUE.map((m) => m.name)))
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

  it('圆图不是「每卦一变」：64 条相邻边中恰好变一爻的只有 34 条', () => {
    const diffs = XIANTIAN_CIRCLE_ORDER.map((name, i) => {
      const a = WENWANG_GUA_BY_VALUE.find((m) => m.name === name)!.value
      const next = XIANTIAN_CIRCLE_ORDER[(i + 1) % 64]!
      const b = WENWANG_GUA_BY_VALUE.find((m) => m.name === next)!.value
      return getGuaLines(a).filter((x, k) => x !== getGuaLines(b)[k]).length
    })
    expect(diffs.filter((d) => d === 1)).toHaveLength(34)
    expect(diffs.filter((d) => d === 1).length, '「每卦一变」不是圆图性质').toBeLessThan(64)
  })
})

describe('先天六十四卦圆图：阴阳消长', () => {
  const valueOf = (name: string) => WENWANG_GUA_BY_VALUE.find((m) => m.name === name)!.value

  it('左半阳爻合计 112、阴爻 80；右半反之（经典圆图的半圆统计）', () => {
    const sum = (names: readonly string[]) =>
      names.reduce((s, n) => s + yangCount(valueOf(n)), 0)
    const left = sum(XIANTIAN_CIRCLE_ORDER.slice(0, 32))
    const right = sum(XIANTIAN_CIRCLE_ORDER.slice(32))
    expect(left, '左半阳爻合计').toBe(112)
    expect(right, '右半阳爻合计').toBe(80)
    expect(left + right, '两半阳爻合计').toBe(192)
  })

  it('四个转折点：复一阳生、乾六阳尽、姤一阴生、坤六阴尽', () => {
    expect(yangCount(valueOf('复')), '复').toBe(1)
    expect(yangCount(valueOf('乾')), '乾').toBe(6)
    expect(yangCount(valueOf('姤')), '姤').toBe(5)
    expect(yangCount(valueOf('坤')), '坤').toBe(0)
  })

  it('复的一阳在初爻、坤的一阳残在上爻（与十二辟卦同源）', () => {
    const fu = getGuaLines(valueOf('复'))
    expect(fu[0], '复初爻').toBe(true)
    expect(fu.slice(1).every((x) => !x), '复其余五爻').toBe(true)
    const bo = getGuaLines(valueOf('剥'))
    expect(bo[5], '剥上爻').toBe(true)
    expect(bo.slice(0, 5).every((x) => !x), '剥其余五爻').toBe(true)
  })
})

describe('先天六十四卦圆图：与渲染数据一致', () => {
  it('XIANTIAN_64_GUA 按 pos 升序，pos 与圆图次序一致', () => {
    expect(XIANTIAN_64_GUA).toHaveLength(64)
    XIANTIAN_64_GUA.forEach((g, i) => {
      expect(g.pos, `${g.name} 的 pos`).toBe(i)
      expect(g.name, `pos ${i} 的卦名`).toBe(XIANTIAN_CIRCLE_ORDER[i])
    })
  })

  it('卦名 → value → 卦名 闭环（八经卦 bit 编码未错）', () => {
    for (const g of XIANTIAN_64_GUA) {
      expect(NAME_BY_VALUE.get(g.value), `${g.name} 的 value 反查`).toBe(g.name)
      expect(g.outer, `${g.name} 外卦`).toBeTruthy()
      expect(g.inner, `${g.name} 内卦`).toBeTruthy()
    }
  })
})
