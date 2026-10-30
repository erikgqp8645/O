/**
 * 易象罗盘 —— 时间引擎自检
 *
 * 移植自 yixiang-luopan/scripts/verify-time.ts（原 12 组断言）。
 * 断言条目、数据与边界时刻与源脚本逐条一致；源脚本的自定义
 * check(label, actual, expected) 帮助函数统一改写为
 * Vitest 的 expect(actual, label).toBe(expected)。
 *
 * 排盘口径（与源脚本一致）：
 *   年柱 —— 立春交节时刻为界；月柱 —— 十二节令交节时刻为界；
 *   日柱 —— 子正换日（0 点）；时柱 —— 五鼠遁自算，晚子时归当日。
 */
import { Solar, Lunar, LunarUtil, EightChar } from 'lunar-typescript'
import { describe, expect, it } from 'vitest'

import { TWELVE_MONTH_TERMS } from '@/data/yixiang/solarTerms'
import { JIA_ZI } from '@/data/yixiang/ganzhi'
import { XIANTIAN_64_GUA, JING_FANG_64_GUA, BAGUA_BY_BITS } from '@/data/yixiang/gua'
import {
  buildSnapshot,
  computeJingFangPosition,
  locateTerm,
  solarTermMoment,
  solarTermTable,
  winterSolsticeOf,
} from '@/utils/yixiang/timeEngine'

/** Date → 'YYYY-MM-DD HH:mm:ss' */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

describe('1. 节气交节时刻（北京时，中国标准时间）', () => {
  // 权威节气时刻（紫金山天文台公布值）
  const termCases: { name: string; expected: string }[] = [
    { name: '立春', expected: '2024-02-04 16:27:07' },
    { name: '立春', expected: '2025-02-03 22:10:28' },
    { name: '立春', expected: '2026-02-04 04:02:08' },
    { name: '夏至', expected: '2024-06-21 04:51:00' },
    { name: '冬至', expected: '2024-12-21 17:20:35' },
    { name: '冬至', expected: '2025-12-21 23:03:05' },
  ]
  for (const { name, expected } of termCases) {
    it(`${name} ${expected.slice(0, 10)}`, () => {
      const year = Number(expected.slice(0, 4))
      const s = solarTermMoment(year, name)
      expect(s ? fmt(s) : 'none', `${name} ${expected.slice(0, 10)}`).toBe(expected)
    })
  }
})

describe('2. 干支四柱', () => {
  it('2000-01-01 日柱', () => {
    expect(buildSnapshot(new Date(2000, 0, 1, 12, 0, 0)).dayGanzhi, '2000-01-01 日柱').toBe('戊午')
  })
  // 立春交节时刻为界：2024 立春 = 2024-02-04 16:27:07
  it('2024-02-04 16:26 年柱(立春前)', () => {
    expect(
      buildSnapshot(new Date(2024, 1, 4, 16, 26, 0)).yearGanzhi,
      '2024-02-04 16:26 年柱(立春前)',
    ).toBe('癸卯')
  })
  it('2024-02-04 16:28 年柱(立春后)', () => {
    expect(
      buildSnapshot(new Date(2024, 1, 4, 16, 28, 0)).yearGanzhi,
      '2024-02-04 16:28 年柱(立春后)',
    ).toBe('甲辰')
  })
  it('2024-01-20 年柱(立春前)', () => {
    expect(
      buildSnapshot(new Date(2024, 0, 20, 12, 0, 0)).yearGanzhi,
      '2024-01-20 年柱(立春前)',
    ).toBe('癸卯')
  })
  // 子正换日 + 晚子时归当日：2026-10-29 丙子，10-30 丁丑
  it('2026-10-29 23:30 日柱(晚子时仍属当日)', () => {
    expect(
      buildSnapshot(new Date(2026, 9, 29, 23, 30, 0)).dayGanzhi,
      '2026-10-29 23:30 日柱(晚子时仍属当日)',
    ).toBe('丙子')
  })
  it('2026-10-29 23:30 时柱(戊子)', () => {
    expect(
      buildSnapshot(new Date(2026, 9, 29, 23, 30, 0)).hourGanzhi,
      '2026-10-29 23:30 时柱(戊子)',
    ).toBe('戊子')
  })
  it('2026-10-30 00:30 日柱(次日)', () => {
    expect(
      buildSnapshot(new Date(2026, 9, 30, 0, 30, 0)).dayGanzhi,
      '2026-10-30 00:30 日柱(次日)',
    ).toBe('丁丑')
  })
  it('2026-10-30 00:30 时柱(庚子)', () => {
    expect(
      buildSnapshot(new Date(2026, 9, 30, 0, 30, 0)).hourGanzhi,
      '2026-10-30 00:30 时柱(庚子)',
    ).toBe('庚子')
  })
})

