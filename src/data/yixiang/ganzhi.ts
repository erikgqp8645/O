/**
 * 干支、纳音、时辰、十二月令
 */

/** 天干 */
export const HEAVENLY_STEMS: readonly string[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

/** 地支 */
export const EARTHLY_BRANCHES: readonly string[] = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'
]

/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水'

/** 天干五行 */
export const STEM_ELEMENT: Readonly<Record<string, WuXing>> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'
}

/** 地支五行 */
export const BRANCH_ELEMENT: Readonly<Record<string, WuXing>> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
}

/** 地支阴阳 */
export const BRANCH_YIN_YANG: Readonly<Record<string, '阳' | '阴'>> = {
  子: '阳', 丑: '阴', 寅: '阳', 卯: '阴', 辰: '阳', 巳: '阴',
  午: '阳', 未: '阴', 申: '阳', 酉: '阴', 戌: '阳', 亥: '阴'
}

/** 天干阴阳 */
export const STEM_YIN_YANG: Readonly<Record<string, '阳' | '阴'>> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴'
}

/**
 * 六十甲子纳音（每两干支共用一个纳音，共 30 组）
 *
 * 分组按六十甲子顺序两两相邻：甲子乙丑、丙寅丁卯、戊辰己巳……
 * 纳音名与纳音五行取《渊海子平》通行三十纳音。
 */
const NAYIN_GROUPS: readonly { pair: [string, string]; name: string; element: WuXing }[] = [
  { pair: ['甲子', '乙丑'], name: '海中金', element: '金' },
  { pair: ['丙寅', '丁卯'], name: '炉中火', element: '火' },
  { pair: ['戊辰', '己巳'], name: '大林木', element: '木' },
  { pair: ['庚午', '辛未'], name: '路旁土', element: '土' },
  { pair: ['壬申', '癸酉'], name: '剑锋金', element: '金' },
  { pair: ['甲戌', '乙亥'], name: '山头火', element: '火' },
  { pair: ['丙子', '丁丑'], name: '涧下水', element: '水' },
  { pair: ['戊寅', '己卯'], name: '城头土', element: '土' },
  { pair: ['庚辰', '辛巳'], name: '白蜡金', element: '金' },
  { pair: ['壬午', '癸未'], name: '杨柳木', element: '木' },
  { pair: ['甲申', '乙酉'], name: '泉中水', element: '水' },
  { pair: ['丙戌', '丁亥'], name: '屋上土', element: '土' },
  { pair: ['戊子', '己丑'], name: '霹雳火', element: '火' },
  { pair: ['庚寅', '辛卯'], name: '松柏木', element: '木' },
  { pair: ['壬辰', '癸巳'], name: '长流水', element: '水' },
  { pair: ['甲午', '乙未'], name: '沙中金', element: '金' },
  { pair: ['丙申', '丁酉'], name: '山下火', element: '火' },
  { pair: ['戊戌', '己亥'], name: '平地木', element: '木' },
  { pair: ['庚子', '辛丑'], name: '壁上土', element: '土' },
  { pair: ['壬寅', '癸卯'], name: '金箔金', element: '金' },
  { pair: ['甲辰', '乙巳'], name: '覆灯火', element: '火' },
  { pair: ['丙午', '丁未'], name: '天河水', element: '水' },
  { pair: ['戊申', '己酉'], name: '大驿土', element: '土' },
  { pair: ['庚戌', '辛亥'], name: '钗钏金', element: '金' },
  { pair: ['壬子', '癸丑'], name: '桑柘木', element: '木' },
  { pair: ['甲寅', '乙卯'], name: '大溪水', element: '水' },
  { pair: ['丙辰', '丁巳'], name: '沙中土', element: '土' },
  { pair: ['戊午', '己未'], name: '天上火', element: '火' },
  { pair: ['庚申', '辛酉'], name: '石榴木', element: '木' },
  { pair: ['壬戌', '癸亥'], name: '大海水', element: '水' }
]

export interface JiaZi {
  /** 干支两字 */
  name: string
  /** 天干 */
  gan: string
  /** 地支 */
  zhi: string
  /** 纳音（如"涧下水"） */
  nayin: string
  /** 纳音五行 */
  nayinElement: WuXing
  /** 序数 0-59 */
  index: number
}

