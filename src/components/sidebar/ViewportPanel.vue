<script setup lang="ts">
import { useViewportShortcuts } from '@/composables/useViewportShortcuts'
import type { UseViewportReturn } from '@/composables/useViewport'
import SidebarSection from './SidebarSection.vue'
import SidebarButton from './SidebarButton.vue'

/**
 * 视口控制面板（Sidebar 版）：缩放·平移 + 旋转 两个 section。
 * viewport 由 View 层持有，通过 provide/inject 传入 Sidebar 后再传给此组件。
 */

interface Props {
  viewport: UseViewportReturn
  collapsed: Record<'viewport' | 'rotation', boolean>
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'toggle-section': [key: 'viewport' | 'rotation'] }>()

useViewportShortcuts({
  zoomIn: props.viewport.zoomIn,
  zoomOut: props.viewport.zoomOut,
  resetZoom: props.viewport.resetZoom,
  setZoom: props.viewport.setZoom,
  moveUp: props.viewport.moveUp,
  moveDown: props.viewport.moveDown,
  moveLeft: props.viewport.moveLeft,
  moveRight: props.viewport.moveRight,
  resetOffset: props.viewport.resetOffset,
  toggleRotationDirection: props.viewport.toggleRotationDirection,
  rotateLeft: props.viewport.rotateLeft,
  rotateRight: props.viewport.rotateRight,
  resetRotationAngle: props.viewport.resetRotationAngle
})
</script>

<template>
  <SidebarSection
    title="缩放 · 平移"
    :collapsed="collapsed.viewport"
    @toggle="emit('toggle-section', 'viewport')"
  >
    <div class="numeric">{{ Math.round(viewport.zoom.value * 100) }}%</div>

    <div class="row">
      <SidebarButton key-hint="-" title="- 键" @click="viewport.zoomOut()">−</SidebarButton>
      <SidebarButton key-hint="0" title="0 键" @click="viewport.resetZoom()">重置</SidebarButton>
      <SidebarButton key-hint="+" title="+ 键" @click="viewport.zoomIn()">+</SidebarButton>
    </div>

    <div class="presets">
      <SidebarButton size="xs" key-hint="5" @click="viewport.setZoom(0.5)">50%</SidebarButton>
      <SidebarButton size="xs" key-hint="6" @click="viewport.setZoom(0.75)">75%</SidebarButton>
      <SidebarButton size="xs" key-hint="7" @click="viewport.setZoom(1)">100%</SidebarButton>
      <SidebarButton size="xs" key-hint="8" @click="viewport.setZoom(1.25)">125%</SidebarButton>
      <SidebarButton size="xs" key-hint="9" @click="viewport.setZoom(1.5)">150%</SidebarButton>
      <SidebarButton size="xs" @click="viewport.setZoom(2)">200%</SidebarButton>
      <SidebarButton size="xs" @click="viewport.setZoom(3)">300%</SidebarButton>
      <SidebarButton size="xs" @click="viewport.setZoom(5)">500%</SidebarButton>
      <SidebarButton size="xs" @click="viewport.setZoom(8)">800%</SidebarButton>
    </div>

    <p class="hint">滚轮缩放 · 双击放大 · 中键/Alt+拖拽平移</p>

    <div class="divider" />

    <div class="coord">
      <span class="numeric numeric--sm">
        X: {{ viewport.offsetX.value }} &nbsp; Y: {{ viewport.offsetY.value }}
      </span>
      <SidebarButton size="xs" key-hint="Del" title="Delete 键" @click="viewport.resetOffset()">
        居中
      </SidebarButton>
    </div>

    <div class="cross">
      <div class="row">
        <SidebarButton key-hint="↑" title="↑" @click="viewport.moveUp()">↑</SidebarButton>
      </div>
      <div class="row">
        <SidebarButton key-hint="←" title="←" @click="viewport.moveLeft()">←</SidebarButton>
        <SidebarButton key-hint="Del" title="Delete" @click="viewport.resetOffset()">重置</SidebarButton>
        <SidebarButton key-hint="→" title="→" @click="viewport.moveRight()">→</SidebarButton>
      </div>
      <div class="row">
        <SidebarButton key-hint="↓" title="↓" @click="viewport.moveDown()">↓</SidebarButton>
      </div>
    </div>
  </SidebarSection>

  <SidebarSection
    title="旋转"
    :collapsed="collapsed.rotation"
    @toggle="emit('toggle-section', 'rotation')"
  >
    <div class="numeric numeric--sm">
      方向：{{ viewport.rotationDirection.value === 'clockwise' ? '顺时针' : '逆时针' }}
    </div>
    <div class="row">
      <SidebarButton
        :active="viewport.rotationDirection.value === 'clockwise'"
        @click="viewport.setRotationDirection('clockwise')"
      >
        ↻ 顺
      </SidebarButton>
      <SidebarButton
        :active="viewport.rotationDirection.value === 'counterclockwise'"
        key-hint="C"
        title="C 切换"
        @click="viewport.setRotationDirection('counterclockwise')"
      >
        ↺ 逆
      </SidebarButton>
    </div>

    <div class="divider" />

    <div class="numeric numeric--sm">角度：{{ viewport.rotationAngle.value }}°</div>
    <div class="row">
      <SidebarButton key-hint="Q" title="Q 键" @click="viewport.rotateLeft()">
        ↺ -90°
      </SidebarButton>
      <SidebarButton
        variant="highlight"
        key-hint="W"
        title="W 键"
        @click="viewport.resetRotationAngle()"
      >
        重置
      </SidebarButton>
      <SidebarButton key-hint="E" title="E 键" @click="viewport.rotateRight()">
        ↻ +90°
      </SidebarButton>
    </div>
  </SidebarSection>
</template>

<style scoped>
.numeric {
  font-size: 14px;
  font-weight: bold;
  color: #00ff88;
  text-align: center;
  margin-bottom: 6px;
  font-family: 'Courier New', monospace;
}
.numeric--sm {
  font-size: 11px;
}

.row {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}
.row > * {
  flex: 1;
}

.presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.hint {
  margin: 6px 0 0;
  font-size: 9.5px;
  line-height: 1.6;
  color: #666;
  letter-spacing: 0.02em;
}

.coord {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.divider {
  border-top: 1px solid #222;
  margin: 8px 0;
}

.cross {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.cross .row {
  justify-content: center;
}
</style>
