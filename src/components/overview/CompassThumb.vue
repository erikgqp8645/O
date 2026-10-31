<script setup lang="ts">
/**
 * 罗盘总览 · 通用缩略盘渲染器
 *
 * ════════════════════════════════════════════════════════════════
 *  为什么不用各罗盘的 View？
 *  ────────────────────────────────────────────────────────────
 *  13 个 View 各自绑定了全屏罗盘专属的副作用，直接复用会互相打架：
 *    · Teleport to="#sidebar-view-tools"  —— 13 个抢同一个挂载点
 *    · useLiveClock                       —— 13 个独立秒级定时器
 *    · useAltDragPan                      —— 滚轮 preventDefault 劫持页面滚动
 *    · useGeolocation / usePhoneOrientation —— 弹定位授权 / 传感器遮罩盖住盘面
 *    · provideCompassContext              —— 模块级单例，多 View 共存会串
 *
 *  所以缩略盘改用「底层环组件」另建一套小尺寸盘面：
 *  同样的 RingStack + 同样的环组件 + 同样的坐标系，
 *  只是把 viewBox 缩小 —— 环层比例与锚点方位与全屏盘严格一致。
 * ════════════════════════════════════════════════════════════════
 */
import { computed } from 'vue'
import RingStack from '@/components/base/RingStack.vue'
import { computeThumbCenter, computeThumbViewBox, THUMB_PADDING } from '@/utils/overview/thumbGeometry'
import type { ThumbRingConfig } from './thumbTypes'

interface Props {
  /** 盘面外缘半径（用户单位，与对应全屏盘一致） */
  outerRadius: number
  /** 环配置（由外到内） */
  rings: ThumbRingConfig[]
  /** 环间默认间隙 */
  gap?: number
  /** 统一旋转方向 */
  rotationDirection?: 'clockwise' | 'counterclockwise'
  /** viewBox 留白（用户单位） */
  padding?: number
}

const props = withDefaults(defineProps<Props>(), {
  gap: 2,
  rotationDirection: 'clockwise',
  padding: THUMB_PADDING
})

const viewBox = computed(() => computeThumbViewBox(props.outerRadius, props.padding))
const center = computed(() => computeThumbCenter(props.outerRadius, props.padding))
</script>

<template>
  <svg
    class="thumb-svg"
    :viewBox="viewBox"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    focusable="false"
  >
    <g :transform="`translate(${center.x}, ${center.y})`">
      <RingStack
        :outer-radius="outerRadius"
        :gap="gap"
        :rings="rings"
        :rotation-direction="rotationDirection"
      >
        <template #center="{ innerRadius }">
          <slot name="center" :inner-radius="innerRadius" />
        </template>
      </RingStack>
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
