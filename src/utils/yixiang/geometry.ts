/**
 * 极坐标几何工具
 *
 * 全盘采用「SVG 空间」角度：0° 在正右，90° 在正下，
 * 180° 在正左，270° 在正上，角度顺时针增加。
 *
 * 盘面方位为罗盘古式「上南下北、左东右西」：
 *   正上 = 南（午）· 正下 = 北（子）· 正左 = 东（卯）· 正右 = 西（酉）。
 *
 * 与「方位角」制（0° = 正北、顺时针计角）的换算：SVG = (bearing + 90) mod 360。
 */

/** 极坐标 → 直角坐标 */
export function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

/**
 * 生成环形扇形路径。
 * @param cx,cy   圆心
 * @param rInner  内半径
 * @param rOuter  外半径
 * @param a0      起始角（度）
 * @param a1      结束角（度）
 *
 * 起止角允许逆序（逆时针排布时 a1 < a0）：内部按小角在前排序，
 * 并用 sweep=1 统一画顺时针弧，因此单格扇形（张角 < 180°）的形状与方向
 * 均不受排布方向影响。
 */
export function ringSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  a0: number,
  a1: number
): string {
  const [lo, hi] = a0 <= a1 ? [a0, a1] : [a1, a0]
  const large = hi - lo > 180 ? 1 : 0
  const [x0o, y0o] = polar(cx, cy, rOuter, lo)
  const [x1o, y1o] = polar(cx, cy, rOuter, hi)
  const [x1i, y1i] = polar(cx, cy, rInner, hi)
  const [x0i, y0i] = polar(cx, cy, rInner, lo)
  return [
    `M ${x0o.toFixed(3)} ${y0o.toFixed(3)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o.toFixed(3)} ${y1o.toFixed(3)}`,
    `L ${x1i.toFixed(3)} ${y1i.toFixed(3)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x0i.toFixed(3)} ${y0i.toFixed(3)}`,
    'Z'
  ].join(' ')
}

