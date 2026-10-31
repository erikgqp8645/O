<script setup lang="ts">
/**
 * 罗盘总览 · 可见性懒渲染容器
 *
 * ════════════════════════════════════════════════════════════════
 *  为什么要懒渲染？
 *  ────────────────────────────────────────────────────────────
 *  13 枚缩略盘里有几枚是重计算：
 *    · 苏州石刻天文图 —— 二十八宿辐条 + 星官 + 三规圆
 *    · 会合周期盘       —— 10 对行星 × 数十年的会合序列
 *    · 七曜入宿天象盘   —— 赤道 / 黄道 / 白道三道 + 日心轨道
 *  首屏一次性全渲染会让汇总页打开即卡顿。
 *
 *  这里用 IntersectionObserver：滚到视口附近（rootMargin 预取）
 *  才真正挂载盘面；一旦挂载就不再卸载（避免来回滚动反复重算）。
 *  ════════════════════════════════════════════════════════════════
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Props {
  /** 提前渲染的视口外扩距离（px） */
  rootMargin?: string
}

const props = withDefaults(defineProps<Props>(), {
  rootMargin: '400px 0px'
})

const host = ref<HTMLElement | null>(null)
const visible = ref(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  const el = host.value
  if (!el) return
  // 兜底：环境不支持 IntersectionObserver → 直接渲染
  if (typeof IntersectionObserver === 'undefined') {
    visible.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      visible.value = true
      // 已渲染的缩略盘不再卸载，避免滚动来回时反复重算
      observer?.disconnect()
      observer = null
    },
    { rootMargin: props.rootMargin }
  )
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div ref="host" class="lazy-thumb">
    <slot v-if="visible" />
    <div v-else class="lazy-thumb-placeholder" aria-hidden="true" />
  </div>
</template>

<style scoped>
.lazy-thumb {
  width: 100%;
  height: 100%;
}

.lazy-thumb-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
}
</style>
