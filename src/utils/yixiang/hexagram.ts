/**
 * 卦符（爻画）几何
 *
 * 【爻的约定】
 *   六爻自下而上：初爻在最下、上爻在最上（传统读法）。
 *   阳爻 = 一整条实线；阴爻 = 中间断开的两截。
 *
 * 【盘面排布】
 *   卦符与卦名共用同一个「切向 + 下半盘翻转」的文字变换，
 *   因此每一格都是正立可读的（与原盘卦名的排布规制一致）。
 *   卦符整体置于卦名之上（即格内「外侧」在正上方一格为外缘）。
 */

/** 爻画矩形（局部坐标，原点在卦符块中心） */
export interface HexRect {
  x: number
  y: number
  w: number
  h: number
}

/** 卦符尺寸参数 */
export interface HexagramStyle {
  /** 爻线长度（横向） */
  lineWidth: number
  /** 每爻行高 */
  rowHeight: number
  /** 爻线粗细 */
  thickness: number
  /** 阴爻中缝宽度 */
  gap: number
}

/**
 * 生成一卦的六爻矩形。
 *
 * @param yang  六爻阴阳，下标 0 = 初爻，true = 阳爻
 * @param top   卦符块的上边缘（局部 y，向上为负）
 * @param s     尺寸参数
 */
export function hexagramRects(
  yang: readonly boolean[],
  top: number,
  s: HexagramStyle
): HexRect[] {
  const out: HexRect[] = []
  const half = s.lineWidth / 2
  for (let j = 0; j < 6; j++) {
    // j = 0 初爻（落在卦符块最下），j = 5 上爻（落在最上）
    const y = top + (5.5 - j) * s.rowHeight - s.thickness / 2
    if (yang[j]) {
      out.push({ x: -half, y, w: s.lineWidth, h: s.thickness })
    } else {
      const seg = (s.lineWidth - s.gap) / 2
      out.push({ x: -half, y, w: seg, h: s.thickness })
      out.push({ x: s.gap / 2, y, w: seg, h: s.thickness })
    }
  }
  return out
}

/**
 * 计算一格内「卦符 + 卦名」的排版尺寸。
 *
 * @param depth     格的径向深度（像素）
 * @param arcWidth  格在目标半径处的弧宽（像素）
 * @param fontSize  卦名字号
 * @param charCount 卦名字数（1 或 2）
 */
export function cellContentLayout(
  depth: number,
  arcWidth: number,
  fontSize: number,
  charCount: number
): {
  hexTop: number
  hexHeight: number
  nameCenter: number
  rowHeight: number
  lineWidth: number
  thickness: number
  gap: number
  charSize: number
} {
  const pad = 2
  const nameHeight = charCount * fontSize * 1.04
  const gapV = Math.max(2, fontSize * 0.28)
  // 卦符块尽量占满余下空间
  let hexHeight = depth - 2 * pad - nameHeight - gapV
  hexHeight = Math.max(0, hexHeight)
  const rowHeight = hexHeight / 6
  const thickness = Math.max(1, Math.min(rowHeight * 0.55, fontSize * 0.22))
  const lineWidth = Math.max(6, Math.min(arcWidth * 0.68, depth * 0.42))
  const gap = lineWidth * 0.2
  const total = hexHeight + gapV + nameHeight
  // 内容整体居中：卦符在上、卦名在下
  const half = total / 2
  const hexTop = -half
  const nameCenter = -half + hexHeight + gapV + nameHeight / 2
  return {
    hexTop,
    hexHeight,
    nameCenter,
    rowHeight,
    lineWidth,
    thickness,
    gap,
    charSize: fontSize
  }
}
