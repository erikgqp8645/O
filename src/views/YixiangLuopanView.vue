<script setup lang="ts">
/**
 * 易象罗盘 · 罗盘 View（彩色同心环天时盘）
 *
 * ════════════════════════════════════════════════════════════════
 *  由外向内十一层同心环：
 *    周天三百六十度 → 二十八宿分度 → 六十四卦（先天圆图） → 八卦 →
 *    二十四节气 → 十二辟卦（十二消息卦） → 七十二候 →
 *    六十甲子（纳音） → 纳甲六十四卦（京房六日七分） → 十二时辰 → 二十四山
 *
 *  方位：各环统一锚定到同一套方位基准（上南下北、左东右西），
 *    锚点声明在 utils/yixiang/rings.ts 的 RING_ANCHORS，
 *    起始角由 resolveStartAngle() 反解——改环序 / 改格数都不破坏对位。
 *
 *  沿用站内其它罗盘的时间 / 视口契约：
 *    · controlledTime 由 useUrlTime 持有（URL ?t= 双向绑定）
 *    · useLiveClock 每秒推进，实时跟随系统时间；用户接管即退出 live 模式
 *    · useViewport 提供缩放 / 平移 / 旋转，中键或 Alt + 拖拽平移
 *    · provideCompassContext 把 time / viewport 暴露给左侧 Sidebar
 *
 *  视觉：盘面保留易象罗盘自身的「宣纸底 + 朱砂」配色（变量挂在 .container 上，
 *  仅对本页生效，不污染站内其它页面）；页面外壳沿用乙巳观的黑底。
 *
 *  坐标：视口 SVG 为 1200×1200，盘面自身坐标系是 800×800，
 *  靠 scale(1.35) translate(-400,-400) 把盘心归零后交给外层 <g> 定位，
 *  这样缩放 / 旋转都以盘心为轴，与站内其它罗盘一致。
 * ════════════════════════════════════════════════════════════════
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import YixiangDial from '@/components/yixiang/YixiangDial.vue'
import YixiangCenter from '@/components/yixiang/YixiangCenter.vue'
import { useUrlTime } from '@/composables/useUrlTime'
import { useLiveClock } from '@/composables/useLiveClock'
import { useAltDragPan } from '@/composables/useAltDragPan'
import { useViewport } from '@/composables/useViewport'
import { provideCompassContext } from '@/composables/useCompassContext'
import { buildSnapshot, type TimeSnapshot } from '@/utils/yixiang/timeEngine'
import { RING_LAYOUTS, CENTER_RADIUS_RATIO } from '@/utils/yixiang/rings'
import { SOLAR_TERM_MAP } from '@/data/yixiang/solarTerms'

// ─── 时间：唯一真理源 ────────────────────────────────────────
const { controlledTime, hasUrlTime } = useUrlTime()
const { onUserTimeChange } = useLiveClock(controlledTime, { paused: hasUrlTime })

// ─── 视口：缩放 / 平移 / 旋转 ────────────────────────────────
const viewport = useViewport()
const { zoom, offsetX, offsetY, rotationDirection, rotationAngle } = viewport
const svgRef = ref<SVGSVGElement | null>(null)
const { isDragging, isAltPressed } = useAltDragPan({ svgRef, viewport })

// 暴露 time / viewport 给 CompassLayout 里的 <CompassSidebar>
provideCompassContext({ time: controlledTime, viewport, onUserTimeChange })

// ─── 盘面快照 ────────────────────────────────────────────────
const snapshot = computed<TimeSnapshot>(() => buildSnapshot(controlledTime.value))

// ─── 盘面分层开关（Teleport 到侧栏「视图选项」）────────────────
const visibleRings = ref<string[]>(RING_LAYOUTS.map((r) => r.key))

function toggleRing(key: string) {
  const next = new Set(visibleRings.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  // 至少保留一层，避免出现空盘面
  if (!next.size) return
  visibleRings.value = RING_LAYOUTS.filter((r) => next.has(r.key)).map((r) => r.key)
}

function resetRings() {
  visibleRings.value = RING_LAYOUTS.map((r) => r.key)
}

const ringLegend = computed(() =>
  RING_LAYOUTS.map((r) => ({ key: r.key, label: r.label, count: r.count }))
)

// ─── 悬停提示 ────────────────────────────────────────────────
const hovered = ref<string | null>(null)

const tipDefault = computed(() => {
  const t = SOLAR_TERM_MAP[snapshot.value.jieQi]
  return t ? `${t.name} · ${t.season} · ${t.element}｜三候：${t.hou.join('、')}` : ''
})

const tipText = computed(() => hovered.value ?? tipDefault.value)

// ─── 中心信息卡定位 ──────────────────────────────────────────
// 中心信息卡是 HTML 覆盖层，需与 SVG 里的中心圆严格对齐：
// 视口等比缩放系数 s = min(w,h) / 1200，圆心随 offset 平移，半径随 zoom 缩放。
const VIEWBOX = 1200
const DIAL_SCALE = 1.35
const PLATE_R = 380

const stageEl = ref<HTMLElement | null>(null)
const stageSize = ref({ w: 0, h: 0 })

let ro: ResizeObserver | undefined
onMounted(() => {
  const el = stageEl.value
  if (!el) return
  const measure = () => {
    stageSize.value = { w: el.clientWidth, h: el.clientHeight }
  }
  measure()
  ro = new ResizeObserver(measure)
  ro.observe(el)
})
onBeforeUnmount(() => ro?.disconnect())

const centerStyle = computed(() => {
  const { w, h } = stageSize.value
  if (!w || !h) return { display: 'none' }
  const s = Math.min(w, h) / VIEWBOX
  const x0 = (w - VIEWBOX * s) / 2
  const y0 = (h - VIEWBOX * s) / 2
  const cx = x0 + (600 + offsetX.value) * s
  const cy = y0 + (600 + offsetY.value) * s
  // 圆心半径不随 zoom 变化，改由 transform: scale() 统一放大，
  // 这样中心信息卡的字号也跟着缩放（与其它罗盘的 SVG 圆心观感一致）
  const r = CENTER_RADIUS_RATIO * PLATE_R * DIAL_SCALE * s
  return {
    left: `${cx - r}px`,
    top: `${cy - r}px`,
    width: `${r * 2}px`,
    height: `${r * 2}px`,
    transform: `scale(${zoom.value})`
  }
})
</script>

<template>
  <div ref="stageEl" class="container">
    <!-- ═══ 侧栏专属工具位：盘面分层开关 ═══ -->
    <Teleport to="#sidebar-view-tools">
      <div class="view-tool-group">
        <label class="view-tool-label">盘面分层</label>
        <label v-for="l in ringLegend" :key="l.key" class="ring-toggle">
          <input
            type="checkbox"
            :checked="visibleRings.includes(l.key)"
            @change="toggleRing(l.key)"
          />
          <span class="ring-name">{{ l.label }}</span>
          <span class="ring-count">{{ l.count }}</span>
        </label>
        <button class="ring-reset" type="button" @click="resetRings">全开</button>
      </div>
    </Teleport>

    <!-- ═══ 盘面 ═══ -->
    <svg
      ref="svgRef"
      class="compass-svg"
      :class="{ 'alt-hover': isAltPressed && !isDragging, 'alt-dragging': isDragging }"
      viewBox="0 0 1200 1200"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="易象罗盘"
    >
      <g
        :transform="`translate(${600 + offsetX}, ${600 + offsetY}) scale(${zoom}) rotate(${rotationAngle})`"
      >
        <g transform="scale(1.35) translate(-400, -400)">
          <YixiangDial
            :snapshot="snapshot"
            :visible-rings="visibleRings"
            :direction="rotationDirection"
            v-model:hovered="hovered"
          />
        </g>
      </g>
    </svg>

    <!-- ═══ 中心信息卡（HTML 覆盖层，与中心圆对齐）═══ -->
    <div class="center-overlay" :style="centerStyle">
      <YixiangCenter :snapshot="snapshot" />
    </div>

    <!-- ═══ 悬停提示 ═══ -->
    <div class="tip" :class="{ dim: hovered }">{{ tipText }}</div>
  </div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════
   易象罗盘配色（宣纸底 + 朱砂）
   —— 变量挂在 .container 上，只对本页生效；不写入 :root，避免影响站内其它页面
   ════════════════════════════════════════════════════════════════ */
