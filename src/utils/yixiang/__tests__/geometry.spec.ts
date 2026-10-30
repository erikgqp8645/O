/**
 * 易象罗盘 —— 极坐标几何自检
 *
 * 覆盖环层排布用到的两个函数：
 *   cellAngles()     —— 环上一格的起止角与中心角（支持顺/逆时针排布）
 *   ringSectorPath() —— 环形扇形路径（起止角允许逆序传入）
 *
 * 角度制：SVG 空间，0° 正右（东），90° 正下（南），角度顺时针增加。
 *
 * 【cellAngles 的角度约定】
 *   a0  = startAngle + dir × index × step
 *   a1  = startAngle + dir × (index + 1) × step
 *   mid = normalizeAngle(startAngle + dir × (index + 0.5) × step)
 *
 *   a0 / a1 刻意「不」归一到 [0, 360)：相邻两格的起止角必须相接，
 *   否则最后一格会因 360°→0° 归一而变成 345° 的大扇形，把整环涂掉；
 *   跨 0° 的格因此保留 370°、400° 这类原始值。
 *   mid 则归一到 [0, 360)，供 textTransform 判断上/下半盘。
 */
import { describe, expect, it } from 'vitest'

import { cellAngles, normalizeAngle, ringSectorPath } from '@/utils/yixiang/geometry'

/** 角度差归一到 [0, 360) */
function diff(a: number, b: number): number {
  return (((a - b) % 360) + 360) % 360
}

/** 顺/逆时针共用的取样参数 */
const RING_CASES: { start: number; step: number }[] = [
  { start: 0, step: 30 },
  { start: 90, step: 45 },
  { start: 340, step: 30 },
  { start: 270, step: 15 },
]

describe('cellAngles（顺时针，dir = 1）', () => {
  it('起始格：a0 = 起始角，a1 = 起始角 + 张角，mid 取中点', () => {
    const { a0, a1, mid } = cellAngles(0, 30, 0, 1)
    expect(a0, 'a0').toBe(0)
    expect(a1, 'a1').toBe(30)
    expect(mid, 'mid').toBe(15)
  })

  it('跨 0° 的格：起止角保留原始值，mid 归一到 [0, 360)', () => {
    // 340 + 1×30 = 370；340 + 2×30 = 400；340 + 1.5×30 = 385 → 归一 25
    const { a0, a1, mid } = cellAngles(340, 30, 1, 1)
    expect(a0, 'a0 保持原始值').toBe(370)
    expect(a1, 'a1 保持原始值').toBe(400)
    expect(mid, 'mid 归一到 [0, 360)').toBe(25)
    expect(normalizeAngle(a0), 'a0 归一后').toBe(10)
    expect(normalizeAngle(a1), 'a1 归一后').toBe(40)
  })

  it('中间格：a0 / a1 / mid 按序号线性递进', () => {
    const { a0, a1, mid } = cellAngles(90, 45, 3, 1)
    expect(a0, 'a0').toBe(225)
    expect(a1, 'a1').toBe(270)
    expect(mid, 'mid').toBe(247.5)
  })

  it('任意格：张角恒等于 step，mid 居中', () => {
    for (const { start, step } of RING_CASES) {
      for (let index = 0; index < 24; index++) {
        const { a0, a1, mid } = cellAngles(start, step, index, 1)
        expect(diff(a1, a0), `${start}/${step}/${index} 张角`).toBeCloseTo(step, 10)
        expect(diff(mid, a0), `${start}/${step}/${index} 半张角`).toBeCloseTo(step / 2, 10)
      }
    }
  })
})

describe('cellAngles（逆时针，dir = -1）', () => {
  it('起始格：角度沿逆时针递减', () => {
    const { a0, a1, mid } = cellAngles(0, 30, 0, -1)
    expect(a0, 'a0').toBe(0)
    expect(a1, 'a1').toBe(-30)
    expect(mid, 'mid 归一到 [0, 360)').toBe(345)
    expect(a1, 'a1 应小于 a0').toBeLessThan(a0)
  })

  it('跨 0° 的格：起止角越过 0° 变为负角，mid 归一到 [0, 360)', () => {
    // 10 - 1×30 = -20；10 - 2×30 = -50；10 - 1.5×30 = -35 → 归一 325
    const { a0, a1, mid } = cellAngles(10, 30, 1, -1)
    expect(a0, 'a0 保持原始值').toBe(-20)
    expect(a1, 'a1 保持原始值').toBe(-50)
    expect(mid, 'mid 归一到 [0, 360)').toBe(325)
    expect(normalizeAngle(a0), 'a0 归一后').toBe(340)
    expect(normalizeAngle(a1), 'a1 归一后').toBe(310)
    expect(a1, 'a1 应小于 a0').toBeLessThan(a0)
  })

  it('中间格：角度沿逆时针递减', () => {
    const { a0, a1, mid } = cellAngles(90, 45, 3, -1)
    expect(a0, 'a0').toBe(-45)
    expect(a1, 'a1').toBe(-90)
    expect(mid, 'mid 归一到 [0, 360)').toBe(292.5)
    expect(a1, 'a1 应小于 a0').toBeLessThan(a0)
  })

  it('任意格：张角恒等于 step，mid 居中', () => {
    for (const { start, step } of RING_CASES) {
      for (let index = 0; index < 24; index++) {
        const { a0, a1, mid } = cellAngles(start, step, index, -1)
        expect(diff(a0, a1), `${start}/${step}/${index} 张角`).toBeCloseTo(step, 10)
        expect(diff(a0, mid), `${start}/${step}/${index} 半张角`).toBeCloseTo(step / 2, 10)
      }
    }
  })
})

