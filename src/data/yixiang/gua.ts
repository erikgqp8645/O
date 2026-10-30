/**
 * 六十四卦基础数据
 *
 * 【六爻二进制 value】
 *   自下而上 bit0..bit5，阳爻=1、阴爻=0，value ∈ [0,63]。
 *   下卦(初/二/三爻)=bit0..bit2，上卦(四/五/上爻)=bit3..bit5。
 *   八经卦 bit 值：坤=0、震=1、坎=2、兑=3、艮=4、离=5、巽=6、乾=7（乾三爻皆阳=111=7，坤=000=0）。
 *   故 value = 下卦值 + 上卦值 × 8。
 *
 * 【先天圆图位次 pos】
 *   邵雍伏羲六十四卦圆图。圆图方位「上南见乾、下北见坤、左东右西」，
 *   以**时间**为序（圆图象天、方图象地），分左右两个半圆：
 *     左半（冬至→夏至，阳顺，天道左旋）：下卦卦主 震→离→兑→乾，
 *           每组内上卦依次 坤→艮→坎→巽→震→离→兑→乾；
 *     右半（夏至→冬至，阴逆，地道右旋）：下卦卦主 巽→坎→艮→坤，
 *           每组内上卦依次 乾→兑→离→震→巽→坎→艮→坤。
 *   圆周位次（pos 0 起，bearing 顺时针）：
 *     pos 0  = 地雷复（正北，冬至一阳生）
 *     pos 31 = 乾为天（正南）
 *     pos 32 = 天风姤（正南，夏至一阴生）
 *     pos 63 = 坤为地（正北）
 *   故复≡冬至、姤≡夏至，二者正对；乾南坤北亦正对（各偏半格）。
 *   左半 32 卦阳爻合计 112、阴爻 80，右半反之 —— 与经典圆图一致。
 *
 *   ⚠️ 圆图**不是**「相邻两卦变一爻」的次序（那是方图的性质）：
 *     圆图 64 条相邻边中只有 34 条恰好变一爻。别用「每卦一变」去反推圆图。
 *
 *   出处：悟行阁《先天六十四卦方圆图解析》、易象乾坤《伏羲先天六十四卦圆图规律》。
 *
 *   排布规则的**唯一实现**在 `@/utils/guaUtils`（站内先天六十四卦盘、卦关系页
 *   的先天圆图布局与本模块共用），本模块只负责卦名与爻象等数据。
 *
 * 【Unicode 卦符】
 *   U+4DC0..U+4DFF 按「文王卦序」排列（U+4DC0=䷀=乾=文王第1卦）。
 *   unicode = 0x4DC0 + 文王序 - 1。
 */

import { XIANTIAN_POS_BY_VALUE } from '@/utils/guaUtils'

/** 每卦圆心角步长（度） */
export const GUA_STEP = 360 / 64

/** 八经卦 bit 值 → 卦名（索引即三爻二进制值：bit0=初爻,bit2=三爻） */
export const BAGUA_BY_BITS: readonly string[] = ['坤', '震', '坎', '兑', '艮', '离', '巽', '乾']

/** 一卦元信息 */
export interface GuaMeta {
  /** 六爻二进制编码 0-63（bit0=初爻，bit5=上爻；阳=1 阴=0） */
  value: number
  /** 卦名 */
  name: string
  /** 文王卦序 1-64（用于映射 Unicode 卦符） */
  wenwangOrder: number
}