describe('3. 京房六日七分', () => {
  const winter2024 = winterSolsticeOf(2024)
  // 日行一爻，闰余累积：每爻实长 365.2422/360 ≈ 1.01456 日
  const DAY = 86400000
  const posAt = (d: number) => computeJingFangPosition(new Date(winter2024.getTime() + d * DAY))

  it('冬至当日位次 = 0（中孚初爻）', () => {
    expect(computeJingFangPosition(winter2024), '冬至当日位次 = 0（中孚初爻）').toBe(0)
  })
  it('冬至后 1 日 → 位次 0（未满一爻）', () => {
    expect(posAt(1), '冬至后 1 日 → 位次 0（未满一爻）').toBe(0)
  })
  it('冬至后 2 日 → 位次 1', () => {
    expect(posAt(2), '冬至后 2 日 → 位次 1').toBe(1)
  })
  it('冬至后 100 日 → 位次 98', () => {
    expect(posAt(100), '冬至后 100 日 → 位次 98').toBe(Math.floor(100 * (360 / 365.2422)))
  })
  it('冬至后 365 日 → 位次 359', () => {
    expect(posAt(365), '冬至后 365 日 → 位次 359').toBe(Math.floor(365 * (360 / 365.2422)))
  })
})

describe('4. 月相表', () => {
  it('YUE_XIANG 长度 = 31', () => {
    expect(LunarUtil.YUE_XIANG.length, 'YUE_XIANG 长度 = 31').toBe(31)
  })
  it('索引 15 = 望', () => {
    expect(LunarUtil.YUE_XIANG[15], '索引 15 = 望').toBe('望')
  })
  it('索引 30 = 晦', () => {
    expect(LunarUtil.YUE_XIANG[30], '索引 30 = 晦').toBe('晦')
  })
})

describe('5. 快照与农历', () => {
  // 2026-10-29 20:30 与 EightChar 交叉验证
  const ec2026 = EightChar.fromLunar(Lunar.fromDate(new Date(2026, 9, 29, 20, 30, 0)))
  const snap = buildSnapshot(new Date(2026, 9, 29, 20, 30, 0))

  it('快照日柱 == EightChar 日柱', () => {
    expect(snap.dayGanzhi, '快照日柱 == EightChar 日柱').toBe(ec2026.getDay())
  })
  it('快照时柱 == EightChar 时柱', () => {
    expect(snap.hourGanzhi, '快照时柱 == EightChar 时柱').toBe(ec2026.getTime())
  })
  it('快照年柱 == EightChar 年柱', () => {
    expect(snap.yearGanzhi, '快照年柱 == EightChar 年柱').toBe(ec2026.getYear())
  })
  it('快照月柱 == EightChar 月柱', () => {
    expect(snap.monthGanzhi, '快照月柱 == EightChar 月柱').toBe(ec2026.getMonth())
  })
})

