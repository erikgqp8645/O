<script setup lang="ts">
/**
 * 罗盘总览 · 伏羲方图缩略版
 *
 * 与全屏页 SixtyFourGuaView 的中央 8×8 方图同源：
 *   value = 下卦 + 上卦 × 8
 *   行（上卦）自上而下 乾(7)→坤(0)，列（下卦）自左而右 乾(7)→坤(0)
 *
 * 差别只在一处：缩略图里格宽仅约 12px，
 * 「卦符 + 卦名」两行都画会糊成一团 —— 故只画卦符，
 * 并把字号提到接近格宽（42 / 60），让缩略盘上仍能辨出卦象。
 */
import { computed } from 'vue'
import { XIANTIAN_64_GUA } from '@/data/sixtyFourGua'

/** 方图边长（用户单位，与全屏页一致） */
const SQUARE_SIZE = 480
const CELL = SQUARE_SIZE / 8
const HALF = SQUARE_SIZE / 2
/** 卦符字号：格宽 60，留出余量 */
const GLYPH_SIZE = 42

const guaByValue = new Map(XIANTIAN_64_GUA.map((g) => [g.value, g]))

/** 8×8 = 64 格 */
const cells = computed(() => {
  const out: { value: number; unicode: string; cx: number; cy: number }[] = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const upper = 7 - row
      const lower = 7 - col
      const value = lower + upper * 8
      const g = guaByValue.get(value)
      if (!g) continue
      out.push({
        value,
        unicode: g.unicode,
        cx: -HALF + (col + 0.5) * CELL,
        cy: -HALF + (row + 0.5) * CELL
      })
    }
  }
  return out
})

/** 9 横 9 纵分隔线 */
const gridLines = computed(() => {
  const out: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i <= 8; i++) {
    const p = -HALF + i * CELL
    out.push({ x1: -HALF, y1: p, x2: HALF, y2: p })
    out.push({ x1: p, y1: -HALF, x2: p, y2: HALF })
  }
  return out
})
</script>

<template>
  <g class="xiantian-square">
    <line
      v-for="(l, i) in gridLines"
      :key="`grid-${i}`"
      :x1="l.x1"
      :y1="l.y1"
      :x2="l.x2"
      :y2="l.y2"
      stroke="#6b6b6b"
      stroke-width="2"
    />
    <text
      v-for="c in cells"
      :key="`cell-${c.value}`"
      :x="c.cx"
      :y="c.cy"
      fill="#F5E8C8"
      :font-size="GLYPH_SIZE"
      text-anchor="middle"
      dominant-baseline="central"
    >
      {{ c.unicode }}
    </text>
  </g>
</template>