/**
 * 生成圆弧路径（用于圆环线、分隔线）。
 * @param a0,a1 起止角（度）
 */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0
  const [x0, y0] = polar(cx, cy, r, a0)
  const [x1, y1] = polar(cx, cy, r, a1)
  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`
}

/**
 * 文字沿圆弧排布时的变换。
 *
 * 采用罗盘通行的「切向排布 + 下半盘翻转」写法：
 *   上半盘（正北一侧）文字沿弧正向，顶部水平正立；
 *   下半盘（正南一侧）文字翻转 180°，使底部也保持正立可读。
 * 返回可直接用于 <text transform="..."> 的矩阵字符串。
 * @param angle 文字所在位置的圆心角（度，SVG 空间）
 * @param r     文字所在半径
 */
export function textTransform(cx: number, cy: number, r: number, angle: number): string {
  const [x, y] = polar(cx, cy, r, angle)
  // SVG 空间：0°=正右，90°=正下，180°=正左，270°=正上
  const upper = angle > 180 && angle < 360
  // 上半盘：rotation = angle + 90（正上得 0°，正立）
  // 下半盘：rotation = angle - 90（正下得 0°，正立）
  const rot = upper ? angle + 90 : angle - 90
  return `translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${rot.toFixed(3)})`
}

/**
 * 判断某角度是否落在扇区 [a0, a1) 内（角度按 0-360 归一）。
 */
export function inSector(angle: number, a0: number, a1: number): boolean {
  const norm = (a: number) => ((a % 360) + 360) % 360
  const x = norm(angle)
  const s = norm(a0)
  const e = norm(a1)
  if (s <= e) return x >= s && x < e
  return x >= s || x < e
}

/**
 * 把「起始角 + 序号」换算为某环上第 index 格的圆心角。
 * 环按顺时针排列，0 号格位于 a0 处。
 */
export function sectorCenterAngle(a0: number, step: number, index: number): number {
  return a0 + step * index + step / 2
}

/**
 * 环上一格的起止角与中心角。
 *
 * @param startAngle 环的起始角（度，SVG 空间）
 * @param step       每格张角（度）
 * @param index      格序号（0 起）
 * @param dir        排布方向：+1 顺时针，-1 逆时针
 *
 * ⚠️ a0 / a1 刻意「不」归一到 [0,360)：相邻两格的起止角必须保持连续，
 *    否则最后一格会因 360°→0° 归一而变成 345° 的大扇区，把整环涂掉。
 *    逆时针时 a1 < a0（可为负角），由 ringSectorPath 内部排序处理。
 *    mid 会归一，供 textTransform 判断上/下半盘。
 */
export function cellAngles(
  startAngle: number,
  step: number,
  index: number,
  dir: 1 | -1 = 1
): { a0: number; a1: number; mid: number } {
  return {
    a0: startAngle + dir * index * step,
    a1: startAngle + dir * (index + 1) * step,
    mid: normalizeAngle(startAngle + dir * (index + 0.5) * step)
  }
}

/** 角度归一化到 [0, 360) */
export function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360
}

/**
 * 方位角（bearing）→ SVG 角。
 *
 * bearing：0° = 正北，顺时针增加（地理罗盘标准）。
 * SVG：0° = 正右，顺时针增加。
 *
 * 罗盘古式「上南下北、左东右西」：
 *   正上 = 南（180°）· 正下 = 北（0°）· 正左 = 东（90°）· 正右 = 西（270°）
 * 故 SVG = bearing + 90。
 */
export function bearingToSvg(bearing: number): number {
  return normalizeAngle(bearing + 90)
}

/** SVG 角 → 方位角（bearing），bearingToSvg 的逆运算 */
export function svgToBearing(svgAngle: number): number {
  return normalizeAngle(svgAngle - 90)
}

/** 候名沿弧排布的结果 */
export interface HouNameFit {
  /** 字号（px） */
  fontSize: number
  /** 相对候格中心的角度偏移（度，SVG 空间） */
  angleOffset: number
}

/** 候名字号上限（px，盘面坐标系单位） */
const HOU_NAME_MAX_FONT = 7.5

/**
 * 计算候名沿弧排布的字号与位置。
 *
 * 【为什么需要它】
 * 七十二候每格只有 5°（候环半径 ~220px 处单格弧长约 19px），
 * 而候名多为 3~5 字（如「草木黄落」），沿弧排开必然超出单格。
 * 若一味让名字按单格居中，它会压到邻格的分隔线上（分隔线是朱砂描边），
 * 看上去就是「候名不清楚」；更糟的是跨过所属节气格时，描边底色会盖错邻节的颜色。
 *
 * 【约束】
 * 候名必须整体容于「所属节气格」（15° = 3 个候格）之内：
 *   1. 字号按节气格弧宽与名字字数自适应（上限 7px）；
 *   2. 若名字仍会越出节气格，则向节气中心收拢（角度偏移），保证底色始终正确。
 *
 * @param labelLength 候名字数
 * @param radius      文字所在半径（px）
 * @param cellStep    单个候格张角（度），七十二候环为 5
 * @param cellOffset  候格在所属节气格内的序号偏移（格）：一候 −1、二候 0、三候 +1
 * @param dir         排布方向：+1 顺时针，−1 逆时针
 */
export function fitHouName(
  labelLength: number,
  radius: number,
  cellStep: number,
  cellOffset: number,
  dir: 1 | -1 = 1
): HouNameFit {
  const len = Math.max(labelLength, 1)
  const termSpan = cellStep * 3 // 所属节气格张角（15°）
  const termHalf = termSpan / 2
  const termArc = (radius * termSpan * Math.PI) / 180
  const fontSize = Math.min(HOU_NAME_MAX_FONT, termArc / len)
  const halfAngle = ((fontSize * len) / 2 / radius) * (180 / Math.PI)
  const maxOffset = Math.max(0, termHalf - halfAngle)
  const raw = dir * cellOffset * cellStep
  const clamped = Math.max(-maxOffset, Math.min(maxOffset, raw))
  return { fontSize, angleOffset: clamped - raw }
}