/** 按 value 索引的文王卦序映射 */
export const WENWANG_GUA_BY_VALUE: readonly GuaMeta[] = [
  { value: 0, name: '坤', wenwangOrder: 2 },
  { value: 1, name: '复', wenwangOrder: 24 },
  { value: 2, name: '师', wenwangOrder: 7 },
  { value: 3, name: '临', wenwangOrder: 19 },
  { value: 4, name: '谦', wenwangOrder: 15 },
  { value: 5, name: '明夷', wenwangOrder: 36 },
  { value: 6, name: '升', wenwangOrder: 46 },
  { value: 7, name: '泰', wenwangOrder: 11 },
  { value: 8, name: '豫', wenwangOrder: 16 },
  { value: 9, name: '震', wenwangOrder: 51 },
  { value: 10, name: '解', wenwangOrder: 40 },
  { value: 11, name: '归妹', wenwangOrder: 54 },
  { value: 12, name: '小过', wenwangOrder: 62 },
  { value: 13, name: '丰', wenwangOrder: 55 },
  { value: 14, name: '恒', wenwangOrder: 32 },
  { value: 15, name: '大壮', wenwangOrder: 34 },
  { value: 16, name: '比', wenwangOrder: 8 },
  { value: 17, name: '屯', wenwangOrder: 3 },
  { value: 18, name: '坎', wenwangOrder: 29 },
  { value: 19, name: '节', wenwangOrder: 60 },
  { value: 20, name: '蹇', wenwangOrder: 39 },
  { value: 21, name: '既济', wenwangOrder: 63 },
  { value: 22, name: '井', wenwangOrder: 48 },
  { value: 23, name: '需', wenwangOrder: 5 },
  { value: 24, name: '萃', wenwangOrder: 45 },
  { value: 25, name: '随', wenwangOrder: 17 },
  { value: 26, name: '困', wenwangOrder: 47 },
  { value: 27, name: '兑', wenwangOrder: 58 },
  { value: 28, name: '咸', wenwangOrder: 31 },
  { value: 29, name: '革', wenwangOrder: 49 },
  { value: 30, name: '大过', wenwangOrder: 28 },
  { value: 31, name: '夬', wenwangOrder: 43 },
  { value: 32, name: '剥', wenwangOrder: 23 },
  { value: 33, name: '颐', wenwangOrder: 27 },
  { value: 34, name: '蒙', wenwangOrder: 4 },
  { value: 35, name: '损', wenwangOrder: 41 },
  { value: 36, name: '艮', wenwangOrder: 52 },
  { value: 37, name: '贲', wenwangOrder: 22 },
  { value: 38, name: '蛊', wenwangOrder: 18 },
  { value: 39, name: '大畜', wenwangOrder: 26 },
  { value: 40, name: '晋', wenwangOrder: 35 },
  { value: 41, name: '噬嗑', wenwangOrder: 21 },
  { value: 42, name: '未济', wenwangOrder: 64 },
  { value: 43, name: '睽', wenwangOrder: 38 },
  { value: 44, name: '旅', wenwangOrder: 56 },
  { value: 45, name: '离', wenwangOrder: 30 },
  { value: 46, name: '鼎', wenwangOrder: 50 },
  { value: 47, name: '大有', wenwangOrder: 14 },
  { value: 48, name: '观', wenwangOrder: 20 },
  { value: 49, name: '益', wenwangOrder: 42 },
  { value: 50, name: '涣', wenwangOrder: 59 },
  { value: 51, name: '中孚', wenwangOrder: 61 },
  { value: 52, name: '渐', wenwangOrder: 53 },
  { value: 53, name: '家人', wenwangOrder: 37 },
  { value: 54, name: '巽', wenwangOrder: 57 },
  { value: 55, name: '小畜', wenwangOrder: 9 },
  { value: 56, name: '否', wenwangOrder: 12 },
  { value: 57, name: '无妄', wenwangOrder: 25 },
  { value: 58, name: '讼', wenwangOrder: 6 },
  { value: 59, name: '履', wenwangOrder: 10 },
  { value: 60, name: '遁', wenwangOrder: 33 },
  { value: 61, name: '同人', wenwangOrder: 13 },
  { value: 62, name: '姤', wenwangOrder: 44 },
  { value: 63, name: '乾', wenwangOrder: 1 }
]

/**
 * 伏羲六十四卦圆图的 64 卦次序（pos 0 起，bearing 顺时针）。
 *
 *   pos 0  = 地雷复（正北 · 冬至一阳生）
 *   pos 31 = 乾为天（正南）
 *   pos 32 = 天风姤（正南 · 夏至一阴生）
 *   pos 63 = 坤为地（正北）
 *
 * 位次由 `@/utils/guaUtils` 的**唯一权威排布规则**算出（站内先天六十四卦盘、
 * 卦关系页的先天圆图布局与本模块共用同一实现，避免两套口径再次漂移）。
 */
export const XIANTIAN_CIRCLE_ORDER: readonly string[] = (() => {
  const byPos = new Array<string>(64)
  for (const meta of WENWANG_GUA_BY_VALUE) {
    byPos[getXiantianPos(meta.value)] = meta.name
  }
  return byPos
})()

