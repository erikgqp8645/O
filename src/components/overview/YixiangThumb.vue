<script setup lang="ts">
/**
 * 罗盘总览 · 易象罗盘缩略盘
 *
 * 易象罗盘不用 RingStack —— 它自带 11 层环的 YixiangDial，
 * 且盘面坐标系是 800×800（盘心 400,400，外缘 R=380）。
 * 全屏 View 用 `scale(1.35) translate(-400,-400)` 把盘心归零后
 * 交给外层 <g> 定位；缩略图沿用同一变换，保证与全屏盘完全同构。
 *
 * 盘面配色（宣纸底 + 朱砂）由 CSS 变量提供，
 * 变量挂在汇总页的 .thumb-frame--yixiang 上（不写入 :root）。
 */
import YixiangDial from '@/components/yixiang/YixiangDial.vue'
import { RING_LAYOUTS } from '@/utils/yixiang/rings'
import { THUMB_PADDING } from '@/utils/overview/thumbGeometry'
import type { TimeSnapshot } from '@/utils/yixiang/timeEngine'

interface Props {
  snapshot: TimeSnapshot
  direction?: 'clockwise' | 'counterclockwise'
  /** viewBox 留白（用户单位） */
  padding?: number
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'clockwise',
  padding: THUMB_PADDING
})

/** 缩略图不提供分层开关 → 十一层环常亮 */
const visibleRings = RING_LAYOUTS.map((r) => r.key)

/** 易象盘面自身坐标系 800×800 */
const DIAL_SCALE = 1.35
const PLATE_R = 380
/** 缩略盘外缘半径 = 380 × 1.35 = 513 */
const OUTER_RADIUS = PLATE_R * DIAL_SCALE
/** 盘心在 viewBox 中的位置（留白后居中） */
const CENTER = OUTER_RADIUS + props.padding
const viewBox = `0 0 ${CENTER * 2} ${CENTER * 2}`
</script>

<template>
  <svg
    class="thumb-svg"
    :viewBox="viewBox"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    focusable="false"
  >
    <g :transform="`translate(${CENTER}, ${CENTER})`">
      <g :transform="`scale(${DIAL_SCALE}) translate(-400, -400)`">
        <YixiangDial
          :snapshot="props.snapshot"
          :visible-rings="visibleRings"
          :direction="props.direction"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.thumb-svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