describe('6. 时间连续性（每分钟推进一格）', () => {
  it('京房位次逐日连续', () => {
    let prev = buildSnapshot(new Date(2026, 9, 29, 0, 0, 0))
    let monotonic = true
    const jumps: string[] = []
    for (let i = 1; i <= 1440; i++) {
      const s = buildSnapshot(new Date(2026, 9, 29, 0, i, 0))
      const diff = Math.abs(s.jingFangPosition - prev.jingFangPosition)
      if (s.jingFangPosition !== prev.jingFangPosition && diff !== 1 && diff !== 359) {
        monotonic = false
        jumps.push(`${i}分：${prev.jingFangPosition} → ${s.jingFangPosition}`)
      }
      prev = s
    }
    expect(monotonic, `跳变：${jumps.join('; ')}`).toBe(true)
  })
})

describe('7. 交节边界（交节前后各一分钟）', () => {
  // lunar.getPrevJieQi() 在「当日但未到交节时刻」会返回尚未到来的节气，
  // 本项目自行按时刻定位，这里逐一核对边界两侧的节气归属。
  // 交节时刻来自 lunar 的天文计算（秒级），断言取 ±1 分钟。
  const boundaryCases: { at: string; expected: string }[] = [
    { at: '2027-01-05 22:09', expected: '冬至' },
    { at: '2027-01-05 22:10', expected: '小寒' },
    { at: '2026-12-22 04:50', expected: '大雪' },
    { at: '2026-12-22 04:51', expected: '冬至' },
    { at: '2024-02-04 16:27', expected: '大寒' },
    { at: '2024-02-04 16:28', expected: '立春' },
    { at: '2026-10-23 17:37', expected: '寒露' },
    { at: '2026-10-23 17:38', expected: '霜降' },
  ]
  for (const { at, expected } of boundaryCases) {
    it(`${at} → ${expected}`, () => {
      const d = new Date(at.replace(' ', 'T'))
      const s = buildSnapshot(d)
      expect(s.jieQi, `${at} → ${expected}`).toBe(expected)
    })
  }
})

describe('8. 跨年月份归属', () => {
  // 2026 = 丙午年，五虎遁：寅月起庚寅 → 子月 庚子、丑月 辛丑
  // 小寒 2027 交于 01-05 22:09:58，故当日 12:00 仍属子月
  it('2026-12-31 月柱(子月)', () => {
    expect(
      buildSnapshot(new Date(2026, 11, 31, 12, 0, 0)).monthGanzhi,
      '2026-12-31 月柱(子月)',
    ).toBe('庚子')
  })
  it('2027-01-01 月柱(子月)', () => {
    expect(buildSnapshot(new Date(2027, 0, 1, 12, 0, 0)).monthGanzhi, '2027-01-01 月柱(子月)').toBe(
      '庚子',
    )
  })
  it('2027-01-05 12:00 月柱(小寒未交)', () => {
    expect(
      buildSnapshot(new Date(2027, 0, 5, 12, 0, 0)).monthGanzhi,
      '2027-01-05 12:00 月柱(小寒未交)',
    ).toBe('庚子')
  })
  it('2027-01-05 23:00 月柱(小寒已交)', () => {
    expect(
      buildSnapshot(new Date(2027, 0, 5, 23, 0, 0)).monthGanzhi,
      '2027-01-05 23:00 月柱(小寒已交)',
    ).toBe('辛丑')
  })
  it('2027-01-06 月柱(丑月)', () => {
    expect(buildSnapshot(new Date(2027, 0, 6, 12, 0, 0)).monthGanzhi, '2027-01-06 月柱(丑月)').toBe(
      '辛丑',
    )
  })
})