/** 六十甲子表（自甲子起） */
export const JIA_ZI: readonly JiaZi[] = (() => {
  const out: JiaZi[] = []
  for (let i = 0; i < 60; i++) {
    const gan = HEAVENLY_STEMS[i % 10]!
    const zhi = EARTHLY_BRANCHES[i % 12]!
    const group = NAYIN_GROUPS[Math.floor(i / 2)]!
    out.push({
      name: gan + zhi,
      gan,
      zhi,
      nayin: group.name,
      nayinElement: group.element,
      index: i
    })
  }
  return out
})()

/** 干支 → 纳音 */
export const JIA_ZI_NAYIN: Readonly<Record<string, string>> = Object.freeze(
  JIA_ZI.reduce<Record<string, string>>((acc, j) => {
    acc[j.name] = j.nayin
    return acc
  }, {})
)

/** 十二时辰（双小时） */
export interface Shichen {
  /** 时辰名 */
  name: string
  /** 对应地支 */
  zhi: string
  /** 起讫小时（24 小时制） */
  startHour: number
  endHour: number
  /** 十二时辰图中的时段名 */
  label: string
}

/** 十二时辰表：子时 23:00-01:00 为跨日 */
export const SHICHEN: readonly Shichen[] = [
  { name: '子时', zhi: '子', startHour: 23, endHour: 1, label: '夜半' },
  { name: '丑时', zhi: '丑', startHour: 1, endHour: 3, label: '鸡鸣' },
  { name: '寅时', zhi: '寅', startHour: 3, endHour: 5, label: '平旦' },
  { name: '卯时', zhi: '卯', startHour: 5, endHour: 7, label: '日出' },
  { name: '辰时', zhi: '辰', startHour: 7, endHour: 9, label: '食时' },
  { name: '巳时', zhi: '巳', startHour: 9, endHour: 11, label: '隅中' },
  { name: '午时', zhi: '午', startHour: 11, endHour: 13, label: '日中' },
  { name: '未时', zhi: '未', startHour: 13, endHour: 15, label: '日昳' },
  { name: '申时', zhi: '申', startHour: 15, endHour: 17, label: '哺时' },
  { name: '酉时', zhi: '酉', startHour: 17, endHour: 19, label: '日入' },
  { name: '戌时', zhi: '戌', startHour: 19, endHour: 21, label: '黄昏' },
  { name: '亥时', zhi: '亥', startHour: 21, endHour: 23, label: '人定' }
]

/** 十二月令（以节气分界，含起始节气与月支） */
export interface MonthOrder {
  /** 月支 */
  zhi: string
  /** 起始节气 */
  startTerm: string
  /** 交节后的大数（"月建"） */
  monthName: string
}

/** 十二月建：正月建寅、二月建卯…… */
export const MONTH_ORDERS: readonly MonthOrder[] = [
  { zhi: '寅', startTerm: '立春', monthName: '正月' },
  { zhi: '卯', startTerm: '惊蛰', monthName: '二月' },
  { zhi: '辰', startTerm: '清明', monthName: '三月' },
  { zhi: '巳', startTerm: '立夏', monthName: '四月' },
  { zhi: '午', startTerm: '芒种', monthName: '五月' },
  { zhi: '未', startTerm: '小暑', monthName: '六月' },
  { zhi: '申', startTerm: '立秋', monthName: '七月' },
  { zhi: '酉', startTerm: '白露', monthName: '八月' },
  { zhi: '戌', startTerm: '寒露', monthName: '九月' },
  { zhi: '亥', startTerm: '立冬', monthName: '十月' },
  { zhi: '子', startTerm: '大雪', monthName: '十一月' },
  { zhi: '丑', startTerm: '小寒', monthName: '十二月' }
]

/** 十二长生（地支五行在五行的旺衰次序） */
export const TWELVE_LONGEVITY: readonly string[] = [
  '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'
]

/**
 * 十二长生起点：阳干顺行、阴干逆行。
 * 索引为地支 index（子=0…亥=11）。
 */
export const LONGEVITY_START: Readonly<Record<string, number>> = {
  甲: 11, 丙: 11, 戊: 11, 庚: 11, 壬: 11,
  乙: 6, 丁: 6, 己: 6, 辛: 6, 癸: 6
}

/** 某干在某支的长生状态 */
export function getChangSheng(gan: string, zhi: string): string {
  const start = LONGEVITY_START[gan]
  if (start === undefined) return ''
  const zhiIndex = EARTHLY_BRANCHES.indexOf(zhi)
  if (zhiIndex < 0) return ''
  const isYang = STEM_YIN_YANG[gan] === '阳'
  const offset = isYang
    ? (zhiIndex - start + 12) % 12
    : (start - zhiIndex + 12) % 12
  return TWELVE_LONGEVITY[offset]!
}