describe('cellAngles（相邻格连续性）', () => {
  it('相邻两格的起止角相接（不因 360°→0° 归一而断裂）', () => {
    for (const { start, step } of RING_CASES) {
      for (const dir of [1, -1] as const) {
        for (let index = 0; index < 24; index++) {
          const cur = cellAngles(start, step, index, dir)
          const next = cellAngles(start, step, index + 1, dir)
          expect(cur.a1, `${start}/${step}/${index}/${dir} 与下一格相接`).toBe(next.a0)
        }
      }
    }
  })

  it('mid 一律落在 [0, 360)', () => {
    for (const start of [0, 45, 90, 180, 270, 350, 359]) {
      for (const step of [5.625, 15, 30, 45, 60]) {
        for (const dir of [1, -1] as const) {
          for (let index = 0; index < 12; index++) {
            const { mid } = cellAngles(start, step, index, dir)
            expect(mid, `${start}/${step}/${index}/${dir} = ${mid}`).toBeGreaterThanOrEqual(0)
            expect(mid, `${start}/${step}/${index}/${dir} = ${mid}`).toBeLessThan(360)
          }
        }
      }
    }
  })
})

describe('ringSectorPath（环形扇形路径）', () => {
  it('顺序传入与逆序传入生成完全相同的路径', () => {
    const forward = ringSectorPath(300, 300, 100, 140, 10, 40)
    const reversed = ringSectorPath(300, 300, 100, 140, 40, 10)
    expect(reversed, '逆序传入应与顺序传入得到同一段扇形').toBe(forward)
  })

  it('跨 0° 的扇形：顺序与逆序同样一致', () => {
    const forward = ringSectorPath(300, 300, 100, 140, 350, 380)
    const reversed = ringSectorPath(300, 300, 100, 140, 380, 350)
    expect(reversed, '跨 0° 扇形逆序传入应与顺序传入一致').toBe(forward)
  })

  it('跨 0° 的扇形画出的是小弧（large-arc-flag = 0）', () => {
    const path = ringSectorPath(300, 300, 100, 140, 350, 380)
    expect(path, '跨 0° 的 30° 扇形不应走大弧').toContain('A 140 140 0 0 1')
    expect(path, '内弧同样应为小弧').toContain('A 100 100 0 0 0')
  })

  it('cellAngles 顺/逆两组等价角生成的路径一致', () => {
    // 顺时针第 0 格 = (0° → 30°)，逆时针从 30° 起算第 0 格 = (30° → 0°)，二者同一段扇形
    const cw = cellAngles(0, 30, 0, 1)
    const ccw = cellAngles(30, 30, 0, -1)
    expect(
      ringSectorPath(300, 300, 100, 140, ccw.a0, ccw.a1),
      '顺/逆排布的同一格应画出同一路径',
    ).toBe(ringSectorPath(300, 300, 100, 140, cw.a0, cw.a1))
  })

  it('路径结构：M 起点 / 外弧 sweep=1 / L 回到内弧 / 内弧 sweep=0 / Z 闭合', () => {
    const path = ringSectorPath(300, 300, 100, 140, 0, 30)
    expect(path, '起点应为外弧起始点').toMatch(/^M 440\.000 300\.000 /)
    expect(path, '外弧应为顺时针（sweep=1）').toContain('A 140 140 0 0 1')
    expect(path, '应含外弧到内弧的直线段').toContain('L ')
    expect(path, '内弧应为逆时针（sweep=0）').toContain('A 100 100 0 0 0')
    expect(path, '路径应闭合').toMatch(/ Z$/)
  })

  it('逆序传入时路径结构同样完整', () => {
    const path = ringSectorPath(300, 300, 100, 140, 30, 0)
    expect(path, '起点应为小角一侧的外弧起点').toMatch(/^M 440\.000 300\.000 /)
    expect(path, '外弧应为顺时针（sweep=1）').toContain('A 140 140 0 0 1')
    expect(path, '内弧应为逆时针（sweep=0）').toContain('A 100 100 0 0 0')
    expect(path, '路径应闭合').toMatch(/ Z$/)
    expect(path, '与顺序传入完全一致').toBe(ringSectorPath(300, 300, 100, 140, 0, 30))
  })
})