describe('9. 节气表结构完整性（名序假设自检）', () => {
  const table2026 = solarTermTable(2026)

  it('表长度 = 31', () => {
    expect(table2026.length, '表长度 = 31').toBe(31)
  })
  it('首项 = 大雪(上一年)', () => {
    expect(table2026[0]!.name, '首项 = 大雪(上一年)').toBe('大雪')
  })
  it('首项时刻在上一年 12 月', () => {
    expect(table2026[0]!.moment.getFullYear(), '首项时刻在上一年 12 月').toBe(2025)
  })
  it('次项 = 冬至(上一年)', () => {
    expect(table2026[1]!.name, '次项 = 冬至(上一年)').toBe('冬至')
  })
  it('末项 = 惊蛰(次年)', () => {
    expect(table2026[table2026.length - 1]!.name, '末项 = 惊蛰(次年)').toBe('惊蛰')
  })
  it('末项时刻在次年', () => {
    expect(table2026[table2026.length - 1]!.moment.getFullYear(), '末项时刻在次年').toBe(2027)
  })
  // 表中时刻必须严格递增
  it('表内时刻严格递增', () => {
    expect(
      table2026.every((e, i) => i === 0 || e.moment.getTime() > table2026[i - 1]!.moment.getTime()),
      '表内时刻严格递增',
    ).toBe(true)
  })
  // 相邻节气间隔：太阳黄经每 15° 对应约 15.22 日，
  // 但地球公转速度随近日点/远日点变化，实测范围约 14.72~15.73 日
  it('相邻节气间隔均在 14.6~15.8 日', () => {
    const gaps = table2026
      .slice(1)
      .map((e, i) => (e.moment.getTime() - table2026[i]!.moment.getTime()) / 86400000)
    expect(
      gaps.every((g) => g > 14.6 && g < 15.8),
      `间隔区间 ${Math.min(...gaps).toFixed(3)} ~ ${Math.max(...gaps).toFixed(3)} 日`,
    ).toBe(true)
  })

  // 24 个节气名，每个在本年都恰有一条
  const TERM_NAMES = [
    '立春',
    '雨水',
    '惊蛰',
    '春分',
    '清明',
    '谷雨',
    '立夏',
    '小满',
    '芒种',
    '夏至',
    '小暑',
    '大暑',
    '立秋',
    '处暑',
    '白露',
    '秋分',
    '寒露',
    '霜降',
    '立冬',
    '小雪',
    '大雪',
    '冬至',
    '小寒',
    '大寒',
  ]
  for (const y of [2024, 2025, 2026, 2027]) {
    it(`${y} 年 24 节气时刻齐全`, () => {
      const missing = TERM_NAMES.filter((n) => !solarTermMoment(y, n))
      expect(missing.length === 0 ? '齐全' : missing.join(','), `${y} 年 24 节气时刻齐全`).toBe(
        '齐全',
      )
    })
  }

  // 交节前后定位必须与「本年节气表」自洽
  it('2027-01-05 10:32 定位 = 冬至', () => {
    const loc = locateTerm(new Date(2027, 0, 5, 10, 32, 0))
    expect(loc.name, '2027-01-05 10:32 定位 = 冬至').toBe('冬至')
  })
  it('其下一节气 = 小寒', () => {
    const loc = locateTerm(new Date(2027, 0, 5, 10, 32, 0))
    expect(loc.nextName, '其下一节气 = 小寒').toBe('小寒')
  })
  it('下一节气时刻 = 小寒本年交节', () => {
    const loc = locateTerm(new Date(2027, 0, 5, 10, 32, 0))
    expect(fmt(loc.nextMoment), '下一节气时刻 = 小寒本年交节').toBe(
      fmt(solarTermMoment(2027, '小寒')!),
    )
  })
})

