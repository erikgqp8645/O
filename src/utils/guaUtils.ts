/**
 * 卦算法纯函数工具
 *
 * 从 data/sixtyFourGua.ts 提取的纯计算函数：
 *   - 位反转（综卦用）、六爻提取、先天圆图位次、Unicode 卦符
 *
 * 无数据依赖，可独立测试。
 */

/**
 * 6 位整体位反转：bit0↔bit5, bit1↔bit4, bit2↔bit3
 *
 * ⚠️ 这是**综卦（上下颠倒）**的运算，与先天圆图的圆周位次是两回事：
 *   圆图位次由伏羲排布规则算出（见本文件「先天圆图位次」一节），不是位反转。
 *   早前两处曾把二者混为一谈，导致圆图左右两半被对调。
 */
export function bitReverse6(value: number): number {
  let r = 0
  for (let i = 0; i < 6; i++) {
    r = (r << 1) | ((value >> i) & 1)
  }
  return r
}

/** 由 value 取六爻数组（自下而上，下标0=初爻；true=阳爻） */
export function getGuaLines(value: number): boolean[] {
  return Array.from({ length: 6 }, (_, i) => Boolean(value & (1 << i)))
}

// ─── 先天六十四卦圆图（伏羲 / 邵雍）位次 ───
//
// 【排布规则】圆图象天、方图象地，以**时间**为序，分左右两个半圆：
//   左半（冬至→夏至，阳顺，天道左旋）：内卦卦主 震→离→兑→乾，
//         每组内外卦依次 坤→艮→坎→巽→震→离→兑→乾
//   右半（夏至→冬至，阴逆，地道右旋）：内卦卦主 巽→坎→艮→坤，
//         每组内外卦依次 乾→兑→离→震→巽→坎→艮→坤
//
// 【圆周位次 pos】0 起，顺时针：
//   pos 0  = 地雷复（冬至，一阳生）
//   pos 31 = 乾为天
//   pos 32 = 天风姤（夏至，一阴生）
//   pos 63 = 坤为地
//   故复≡冬至、姤≡夏至，二者正对；乾、坤亦正对。
//
//   ⚠️ 圆图**不是**「相邻两卦变一爻」的次序（那是方图的性质）：
//     64 条相邻边中只有 34 条恰好变一爻。别拿「每卦一变」去反推圆图。
//
//   出处：悟行阁《先天六十四卦方圆图解析》、易象乾坤《伏羲先天六十四卦圆图规律》。
//
// 【为什么不是位反转】位反转会把左右两个半圆对调：坤与乾在圆周上首尾相邻、
//   姤紧贴乾，阴阳两极挤在同一侧，与圆图「复≡冬至、姤≡夏至正对」的结构完全不符。

/** 圆图左半（冬至→夏至）内卦卦主的 bit 值：震1 离5 兑3 乾7 */
const XIANTIAN_LEFT_INNER_BITS: readonly number[] = [1, 5, 3, 7]

/** 圆图左半的外卦次序（bit 值）：坤0 艮4 坎2 巽6 震1 离5 兑3 乾7 */
const XIANTIAN_LEFT_OUTER_BITS: readonly number[] = [0, 4, 2, 6, 1, 5, 3, 7]

/** 圆图右半（夏至→冬至）内卦卦主的 bit 值：巽6 坎2 艮4 坤0 */
const XIANTIAN_RIGHT_INNER_BITS: readonly number[] = [6, 2, 4, 0]

/** 圆图右半的外卦次序（bit 值）：乾7 兑3 离5 震1 巽6 坎2 艮4 坤0 */
const XIANTIAN_RIGHT_OUTER_BITS: readonly number[] = [7, 3, 5, 1, 6, 2, 4, 0]

/**
 * value → 先天圆周位次（0-63），由排布规则算出。
 *
 * 索引即 value（0..63），值为 pos；-1 表示未覆盖（正常情况下不会出现）。
 */
export const XIANTIAN_POS_BY_VALUE: readonly number[] = (() => {
  const pos = new Array<number>(64).fill(-1)
  let cursor = 0
  const push = (inner: number, outer: number): void => {
    const value = inner + outer * 8
    if (pos[value] !== -1) {
      throw new Error(`[guaUtils] 先天圆图排布出现重复卦 value=${value}`)
    }
    pos[value] = cursor++
  }
  for (const inner of XIANTIAN_LEFT_INNER_BITS) {
    for (const outer of XIANTIAN_LEFT_OUTER_BITS) push(inner, outer)
  }
  for (const inner of XIANTIAN_RIGHT_INNER_BITS) {
    for (const outer of XIANTIAN_RIGHT_OUTER_BITS) push(inner, outer)
  }
  if (cursor !== 64) {
    throw new Error(`[guaUtils] 先天圆图排布只排出 ${cursor} 卦`)
  }
  return pos
})()

/** 由 value 取先天圆周位置 0-63（伏羲排布规则，非位反转） */
export function getXiantianPos(value: number): number {
  const pos = XIANTIAN_POS_BY_VALUE[value]
  if (pos === undefined || pos < 0) {
    throw new Error(`[guaUtils] 未知卦 value=${value}`)
  }
  return pos
}

/** 由文王序取 Unicode 卦符字符 */
export function getUnicodeHexagram(wenwangOrder: number): string {
  return String.fromCodePoint(0x4dc0 + wenwangOrder - 1)
}
