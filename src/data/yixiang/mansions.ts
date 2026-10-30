/**
 * 二十八宿（风水罗盘宿度）
 *
 * 传统风水罗盘的「廿八宿分度」层用的是一套**罗盘专属宿度**，与《汉书·律历志》
 * 的汉代赤道宿度不同——后者是星盘口径（O 项目 `src/data/rings/twentyEightConstellations.ts`
 * 与 `src/data/lunarMansions.ts` 用的是那一套）。两套不可混用。
 *
 * 【排法】**巽中起角木蛟，逆行二十四山**：
 *   角宿起于巽山（后天巽位在东南）中线，随后逆时针方向依次排亢、氐、房…，
 *   东方青龙居东、北方玄武居北、西方白虎居西、南方朱雀居南。
 *
 * 【宿度】各宿不等宽，原文以「太 / 少 / 半」标记余分：
 *   太 ≈ 整度有余 · 少 ≈ 整度不足 · 半 = 整半度。
 *   `degree` 存宿度的**数值**（半度已折入），`degreeText` 存原文写法，
 *   `remainder` 存余分标记用于展示。二十八宿合计 358 度
 *   （若把太/少的零头也计入，约 358.1 度），较短于周天 365.25 度；
 *   铺到盘面周天 360° 时按比例放大，hover 中仍显示原始宿度。
 *
 * 【出处】赣州杨派风水文化传播有限公司《罗盘逐层介绍》第十八层「廿八宿度数」。
 */

/** 四象（星宿分野） */
export type MansionQuadrant = '东方青龙' | '北方玄武' | '西方白虎' | '南方朱雀'

/** 宿度余分标记 */
export type MansionRemainder = '太' | '少' | '半' | ''

export interface MansionInfo {
  /** 宿名 */
  name: string
  /** 宿度数值（半度已折入） */
  degree: number
  /** 原文宿度写法，如「十六度半」 */
  degreeText: string
  /** 宿度余分标记 */
  remainder: MansionRemainder
  /** 四象归属 */
  quadrant: MansionQuadrant
}

/** 二十八宿表（自角宿起，宿度不等宽） */
export const MANSIONS: readonly MansionInfo[] = [
  { name: '角', degree: 12, degreeText: '十二度太', remainder: '太', quadrant: '东方青龙' },
  { name: '亢', degree: 9, degreeText: '九度太', remainder: '太', quadrant: '东方青龙' },
  { name: '氐', degree: 16, degreeText: '十六度少', remainder: '少', quadrant: '东方青龙' },
  { name: '房', degree: 5, degreeText: '五度太', remainder: '太', quadrant: '东方青龙' },
  { name: '心', degree: 6, degreeText: '六度', remainder: '', quadrant: '东方青龙' },
  { name: '尾', degree: 18, degreeText: '十八度', remainder: '', quadrant: '东方青龙' },
  { name: '箕', degree: 9.5, degreeText: '九度半', remainder: '半', quadrant: '东方青龙' },

  { name: '斗', degree: 22, degreeText: '二十二度', remainder: '', quadrant: '北方玄武' },
  { name: '牛', degree: 7, degreeText: '七度', remainder: '', quadrant: '北方玄武' },
  { name: '女', degree: 11, degreeText: '十一度', remainder: '', quadrant: '北方玄武' },
  { name: '虚', degree: 9, degreeText: '九度少', remainder: '少', quadrant: '北方玄武' },
  { name: '危', degree: 16, degreeText: '十六度', remainder: '', quadrant: '北方玄武' },
  { name: '室', degree: 18, degreeText: '十八度', remainder: '', quadrant: '北方玄武' },
  { name: '壁', degree: 9, degreeText: '九度太', remainder: '太', quadrant: '北方玄武' },

  { name: '奎', degree: 18, degreeText: '十八度', remainder: '', quadrant: '西方白虎' },
  { name: '娄', degree: 12, degreeText: '十二度太', remainder: '太', quadrant: '西方白虎' },
  { name: '胃', degree: 15, degreeText: '十五度少', remainder: '少', quadrant: '西方白虎' },
  { name: '昴', degree: 11, degreeText: '十一度', remainder: '', quadrant: '西方白虎' },
  { name: '毕', degree: 16.5, degreeText: '十六度半', remainder: '半', quadrant: '西方白虎' },
  { name: '觜', degree: 0.5, degreeText: '半度', remainder: '半', quadrant: '西方白虎' },
  { name: '参', degree: 9.5, degreeText: '九度半', remainder: '半', quadrant: '西方白虎' },

  { name: '井', degree: 30, degreeText: '三十度少', remainder: '少', quadrant: '南方朱雀' },
  { name: '鬼', degree: 2.5, degreeText: '二度半', remainder: '半', quadrant: '南方朱雀' },
  { name: '柳', degree: 13.5, degreeText: '十三度半', remainder: '半', quadrant: '南方朱雀' },
  { name: '星', degree: 6, degreeText: '六度太', remainder: '太', quadrant: '南方朱雀' },
  { name: '张', degree: 18, degreeText: '十八度太', remainder: '太', quadrant: '南方朱雀' },
  { name: '翼', degree: 20, degreeText: '二十度少', remainder: '少', quadrant: '南方朱雀' },
  { name: '轸', degree: 18, degreeText: '十八度太', remainder: '太', quadrant: '南方朱雀' }
]

/** 宿度合计（古度） */
export const MANSIONS_TOTAL_DEGREE = MANSIONS.reduce((s, m) => s + m.degree, 0)

/** 四象配色（东方青龙 / 北方玄武 / 西方白虎 / 南方朱雀） */
export const MANSION_QUADRANT_COLOR: Readonly<Record<MansionQuadrant, string>> = Object.freeze({
  东方青龙: '#4a7f66',
  北方玄武: '#414c60',
  西方白虎: '#93763f',
  南方朱雀: '#a8402f'
})