describe('10. 干支月柱独立交叉校验（五虎遁 + 十二节令）', () => {
  /**
   * 独立于 lunar 的年柱 / 月柱推算，用于交叉校验：
   *   年柱 —— 以立春为界的公历年序 (y-1984) mod 60
   *   月柱 —— 十二节令定月支（立春→寅 … 小寒→丑），
   *           月干用五虎遁：月干序 = (年干序×2 + 月支序 + 2) mod 10
   */
  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const JIE_ZHI = new Map(TWELVE_MONTH_TERMS.map((t, i) => [t.term, { zhi: t.zhi, idx: i }]))

  function yearGanzhiIndependent(date: Date): string {
    const liChun = solarTermMoment(date.getFullYear(), '立春')!
    const y = date.getTime() >= liChun.getTime() ? date.getFullYear() : date.getFullYear() - 1
    const idx = (((y - 1984) % 60) + 60) % 60
    return GAN[idx % 10]! + ZHI[idx % 12]!
  }

  function monthGanzhiIndependent(date: Date): string {
    const yi = yearGanzhiIndependent(date)
    const ganIdx = GAN.indexOf(yi.slice(0, 1))
    // 取不晚于 date 的最后一个节令
    let branchIdx = 11
    for (const e of solarTermTable(date.getFullYear())) {
      const info = JIE_ZHI.get(e.name)
      if (!info) continue
      if (e.moment.getTime() <= date.getTime()) branchIdx = info.idx
    }
    const zhi = JIE_ZHI.get([...JIE_ZHI.keys()][branchIdx]!)!.zhi
    const gan = GAN[(ganIdx * 2 + branchIdx + 2) % 10]!
    return gan + zhi
  }

  // ① 12 个节令边界前后各一分钟，月柱必须恰好切换
  it('12 节令边界前后月柱均正确切换', () => {
    let boundaryOk = true
    const bad: string[] = []
    for (const y of [2026, 2027]) {
      for (const e of solarTermTable(y)) {
        if (!JIE_ZHI.has(e.name)) continue
        const before = buildSnapshot(new Date(e.moment.getTime() - 60_000)).monthGanzhi
        const after = buildSnapshot(new Date(e.moment.getTime() + 60_000)).monthGanzhi
        const expBefore = monthGanzhiIndependent(new Date(e.moment.getTime() - 60_000))
        const expAfter = monthGanzhiIndependent(new Date(e.moment.getTime() + 60_000))
        if (before !== expBefore || after !== expAfter || before === after) {
          boundaryOk = false
          bad.push(
            `✗ ${y} ${e.name} ${e.moment.toLocaleString('zh-CN')}：前 ${before}/${expBefore} 后 ${after}/${expAfter}`,
          )
        }
      }
    }
    expect(boundaryOk, `节令边界月柱不符：${bad.join(' | ')}`).toBe(true)
  })

  // ② 全年逐 6 小时抽样，年柱 / 月柱 / 时柱均须与独立推算一致
  it('全年 1464 次抽样年柱/月柱全对', () => {
    let sampleBad = 0
    let firstBad = ''
    for (let h = 0; h < 366 * 4; h++) {
      const d = new Date(2026, 0, 1, 0, 0, 0)
      d.setHours(d.getHours() + h * 6)
      const s = buildSnapshot(d)
      if (
        s.yearGanzhi !== yearGanzhiIndependent(d) ||
        s.monthGanzhi !== monthGanzhiIndependent(d)
      ) {
        sampleBad++
        if (!firstBad) {
          firstBad = `${d.toLocaleString('zh-CN')} 实=${s.yearGanzhi}/${s.monthGanzhi} 算=${yearGanzhiIndependent(d)}/${monthGanzhiIndependent(d)}`
        }
      }
    }
    expect(sampleBad, `${sampleBad} 处不符 (${firstBad})`).toBe(0)
  })

  it('全年 1464 次抽样时柱全对', () => {
    let hourBad = 0
    for (let h = 0; h < 366 * 4; h++) {
      const d = new Date(2026, 0, 1, 0, 0, 0)
      d.setHours(d.getHours() + h * 6)
      const s = buildSnapshot(d)
      // 时柱独立校验：五鼠遁 = (日干序×2 + 时支序) mod 10
      const expHour =
        GAN[(GAN.indexOf(s.dayGanzhi[0]!) * 2 + ZHI.indexOf(s.shichenZhi)) % 10]! + s.shichenZhi
      if (s.hourGanzhi !== expHour) hourBad++
    }
    expect(hourBad, `${hourBad} 处不符`).toBe(0)
  })

  // ③ 纳音必须与 lunar 的日柱纳音一致（纳音取自本项目六十甲子表）
  it('日柱纳音与 lunar 一致', () => {
    const nayinCheck = buildSnapshot(new Date(2026, 9, 29, 20, 30, 0))
    expect(nayinCheck.nayin.day, '日柱纳音与 lunar 一致').toBe(
      Solar.fromDate(new Date(2026, 9, 29, 20, 30, 0))
        .getLunar()
        .getDayNaYin(),
    )
  })
})

