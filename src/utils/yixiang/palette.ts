/**
 * 配色体系
 *
 * 采用 CSS 自定义属性承载主题色，SVG 渲染层只引用 var(--...)，
 * 因此换肤只需替换 :root 上的变量，不必改动组件逻辑。
 *
 * 五行本色：木青、火赤、土黄、金白、水墨蓝
 * 八卦主色：与所属五行一致，明度作区分
 */

/** 五行 → 语义色（引用 CSS 变量） */
export const WUXING_COLOR: Readonly<Record<string, string>> = {
  木: 'var(--wx-wood)',
  火: 'var(--wx-fire)',
  土: 'var(--wx-earth)',
  金: 'var(--wx-metal)',
  水: 'var(--wx-water)'
}

/** 八卦 → 主色 */
export const BAGUA_COLOR: Readonly<Record<string, string>> = {
  乾: 'var(--gua-qian)',
  兑: 'var(--gua-dui)',
  离: 'var(--gua-li)',
  震: 'var(--gua-zhen)',
  巽: 'var(--gua-xun)',
  坎: 'var(--gua-kan)',
  艮: 'var(--gua-gen)',
  坤: 'var(--gua-kun)'
}

/** 季节 → 主色 */
export const SEASON_COLOR: Readonly<Record<string, string>> = {
  春: 'var(--season-spring)',
  夏: 'var(--season-summer)',
  长夏: 'var(--season-late-summer)',
  秋: 'var(--season-autumn)',
  冬: 'var(--season-winter)'
}

/** 京房八宫 → 宫色 */
export const PALACE_COLOR: Readonly<Record<string, string>> = {
  乾: 'var(--palace-qian)',
  坎: 'var(--palace-kan)',
  艮: 'var(--palace-gen)',
  震: 'var(--palace-zhen)',
  巽: 'var(--palace-xun)',
  离: 'var(--palace-li)',
  坤: 'var(--palace-kun)',
  兑: 'var(--palace-dui)'
}

/** 十二时辰 → 分段色（按五行） */
export const SHICHEN_COLOR: Readonly<Record<string, string>> = {
  子: 'var(--gua-kan)',
  丑: 'var(--gua-kun)',
  寅: 'var(--gua-zhen)',
  卯: 'var(--gua-zhen)',
  辰: 'var(--gua-kun)',
  巳: 'var(--gua-li)',
  午: 'var(--gua-li)',
  未: 'var(--gua-kun)',
  申: 'var(--gua-dui)',
  酉: 'var(--gua-dui)',
  戌: 'var(--gua-qian)',
  亥: 'var(--gua-qian)'
}

/** 十二地支 → 分段色 */
export const BRANCH_COLOR: Readonly<Record<string, string>> = {
  子: 'var(--gua-kan)',
  丑: 'var(--gua-kun)',
  寅: 'var(--gua-zhen)',
  卯: 'var(--gua-zhen)',
  辰: 'var(--gua-kun)',
  巳: 'var(--gua-li)',
  午: 'var(--gua-li)',
  未: 'var(--gua-kun)',
  申: 'var(--gua-dui)',
  酉: 'var(--gua-dui)',
  戌: 'var(--gua-qian)',
  亥: 'var(--gua-qian)'
}

/** 天干 → 分段色 */
export const STEM_COLOR: Readonly<Record<string, string>> = {
  甲: 'var(--gua-zhen)',
  乙: 'var(--gua-xun)',
  丙: 'var(--gua-li)',
  丁: 'var(--gua-li)',
  戊: 'var(--gua-kun)',
  己: 'var(--gua-kun)',
  庚: 'var(--gua-dui)',
  辛: 'var(--gua-dui)',
  壬: 'var(--gua-kan)',
  癸: 'var(--gua-kan)'
}

/** 二十四节气 → 分段色（按季节） */
export function termColor(season: string): string {
  return SEASON_COLOR[season] ?? 'var(--ink-3)'
}

/** 六十甲子 → 纳音五行色 */
export function jiaziColor(nayinElement: string): string {
  return WUXING_COLOR[nayinElement] ?? 'var(--ink-3)'
}
