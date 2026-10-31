import { describe, expect, it } from 'vitest'
import {
  computeThumbCenter,
  computeThumbViewBox,
  quantizeTime,
  THUMB_PADDING,
  timeBucketKey,
  timeFromBucketKey,
} from './thumbGeometry'

describe('thumbGeometry · viewBox 反解', () => {
  it('viewBox 是边长 2×(R+padding) 的正方形', () => {
    expect(computeThumbViewBox(560)).toBe(`0 0 ${2 * (560 + THUMB_PADDING)} ${2 * (560 + THUMB_PADDING)}`)
    expect(computeThumbViewBox(280, 0)).toBe('0 0 560 560')
  })

  it('盘心落在 viewBox 正中', () => {
    const c = computeThumbCenter(560)
    expect(c.x).toBe(560 + THUMB_PADDING)
    expect(c.y).toBe(560 + THUMB_PADDING)
    // 盘心 + 外缘半径 = viewBox 边长 − padding（留白对称）
    expect(c.x + 560).toBe(2 * (560 + THUMB_PADDING) - THUMB_PADDING)
  })

  it('padding 为 0 时盘面正好贴满 viewBox', () => {
    const c = computeThumbCenter(280, 0)
    expect(c.x).toBe(280)
    expect(c.x + 280).toBe(560)
  })
})

describe('thumbGeometry · 时间分桶', () => {
  const base = new Date(2026, 9, 30, 14, 27, 33, 456)

  it('second 桶截断到秒', () => {
    const q = quantizeTime(base, 'second')
    expect(q.getSeconds()).toBe(33)
    expect(q.getMilliseconds()).toBe(0)
    expect(q.getMinutes()).toBe(27)
  })

  it('minute 桶截断到分', () => {
    const q = quantizeTime(base, 'minute')
    expect(q.getMinutes()).toBe(27)
    expect(q.getSeconds()).toBe(0)
    expect(q.getMilliseconds()).toBe(0)
    expect(q.getHours()).toBe(14)
  })

  it('hour 桶截断到时', () => {
    const q = quantizeTime(base, 'hour')
    expect(q.getHours()).toBe(14)
    expect(q.getMinutes()).toBe(0)
    expect(q.getSeconds()).toBe(0)
  })

  it('同一桶内 key 相同、跨桶 key 递增', () => {
    const a = new Date(2026, 9, 30, 14, 27, 1)
    const b = new Date(2026, 9, 30, 14, 27, 59)
    const c = new Date(2026, 9, 30, 14, 28, 0)
    expect(timeBucketKey(a, 'minute')).toBe(timeBucketKey(b, 'minute'))
    expect(timeBucketKey(c, 'minute')).toBe(timeBucketKey(a, 'minute') + 1)
  })

  it('由 key 还原的时间仍在同一桶内（幂等）', () => {
    for (const p of ['second', 'minute', 'hour'] as const) {
      const key = timeBucketKey(base, p)
      const restored = timeFromBucketKey(key, p)
      expect(timeBucketKey(restored, p)).toBe(key)
      expect(restored.getTime()).toBeLessThanOrEqual(base.getTime())
    }
  })

  it('minute 桶比 second 桶粗：同一分钟内 second 会换桶而 minute 不换', () => {
    const a = new Date(2026, 9, 30, 14, 27, 1)
    const b = new Date(2026, 9, 30, 14, 27, 59)
    expect(timeBucketKey(a, 'second')).not.toBe(timeBucketKey(b, 'second'))
    expect(timeBucketKey(a, 'minute')).toBe(timeBucketKey(b, 'minute'))
  })
})