/**
 * 先天圆周位置（0-63）
 *
 * 由伏羲圆图的排布规则算出，不是位反转。
 * ⚠️ 早前版本用 6 位整体位反转（bitReverse6）定次序，会把左右两个半圆对调，
 *   导致「坤」与「乾」在圆周上相邻、「姤」紧贴「乾」——阴阳两极挤在一侧，
 *   与圆图「复≡冬至、姤≡夏至，二者正对」的结构完全不符。
 */
export function getXiantianPos(value: number): number {
  const pos = XIANTIAN_POS_BY_VALUE[value]
  if (pos === undefined || pos < 0) {
    throw new Error(`[gua] 未知卦 value=${value}`)
  }
  return pos
}

/** 六爻自下而上：true=阳爻，false=阴爻（下标0=初爻） */
export function getGuaLines(value: number): boolean[] {
  return [0, 1, 2, 3, 4, 5].map((i) => (value & (1 << i)) !== 0)
}

/** Unicode 卦符 */
export function getUnicodeHexagram(wenwangOrder: number): string {
  return String.fromCodePoint(0x4dc0 + wenwangOrder - 1)
}

/** 内卦（下卦）名 */
export function getInnerGuaName(value: number): string {
  return BAGUA_BY_BITS[value & 0b111]!
}

/** 外卦（上卦）名 */
export function getOuterGuaName(value: number): string {
  return BAGUA_BY_BITS[(value >> 3) & 0b111]!
}

/** 渲染就绪的一卦 */
export interface GuaItem extends GuaMeta {
  /** 先天圆周位置 0-63 */
  pos: number
  /** Unicode 卦符 */
  unicode: string
  /** 六爻自下而上 */
  lines: boolean[]
  /** 内卦名 / 外卦名 */
  inner: string
  outer: string
}

/** 全部六十四卦，按先天圆周位置升序 */
export const XIANTIAN_64_GUA: readonly GuaItem[] = WENWANG_GUA_BY_VALUE.map((meta) => ({
  ...meta,
  pos: getXiantianPos(meta.value),
  unicode: getUnicodeHexagram(meta.wenwangOrder),
  lines: getGuaLines(meta.value),
  inner: getInnerGuaName(meta.value),
  outer: getOuterGuaName(meta.value)
})).slice()
  .sort((a, b) => a.pos - b.pos)

/** 卦名 → value 反查表 */
export const NAME_TO_VALUE: Readonly<Record<string, number>> = Object.freeze(
  WENWANG_GUA_BY_VALUE.reduce<Record<string, number>>((acc, meta) => {
    acc[meta.name] = meta.value
    return acc
  }, {})
)

/* ═══════════════════════════════════════════════════════════════════
 *  京房八宫六十四卦（由变爻规则生成，不硬编码卦序）
 * ═══════════════════════════════════════════════════════════════════ */

export type Palace = '乾' | '坎' | '艮' | '震' | '巽' | '离' | '坤' | '兑'
export type ShiyingType = '本宫' | '一世' | '二世' | '三世' | '四世' | '五世' | '游魂' | '归魂'

export const SHIYING_ORDER: readonly ShiyingType[] = [
  '本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'
]

/** 各世位对应的世爻位（1=初爻,6=上爻） */
const SHI_YAO_BY_ORDER: readonly (1 | 2 | 3 | 4 | 5 | 6)[] = [6, 1, 2, 3, 4, 5, 4, 3]

export interface PalaceMeta {
  palace: Palace
  palaceIndex: number
  element: '金' | '木' | '水' | '火' | '土'
  /** 本宫卦 value（八纯卦） */
  baseValue: number
}

/** 八宫定义：传统顺序 乾坎艮震巽离坤兑 */
export const PALACES: readonly PalaceMeta[] = [
  { palace: '乾', palaceIndex: 0, element: '金', baseValue: 63 },
  { palace: '坎', palaceIndex: 1, element: '水', baseValue: 18 },
  { palace: '艮', palaceIndex: 2, element: '土', baseValue: 36 },
  { palace: '震', palaceIndex: 3, element: '木', baseValue: 9 },
  { palace: '巽', palaceIndex: 4, element: '木', baseValue: 54 },
  { palace: '离', palaceIndex: 5, element: '火', baseValue: 45 },
  { palace: '坤', palaceIndex: 6, element: '土', baseValue: 0 },
  { palace: '兑', palaceIndex: 7, element: '金', baseValue: 27 }
]

