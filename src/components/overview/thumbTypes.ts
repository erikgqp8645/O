/**
 * 罗盘总览 · 缩略盘公共类型
 *
 * 单独成文件，避免 thumbSpecs.ts（依赖大量环组件）与 .vue 组件之间
 * 产生循环导入。
 */
import type { Component } from 'vue'
import type { TimePrecision } from '@/utils/overview/thumbGeometry'

/**
 * 环配置 —— 与 RingStack 的 RingConfig 结构一致
 *
 * ⚠️ RingStack 内部未导出该接口，这里按结构相同重新声明一份。
 *    若日后 RingStack 导出该类型，应改为直接引用，避免两处漂移。
 */
export interface ThumbRingConfig {
  /** 环组件 */
  component: Component
  /** 该环的径向厚度（外半径 − 内半径）；省略 = 自动填满到圆心 */
  thickness?: number
  /** 与外侧相邻环的间隙，覆盖默认 gap */
  gapBefore?: number
  /** 透传给该环的额外 props */
  props?: Record<string, unknown>
}

/** 圆心内容类型 —— 决定缩略盘里除了环层还画什么 */
export type ThumbCenterKind =
  | 'none'
  /** 观斗盘：北斗七星 + 紫微垣 */
  | 'beidou'
  /** 卦关系盘：有向箭头 */
  | 'gua-relation'
  /** 苏州石刻天文图：世界地图底图 + 三规圆星图 */
  | 'suzhou'
  /** 会合周期盘：会合点与连线 */
  | 'conjunction'
  /** 先天六十四卦盘：中央伏羲方图（缩略版） */
  | 'xiantian-square'
  /** 二十四山风水盘：圆心方向指示器（无传感器，取固定北向） */
  | 'fengshui'

/** 缩略盘渲染方式 */
export type ThumbRenderKind =
  /** 走 RingStack 的标准同心环 */
  | 'ringstack'
  /** 易象罗盘：自带 11 层环的 YixiangDial（另一套坐标系） */
  | 'yixiang'

/** 单枚缩略盘的完整规格 */
export interface ThumbSpec {
  /** 罗盘 id（同时是跳转路径 /compass/<id>） */
  id: string
  /** 显示名 */
  name: string
  /** 分类标签 */
  category: string
  /** 一句话说明（汇总页卡片用，控制在 20 字内） */
  summary: string
  /** 渲染方式 */
  kind: ThumbRenderKind
  /** 盘面外缘半径（用户单位） */
  outerRadius: number
  /** 环间默认间隙 */
  gap: number
  /** 环配置（由外到内） */
  rings: ThumbRingConfig[]
  /** 圆心内容 */
  center: ThumbCenterKind
  /** 时间量化粒度：盘面实际变化快慢决定 */
  precision: TimePrecision
}
