<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { useSidebarExpanded } from '@/composables/useSidebarLayout'
import { useIsMobile } from '@/composables/useMediaQuery'

/**
 * 罗盘一览悬浮按钮（左上角常驻）
 *
 * ════════════════════════════════════════════════════════════════
 *  为什么需要它：
 *    · 罗盘页走 CompassLayout（全屏 layout），VitePress 默认的
 *      nav / logo 全部不渲染，站内的导航入口被抹掉；
 *    · 侧栏里的返回入口要展开侧栏才看得见；
 *    → 于是在罗盘页左上角常驻一个不依赖侧栏的返回入口。
 *
 *  语义分工（两条返回通道互补）：
 *    · 左上角「← 罗盘一览」→ /compass/  罗盘卡片列表（换盘子的入口）
 *    · 侧栏顶部「← 首页」    → /        站点首页（乙巳观）
 *
 *  位置让位：
 *    · 桌面端侧栏展开时占左侧 260px，按钮右移到 274px，避免压住侧栏；
 *      侧栏收起时贴视口左上角（14px）。
 *    · 移动端（≤768px）侧栏是底部弹出面板，左上角恒空闲，固定 10px。
 *    过渡时长与侧栏的 transform 0.25s 一致，两边同步滑动。
 *
 *  挂载点：CompassLayout → 13 个罗盘页通用。
 * ════════════════════════════════════════════════════════════════
 */

const { expanded } = useSidebarExpanded()
const isMobile = useIsMobile()

/** 距视口左边缘的距离：随侧栏展开状态让位 */
const leftOffset = computed(() => {
  if (isMobile.value) return '10px'
  return expanded.value ? '274px' : '14px'
})
</script>

<template>
  <a
    class="compass-list-btn"
    :href="withBase('/compass/')"
    :style="{ left: leftOffset }"
    title="返回罗盘一览"
    aria-label="返回罗盘一览"
  >
    <span class="compass-list-btn__arrow">←</span>
    <span class="compass-list-btn__text">罗盘一览</span>
  </a>
</template>

<style scoped>
/* 固定在视口左上角；z-index 高于盘面与风水盘的授权遮罩（100） */
.compass-list-btn {
  position: fixed;
  top: 14px;
  z-index: 998;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1;
  color: #cfc7b6;
  text-decoration: none;
  background: rgba(10, 10, 10, 0.72);
  border: 1px solid rgba(255, 204, 0, 0.32);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: left 0.25s ease, color 0.15s, border-color 0.15s, background 0.15s;
  user-select: none;
}

.compass-list-btn:hover {
  color: #ffcc00;
  border-color: #ffcc00;
  background: rgba(255, 204, 0, 0.1);
}

.compass-list-btn__arrow {
  font-size: 13px;
}

/* 窄屏（手机）收紧尺寸，避免压住盘面 */
@media (max-width: 480px) {
  .compass-list-btn {
    top: 10px;
    padding: 5px 9px;
    font-size: 11px;
  }
}
</style>
