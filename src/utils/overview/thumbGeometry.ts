/**
 * 罗盘总览 · 缩略盘几何与时间分桶
 *
 * ════════════════════════════════════════════════════════════════
 *  纯函数层：不依赖 Vue 运行时，可直接单测。
 *
 *  ① computeThumbViewBox / computeThumbCenter
 *     由盘面外缘半径反解缩略图的 SVG viewBox 与盘心位置。
 *
 *     缩略盘沿用各罗盘原本的「用户单位」坐标系（外缘半径 280~600），
 *     只用 viewBox 做等比缩放 —— 因此缩略图与全屏盘的环层比例、
 *     锚点方位完全一致，不会出现「另画一套」的对位偏差。
 *
 *  ② timeBucketKey / timeFromBucketKey
 *     时间分桶。
 *
 *     汇总页 13 枚缩略盘共用一个 1Hz 时钟；若每枚都按秒重算，
 *     苏州星图 / 会合连线这类重计算会被放大 13 倍。
 *
 *     🔑 关键点：必须先取「桶 key」（一个数字）再由 key 还原 Date，
 *        不能直接 `computed(() => new Date(...))` ——
 *        后者每秒都返回**新的 Date 对象**，下游 computed 会被逐秒唤醒，
 *        分桶就白做了。
 *        先取数字 key 后，key 每分钟才变一次，
 *        由 key 还原的 Date 引用也随之每分钟才换一次，
 *        下游才能真正命中缓存。
 * ════════════════════════════════════════════════════════════════
 */

/** 时间量化粒度 */
export type TimePrecision = 'second' | 'minute' | 'hour'

/** 每种粒度对应的桶跨度（毫秒） */
const BUCKET_SPAN: Record<TimePrecision, number> = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000
}

/** 缩略盘 viewBox 边距（用户单位） */
export const THUMB_PADDING = 10

/**
 * 取时间桶 key（毫秒纪元按粒度取整）
 *
 * 用毫秒纪元而非本地时间字段：所有时区的时区偏移都是整分钟，
 * 因此纪元分桶与「本地分钟」分桶在现代时区下完全等价，
 * 且不受夏令时切换影响。
 */
export function timeBucketKey(d: Date, precision: TimePrecision): number {
  return Math.floor(d.getTime() / BUCKET_SPAN[precision])
}

/** 由桶 key 还原时间（同一桶内返回等价的时间点） */
export function timeFromBucketKey(key: number, precision: TimePrecision): Date {
  return new Date(key * BUCKET_SPAN[precision])
}

/** 把时间截断到指定粒度（等价于 quantize，仅供测试与一次性取用） */
export function quantizeTime(d: Date, precision: TimePrecision): Date {
  return timeFromBucketKey(timeBucketKey(d, precision), precision)
}

/**
 * 缩略盘 SVG viewBox
 *
 * 盘面以 (0,0) 为圆心向外画到 outerRadius，
 * 故 viewBox 取 `[0, 0, 2R', 2R']`，盘心落在 (R', R')。
 */
export function computeThumbViewBox(outerRadius: number, padding: number = THUMB_PADDING): string {
  const size = (outerRadius + padding) * 2
  return `0 0 ${size} ${size}`
}

/** 缩略盘盘心在 viewBox 坐标系中的位置 */
export function computeThumbCenter(
  outerRadius: number,
  padding: number = THUMB_PADDING
): { x: number; y: number } {
  const c = outerRadius + padding
  return { x: c, y: c }
}