.container {
  /* ── 底色与纸面 ── */
  --plate-bg: #f4efe4;
  --plate-edge: #2b2620;
  --center-bg: #efe7d6;
  --center-glow: #fbf7ee;

  /* ── 墨色层级 ── */
  --ink-1: #241f1a;
  --ink-2: #4a423a;
  --ink-3: #857a6c;

  /* ── 强调色（朱砂） ── */
  --accent: #b23a2c;
  --accent-contrast: #fdfaf4;
  --pointer-color: #b23a2c;

  /* ── 单元格 ── */
  --cell-ink: #1d1813;
  --cell-stroke: #2b2620;
  --cell-active-stroke: #8f2c20;
  --ring-separator: #6b6153;

  /* ── 五行本色 ── */
  --wx-wood: #4a7c59;
  --wx-fire: #b8452f;
  --wx-earth: #b08d3f;
  --wx-metal: #cfc3a6;
  --wx-water: #2f5570;

  /* ── 八卦主色（按五行，明度作区分） ── */
  --gua-qian: #d8c99a; /* 乾 金·阳 */
  --gua-dui: #e4dcc4; /* 兑 金·阴 */
  --gua-li: #c25640; /* 离 火 */
  --gua-zhen: #6b9d72; /* 震 木·阳 */
  --gua-xun: #8fb389; /* 巽 木·阴 */
  --gua-kan: #4a7896; /* 坎 水 */
  --gua-gen: #a89a6e; /* 艮 土·阳 */
  --gua-kun: #bfa87c; /* 坤 土·阴 */

  /* ── 季节色 ── */
  --season-spring: #7ba05b;
  --season-summer: #c25640;
  --season-late-summer: #c39a4a;
  --season-autumn: #c9b98c;
  --season-winter: #6d8fa8;

  /* ── 京房八宫色 ── */
  --palace-qian: #d8c99a;
  --palace-kan: #4a7896;
  --palace-gen: #a89a6e;
  --palace-zhen: #6b9d72;
  --palace-xun: #8fb389;
  --palace-li: #c25640;
  --palace-kun: #bfa87c;
  --palace-dui: #e4dcc4;

  /* ── 月相 ── */
  --moon-dark: #3a342c;
  --moon-lit: #f0e2bd;

  /* ── 字体 ── */
  --font-heiti: 'Songti SC', 'STSong', 'SimSun', 'Noto Serif CJK SC', serif;

  width: 100%;
  height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

svg {
  display: block;
}

/* SVG 填满容器，viewBox + preserveAspectRatio 自动等比居中 */
.compass-svg {
  width: 100%;
  height: 100%;
}

.compass-svg.alt-hover {
  cursor: grab;
}

.compass-svg.alt-dragging {
  cursor: grabbing;
}

/* 中心信息卡容器：位置由脚本按视口缩放计算 */
.center-overlay {
  position: absolute;
  pointer-events: none;
  transform-origin: center center;
}

/* 悬停提示：位于视口底部（黑底上用浅色字） */
.tip {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  max-width: 80vw;
  font-size: 12px;
  color: #b9b3a6;
  text-align: center;
  pointer-events: none;
  transition: color 0.2s ease;
}

.tip.dim {
  color: #ffcc00;
}

/* ─── Teleport 到 Sidebar 的盘面分层开关 ─── */
.view-tool-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.view-tool-label {
  font-size: 10px;
  color: #888;
  letter-spacing: 1px;
  padding-left: 2px;
}

.ring-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #bbb;
  cursor: pointer;
}

.ring-toggle input {
  accent-color: #ffcc00;
  width: 12px;
  height: 12px;
  margin: 0;
  flex: 0 0 auto;
  cursor: pointer;
}

.ring-name {
  flex: 1;
}

.ring-count {
  font-size: 10px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.ring-reset {
  margin-top: 2px;
  padding: 3px 8px;
  font-size: 10px;
  letter-spacing: 1px;
  color: #bbb;
  background: transparent;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.ring-reset:hover {
  color: #ffcc00;
  border-color: #ffcc00;
}
</style>