describe('11. 六十甲子纳音全表交叉校验', () => {
  it('60 组纳音与 lunar 完全一致', () => {
    let nayinBad = 0
    const nayinDiff: string[] = []
    for (const j of JIA_ZI) {
      const lunarNayin = (LunarUtil.NAYIN as Record<string, string>)[j.name] ?? ''
      if (j.nayin !== lunarNayin) {
        nayinBad++
        if (nayinDiff.length < 5) nayinDiff.push(`${j.name}(本项目=${j.nayin}/lunar=${lunarNayin})`)
      }
    }
    expect(nayinBad, `${nayinBad} 处不符 ${nayinDiff.join(', ')}`).toBe(0)
  })

  // 纳音五行与纳音名须自洽（如"涧下水"属水）
  it('纳音五行与纳音名自洽', () => {
    const elementOfName: Record<string, string> = {
      水: '水',
      火: '火',
      木: '木',
      金: '金',
      土: '土',
    }
    expect(
      JIA_ZI.every((j) => elementOfName[j.nayin.slice(-1)] === j.nayinElement),
      '纳音五行与纳音名自洽',
    ).toBe(true)
  })
})

describe('12. 六十四卦爻画数据自检（卦符爻线的依据）', () => {
  // 卦画面的爻象基准（自初爻到上爻，1=阳爻、0=阴爻）：
  //   卦的六爻 = 下卦三爻 + 上卦三爻，
  //   经卦爻象（自下而上）：乾111 兑110 离101 震100 巽011 坎010 艮001 坤000
  //   乾=下乾上乾、坤=下坤上坤、泰=下乾上坤、否=下坤上乾、
  //   既济=下离上坎、未济=下坎上离、屯=下震上坎、大有=下乾上离、
  //   家人=下离上巽、履=下兑上乾、噬嗑=下震上离、节=下兑上坎
  const yaoCases: [string, string][] = [
    ['乾', '111111'],
    ['坤', '000000'],
    ['泰', '111000'],
    ['否', '000111'],
    ['既济', '101010'],
    ['未济', '010101'],
    ['屯', '100010'],
    ['大有', '111101'],
    ['家人', '101011'],
    ['履', '110111'],
    ['噬嗑', '100101'],
    ['节', '110010'],
  ]
  for (const [name, expected] of yaoCases) {
    it(`${name} 爻象 ${expected}`, () => {
      const g = XIANTIAN_64_GUA.find((x) => x.name === name)
      const actual = g ? g.lines.map((l) => (l ? '1' : '0')).join('') : 'N/A'
      expect(actual, `${name} 爻象 ${expected}`).toBe(expected)
    })
  }

  it('六十四卦 value 无重复', () => {
    expect(new Set(XIANTIAN_64_GUA.map((g) => g.value)).size, '六十四卦 value 无重复').toBe(64)
  })

  it('六十四卦覆盖 0-63', () => {
    expect(
      XIANTIAN_64_GUA.map((g) => g.value)
        .sort((a, b) => a - b)
        .join(',') === Array.from({ length: 64 }, (_, i) => i).join(','),
      '六十四卦覆盖 0-63',
    ).toBe(true)
  })

  // 下卦/上卦名须与爻位一致（乾7 坤0 震1 坎2 兑3 艮4 离5 巽6）
  // 三爻二进制值 = bit0 + 2×bit1 + 4×bit2（bit0 = 初爻）
  const bit = (v: number, i: number) => (v >> i) & 1
  const trigramValue = (v: number, base: number): number =>
    bit(v, base) | (bit(v, base + 1) << 1) | (bit(v, base + 2) << 2)

  it('每卦上下卦名与爻位自洽', () => {
    expect(
      XIANTIAN_64_GUA.every(
        (g) =>
          g.inner === BAGUA_BY_BITS[trigramValue(g.value, 0)] &&
          g.outer === BAGUA_BY_BITS[trigramValue(g.value, 3)],
      ),
      '每卦上下卦名与爻位自洽',
    ).toBe(true)
  })

  // 通行本文王卦序（用于 Unicode 卦符映射），独立于数据表自检
  const WENWANG_ORDER_NAMES = [
    '乾',
    '坤',
    '屯',
    '蒙',
    '需',
    '讼',
    '师',
    '比',
    '小畜',
    '履',
    '泰',
    '否',
    '同人',
    '大有',
    '谦',
    '豫',
    '随',
    '蛊',
    '临',
    '观',
    '噬嗑',
    '贲',
    '剥',
    '复',
    '无妄',
    '大畜',
    '颐',
    '大过',
    '坎',
    '离',
    '咸',
    '恒',
    '遁',
    '大壮',
    '晋',
    '明夷',
    '家人',
    '睽',
    '蹇',
    '解',
    '损',
    '益',
    '夬',
    '姤',
    '萃',
    '升',
    '困',
    '井',
    '革',
    '鼎',
    '震',
    '艮',
    '渐',
    '归妹',
    '丰',
    '旅',
    '巽',
    '兑',
    '涣',
    '节',
    '中孚',
    '小过',
    '既济',
    '未济',
  ]

  it('六十四卦文王卦序与通行本一致', () => {
    const orderBad = WENWANG_ORDER_NAMES.filter(
      (n, i) => XIANTIAN_64_GUA.find((g) => g.name === n)?.wenwangOrder !== i + 1,
    )
    expect(
      orderBad.length === 0 ? '一致' : orderBad.join(','),
      '六十四卦文王卦序与通行本一致',
    ).toBe('一致')
  })

  // 先天圆图「爻变生成序」：value 0-63 每 8 卦一组，组内下卦逐位递变
  const XIANTIAN_GROUPS: string[][] = [
    ['坤', '复', '师', '临', '谦', '明夷', '升', '泰'],
    ['豫', '震', '解', '归妹', '小过', '丰', '恒', '大壮'],
    ['比', '屯', '坎', '节', '蹇', '既济', '井', '需'],
    ['萃', '随', '困', '兑', '咸', '革', '大过', '夬'],
    ['剥', '颐', '蒙', '损', '艮', '贲', '蛊', '大畜'],
    ['晋', '噬嗑', '未济', '睽', '旅', '离', '鼎', '大有'],
    ['观', '益', '涣', '中孚', '渐', '家人', '巽', '小畜'],
    ['否', '无妄', '讼', '履', '遁', '同人', '姤', '乾'],
  ]

  it('先天圆图 value 序（8 组 × 8 卦）与经典生成序一致', () => {
    const byValue = [...XIANTIAN_64_GUA].sort((a, b) => a.value - b.value)
    const groupBad: string[] = []
    for (let g = 0; g < 8; g++) {
      for (let k = 0; k < 8; k++) {
        const actual = byValue[g * 8 + k]!.name
        const expected = XIANTIAN_GROUPS[g]![k]!
        if (actual !== expected) groupBad.push(`value=${g * 8 + k} 实=${actual} 期=${expected}`)
      }
    }
    expect(
      groupBad.length === 0 ? '一致' : groupBad.join('; '),
      '先天圆图 value 序（8 组 × 8 卦）与经典生成序一致',
    ).toBe('一致')
  })

  it('京房六十四卦 value 无重复', () => {
    expect(new Set(JING_FANG_64_GUA.map((g) => g.value)).size, '京房六十四卦 value 无重复').toBe(64)
  })
})
