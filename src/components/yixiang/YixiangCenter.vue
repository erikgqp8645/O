<script setup lang="ts">
/**
 * 中心盘面 —— 显示当前时刻的核心排盘信息
 *
 * 布局约束：整体必须落在中心圆内（半径约为盘面的 24.5%），
 * 因此采用紧凑的上下两段式：四柱横排 + 节气信息竖排。
 */
import { computed } from 'vue'
import type { TimeSnapshot } from '@/utils/yixiang/timeEngine'
import { getXunKong } from '@/utils/yixiang/timeEngine'
import { WUXING_COLOR } from '@/utils/yixiang/palette'
import { BRANCH_ELEMENT, STEM_ELEMENT } from '@/data/yixiang/ganzhi'

const props = defineProps<{
  snapshot: TimeSnapshot
}>()

const pillars = computed(() => {
  const s = props.snapshot
  return [
    { label: '年', gz: s.yearGanzhi, gan: s.pillars.year.gan, zhi: s.pillars.year.zhi },
    { label: '月', gz: s.monthGanzhi, gan: s.pillars.month.gan, zhi: s.pillars.month.zhi },
    { label: '日', gz: s.dayGanzhi, gan: s.pillars.day.gan, zhi: s.pillars.day.zhi },
    { label: '时', gz: s.hourGanzhi, gan: s.pillars.hour.gan, zhi: s.pillars.hour.zhi }
  ]
})

const xun = computed(() => getXunKong(props.snapshot.dayGanzhi))

const stemColor = (g: string) => WUXING_COLOR[STEM_ELEMENT[g] ?? ''] ?? 'var(--ink-2)'
const branchColor = (z: string) => WUXING_COLOR[BRANCH_ELEMENT[z] ?? ''] ?? 'var(--ink-2)'

/** 月相：照亮比例 0-1，弦月用椭圆半宽表达 */
const moon = computed(() => {
  const s = props.snapshot
  const illum = s.moonIllumination
  const r = 15
  // 照亮比例 → 椭圆半宽（0=朔 1=望 0=晦）
  const k = Math.abs(1 - 2 * illum)
  return { r, k, waxing: s.moonPhaseIndex <= 15, illum, name: s.moonPhase }
})
</script>

<template>
  <div class="center-panel">
    <!-- 四柱 -->
    <div class="pillars">
      <div v-for="p in pillars" :key="p.label" class="pillar">
        <div class="p-label">{{ p.label }}</div>
        <div class="p-gz">
          <span class="gan" :style="{ color: stemColor(p.gan) }">{{ p.gan }}</span>
          <span class="zhi" :style="{ color: branchColor(p.zhi) }">{{ p.zhi }}</span>
        </div>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="rule" />

    <!-- 节气 / 候 / 时辰 / 值卦 -->
    <div class="info">
      <div class="row">
        <span class="tag">节气</span>
        <span class="val term">{{ snapshot.jieQi }}</span>
        <span class="tag">物候</span>
        <span class="val">{{ snapshot.houName }}</span>
      </div>
      <div class="row">
        <span class="tag">时辰</span>
        <span class="val">{{ snapshot.shichenName }}</span>
        <span class="tag">值卦</span>
        <span class="val">{{ snapshot.jingFangGuaName }}·{{ snapshot.jingFangYao }}爻</span>
      </div>
    </div>

    <!-- 底部：旬空 + 月相 -->
    <div class="foot">
      <div class="xun">
        {{ xun.xun }}旬 · 空亡 {{ xun.kong.join('') }}
      </div>
      <div class="moon">
        <svg :width="26" :height="26" viewBox="0 0 30 30" class="moon-svg">
          <circle cx="15" cy="15" :r="moon.r" fill="var(--moon-dark)" />
          <path
            :d="`M 15 ${15 - moon.r} A ${moon.r} ${moon.r} 0 0 ${moon.waxing ? 1 : 0} 15 ${15 + moon.r} A ${(
              moon.r * moon.k
            ).toFixed(2)} ${moon.r} 0 0 ${moon.waxing ? 0 : 1} 15 ${15 - moon.r} Z`"
            fill="var(--moon-lit)"
          />
        </svg>
        <span class="moon-name">{{ moon.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.center-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  pointer-events: none;
  text-align: center;
  padding: 6px 10px;
}

.pillars {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  justify-content: center;
}

.p-label {
  font-size: 9px;
  color: var(--ink-3);
  margin-bottom: 1px;
}

.p-gz {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.1;
  font-family: var(--font-heiti);
}

.rule {
  width: 66%;
  height: 1px;
  background: var(--ring-separator);
  opacity: 0.5;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: center;
}

.info .row {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: 9.5px;
  line-height: 1.5;
  white-space: nowrap;
}

.tag {
  color: var(--ink-3);
  font-size: 8.5px;
  letter-spacing: 0.04em;
}

.val {
  color: var(--ink-1);
}

.val.term {
  font-weight: 600;
  color: var(--accent);
  font-size: 11px;
}

.foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.xun {
  font-size: 8.5px;
  color: var(--ink-3);
  white-space: nowrap;
}

.moon {
  display: flex;
  align-items: center;
  gap: 4px;
}

.moon-name {
  font-size: 9px;
  color: var(--ink-2);
}

.moon-svg {
  flex-shrink: 0;
}
</style>