/**
 * 由本宫卦 value 生成宫内 8 卦的 value 序列（本宫→归魂）。
 * 本宫 v0；一世变初爻；二世再变二爻；三世再变三爻；
 * 四世再变四爻；五世再变五爻；游魂回变四爻；归魂内三爻全变。
 */
export function generatePalaceValues(baseValue: number): number[] {
  const v: number[] = [baseValue]
  v.push(v[0]! ^ (1 << 0))
  v.push(v[1]! ^ (1 << 1))
  v.push(v[2]! ^ (1 << 2))
  v.push(v[3]! ^ (1 << 3))
  v.push(v[4]! ^ (1 << 4))
  v.push(v[5]! ^ (1 << 3))
  v.push(v[6]! ^ 0b000111)
  return v
}

export interface JingFangGuaItem {
  /** 京房序 0-63 */
  jingFangOrder: number
  palace: Palace
  palaceIndex: number
  element: '金' | '木' | '水' | '火' | '土'
  shiyingType: ShiyingType
  /** 世爻位 1-6 */
  shiYao: 1 | 2 | 3 | 4 | 5 | 6
  /** 应爻位 1-6（世应相隔三爻） */
  yingYao: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  value: number
}

/** 世应相隔三爻 */
function computeYingYao(shiYao: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return (((shiYao - 1 + 3) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6
}

/** 京房八宫 64 卦（本宫→归魂，8 宫串联） */
export const JING_FANG_64_GUA: readonly JingFangGuaItem[] = PALACES.flatMap((meta) => {
  const values = generatePalaceValues(meta.baseValue)
  return values.map((value, orderInPalace) => {
    const shiYao = SHI_YAO_BY_ORDER[orderInPalace]!
    return {
      jingFangOrder: meta.palaceIndex * 8 + orderInPalace,
      palace: meta.palace,
      palaceIndex: meta.palaceIndex,
      element: meta.element,
      shiyingType: SHIYING_ORDER[orderInPalace]!,
      shiYao,
      yingYao: computeYingYao(shiYao),
      name: NAME_TO_VALUE && WENWANG_GUA_BY_VALUE[value]!.name,
      value
    }
  })
})

/* ═══════════════════════════════════════════════════════════════════
 *  京房卦气六十卦（六日七分法）
 *  64 卦剔除四正卦（坎震离兑）后余 60 卦，自冬至起顺时针铺满一回归年。
 *  60 卦 × 6 爻 = 360 爻位；365.25 日 / 360 ≈ 1.0146 日/爻。
 *  出处：《易纬·稽览图》《汉书·京房传》。
 * ═══════════════════════════════════════════════════════════════════ */

export const JING_FANG_SIXTY_ORDER: readonly string[] = [
  '中孚', '复', '屯', '谦', '睽', '升', '临', '小过', '蒙', '益',
  '渐', '泰', '需', '随', '晋', '解', '大壮', '豫', '讼', '蛊',
  '革', '夬', '旅', '师', '比', '小畜', '乾', '大有', '家人', '井',
  '咸', '姤', '鼎', '丰', '涣', '履', '遁', '恒', '节', '同人',
  '损', '否', '巽', '萃', '大畜', '贲', '观', '归妹', '无妄', '明夷',
  '困', '剥', '艮', '既济', '噬嗑', '大过', '坤', '未济', '蹇', '颐'
]

export interface JingFangSixtyItem {
  /** 京房卦气序 0-59（0=中孚，冬至起卦） */
  index: number
  name: string
  value: number
  lines: boolean[]
  innerGua: string
  outerGua: string
}

/** 京房卦气 60 卦渲染就绪数据 */
export const JING_FANG_SIXTY_GUA: readonly JingFangSixtyItem[] = JING_FANG_SIXTY_ORDER.map(
  (name, index) => {
    const value = NAME_TO_VALUE[name]
    if (value === undefined) {
      throw new Error(`[gua] 未找到卦「${name}」的二进制 value —— 数据源不一致`)
    }
    return {
      index,
      name,
      value,
      lines: getGuaLines(value),
      innerGua: getInnerGuaName(value),
      outerGua: getOuterGuaName(value)
    }
  }
)

/** 京房六十卦每卦切向宽度（度） */
export const JING_FANG_SIXTY_STEP = 360 / 60
