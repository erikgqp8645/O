/**
 * 十二辟卦（十二消息卦）
 *
 * 【是什么】
 *   以十二卦配十二月、二十四节气，形象阐释一年寒暑消长：
 *   冬至「一阳来复」起，阳气渐长至乾卦六爻全阳（夏至前），
 *   夏至「一阴始生」起，阴气渐长至坤卦六爻全阴（大雪后），复归于一阳。
 *
 * 【序列与所辖节气】
 *   复、临、泰、大壮、夬、乾、姤、遁、否、观、剥、坤
 *   每个辟卦恰统摄两个节气（十二辟卦 × 2 = 二十四节气）：
 *     复＝冬至·小寒　临＝大寒·立春　泰＝雨水·惊蛰
 *     大壮＝春分·清明　夬＝谷雨·立夏　乾＝小满·芒种
 *     姤＝夏至·小暑　遁＝大暑·立秋　否＝处暑·白露
 *     观＝秋分·寒露　剥＝霜降·立冬　坤＝小雪·大雪
 *
 * 【阴阳形态】
 *   阳长六卦：复1阳→临2阳→泰3阳→大壮4阳→夬5阳→乾6阳
 *   阴长六卦：姤5阳→遁4阳→否3阳→观2阳→剥1阳→坤0阳
 *   爻象取自本项目六十四卦表（gua.ts）——同源，不另立一套编码。
 *
 * 【盘面对位】
 *   复卦位在冬至（正北）、大壮在春分（正东）、姤在夏至（正南）、
 *   观在秋分（正西），四正卦精确落在子卯午酉，与二十四节气环的二分二至重合。
 *   每格 30°，格心对准所辖的第一个节气，第二个节气落在格界上
 *   （故辟卦层与节气层呈「错半格」关系）。
 *
 * 【出处】
 *   《周易·系辞》「消息盈虚，与时消息」；汉代卦气说以十二月卦配月建；
 *   罗盘取法见《【易学】六十四卦方圆图解析》（太极之巅易学网）：
 *   「十二辟卦，也叫十二消息卦，主管一年十二月二十四节气。」
 */

import { XIANTIAN_64_GUA } from './gua'

export interface PiGuaItem {
  /** 卦名（复 / 临 / 泰 / 大壮 / 夬 / 乾 / 姤 / 遁 / 否 / 观 / 剥 / 坤） */
  name: string
  /** 环内序号 0-11（0 = 复，居正北冬至位） */
  index: number
  /** 阳爻数（1-6 / 5-0） */
  yangCount: number
  /** 所辖两个节气 */
  terms: readonly [string, string]
  /** 农历月 */
  month: string
  /** 所属季节（取所辖第二个节气的季节） */
  season: '春' | '夏' | '长夏' | '秋' | '冬'
  /** 对应六十四卦表的 value（用于取爻画） */
  guaValue: number
}

/** 按名称从六十四卦表取 value，保证与本项目爻画数据同源 */
function valueOf(name: string): number {
  const g = XIANTIAN_64_GUA.find((x) => x.name === name)
  if (!g) throw new Error(`十二辟卦数据缺卦：${name}`)
  return g.value
}

const RAW: readonly Omit<PiGuaItem, 'index' | 'guaValue'>[] = [
  { name: '复', yangCount: 1, terms: ['冬至', '小寒'], month: '十一月', season: '冬' },
  { name: '临', yangCount: 2, terms: ['大寒', '立春'], month: '十二月', season: '春' },
  { name: '泰', yangCount: 3, terms: ['雨水', '惊蛰'], month: '正月', season: '春' },
  { name: '大壮', yangCount: 4, terms: ['春分', '清明'], month: '二月', season: '春' },
  { name: '夬', yangCount: 5, terms: ['谷雨', '立夏'], month: '三月', season: '夏' },
  { name: '乾', yangCount: 6, terms: ['小满', '芒种'], month: '四月', season: '夏' },
  { name: '姤', yangCount: 5, terms: ['夏至', '小暑'], month: '五月', season: '长夏' },
  { name: '遁', yangCount: 4, terms: ['大暑', '立秋'], month: '六月', season: '秋' },
  { name: '否', yangCount: 3, terms: ['处暑', '白露'], month: '七月', season: '秋' },
  { name: '观', yangCount: 2, terms: ['秋分', '寒露'], month: '八月', season: '冬' },
  { name: '剥', yangCount: 1, terms: ['霜降', '立冬'], month: '九月', season: '冬' },
  { name: '坤', yangCount: 0, terms: ['小雪', '大雪'], month: '十月', season: '冬' }
]

/** 十二辟卦（自冬至起，顺时针） */
export const PI_GUA: readonly PiGuaItem[] = RAW.map((x, index) => ({
  ...x,
  index,
  guaValue: valueOf(x.name)
}))

/** 节气名 → 所属辟卦 */
export const PI_GUA_BY_TERM: Readonly<Record<string, PiGuaItem>> = Object.freeze(
  PI_GUA.reduce<Record<string, PiGuaItem>>((acc, p) => {
    for (const t of p.terms) acc[t] = p
    return acc
  }, {})
)
