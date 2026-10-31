<script setup lang="ts">
/**
 * 罗盘总览 · 汇总页
 *
 * ════════════════════════════════════════════════════════════════
 *  把站内 13 个罗盘并排陈列在一页上，每枚一枚**实况缩略盘**，
 *  点击任一枚进入对应全屏罗盘。
 *
 *  🔑 三条关键设计
 *  ────────────────────────────────────────────────────────────
 *  ① 不复用各罗盘的 View
 *     13 个 View 各自绑定全屏罗盘专属副作用（Teleport 抢挂载点、
 *     独立秒级时钟、滚轮劫持、定位授权、传感器遮罩、模块级单例），
 *     并排挂载必然互相打架。缩略盘改用底层环组件另建一套小尺寸盘面，
 *     同样的 RingStack + 同样的环组件 + 同样的坐标系 ——
 *     环层比例与锚点方位与全屏盘严格一致。
 *
 *  ② 单一时间源 + 时间分桶
 *     全页共用一个 controlledTime（1Hz 实时时钟，支持 URL ?t=）。
 *     但 13 枚盘若都按秒重算，苏州星图 / 会合连线会被放大 13 倍。
 *     故按「盘面实际变化粒度」把时间分桶：
 *       · 六十甲子六环 → 秒（唯一按秒变化的盘，秒柱逐秒跳动）
 *       · 其余 12 枚   → 分（多数盘面的变化粒度本就是分/时/日）
 *     分桶先取数字 key 再还原 Date，保证同一桶内引用稳定，
 *     下游 computed 命中缓存（见 utils/overview/thumbGeometry.ts）。
 *
 *  ③ 可见性懒渲染
 *     重计算的盘（苏州石刻图 / 会合周期 / 七曜入宿）滚到视口附近
 *     才挂载，挂载后不再卸载，避免来回滚动反复重算。
 *
 *  页面布局用 `layout: page`（VitePress 默认主题，含导航与页脚、可滚动），
 *  而不是全屏罗盘用的 `layout: compass`（position: fixed、不可滚动）。
 * ════════════════════════════════════════════════════════════════
 */
import { computed, provide, ref } from 'vue'
import { withBase } from 'vitepress'

import CompassThumb from '@/components/overview/CompassThumb.vue'
import YixiangThumb from '@/components/overview/YixiangThumb.vue'
import LazyThumb from '@/components/overview/LazyThumb.vue'
import XiantianSquareThumb from '@/components/overview/XiantianSquareThumb.vue'
import {
  buildThumbSpecs,
  SUZHOU_OBSERVER_LAT,
  SUZHOU_OBSERVER_LON,
  THUMB_OBSERVER_LAT,
  THUMB_OBSERVER_LON
} from '@/components/overview/thumbSpecs'

import BeidouCenter from '@/components/centers/guan-dou/BeidouCenter.vue'
import GuaRelationCenter from '@/components/centers/GuaRelationCenter.vue'
import WorldMapCenter from '@/components/centers/suzhou-stellar-map/WorldMapCenter.vue'
import SuzhouSkyMap from '@/components/centers/suzhou-stellar-map/SuzhouSkyMap.vue'
import ConjunctionCanvas from '@/components/centers/conjunction-cycles/ConjunctionCanvas.vue'

import { useLiveClock } from '@/composables/useLiveClock'
import { provideDayGridContext } from '@/composables/useDayGridContext'
import {
  useGuaRelationInteraction,
  GUA_RELATION_KEY
} from '@/composables/useGuaRelationInteraction'
import {
  timeBucketKey,
  timeFromBucketKey,
  type TimePrecision
} from '@/utils/overview/thumbGeometry'
import { buildSnapshot } from '@/utils/yixiang/timeEngine'
import { PLANET_PAIRS, pairKey } from '@/utils/conjunctions'
import type { GuaRelationType } from '@/utils/guaRelations'

// ─── ① 时间：唯一真理源 ────────────────────────────────────────
/**
 * ⚠️ 汇总页**刻意不用** `useUrlTime`。
 *
 * `useUrlTime` 会把当前时刻（分钟精度）写回 URL 的 `?t=`，并在下次加载时
 * 据此**冻结**时钟（其它罗盘页靠侧栏「回到实时」解开，本仓目前并无该按钮）。
 * 汇总页是「实况缩略」的陈列面，且**没有侧栏** —— 一旦冻结就是死盘、
 * 用户无从恢复。故此页自带实时时钟，不与 URL 双向绑定：
 *   · 永远实况
 *   · URL 保持干净（/O/compass/overview）
 * `?t=` 属于单个罗盘页的「时光机」语义，不外溢到汇总页。
 */
const controlledTime = ref<Date>(new Date())
useLiveClock(controlledTime)

/**
 * 分桶时间：先取数字 key（每分钟才变一次），再由 key 还原 Date。
 * 这样同一分钟内 minuteTime 的**引用不变** → 下游 computed 命中缓存。
 */
const secondBucket = computed(() => timeBucketKey(controlledTime.value, 'second'))
const minuteBucket = computed(() => timeBucketKey(controlledTime.value, 'minute'))
const secondTime = computed(() => timeFromBucketKey(secondBucket.value, 'second'))
const minuteTime = computed(() => timeFromBucketKey(minuteBucket.value, 'minute'))

/** 供规格表按粒度取时间 */
function timeOf(precision: TimePrecision) {
  return precision === 'second' ? secondTime : minuteTime
}

// ─── ② 共享上下文 ──────────────────────────────────────────────
/**
 * 日粒度共享年历上下文 —— 奇门盘与五运六气盘的环依赖它
 * （未 provide 时 useDayGridContext() 会直接抛错）
 */
provideDayGridContext(controlledTime)

/** 卦关系盘的文字环 / 圆心箭头需要注入共享交互状态 */
const relationInteraction = useGuaRelationInteraction()
provide(GUA_RELATION_KEY, relationInteraction)

// ─── ③ 规格表 ──────────────────────────────────────────────────
/** 规格表只在 setup 期构建一次：环配置不随时间变化，时间以 ref 形式注入 */
const specs = buildThumbSpecs(timeOf)

/** 易象罗盘快照（分钟粒度） */
const yixiangSnapshot = computed(() => buildSnapshot(minuteTime.value))

/** 会合周期盘：默认全 10 对行星开启 */
const conjunctionPairs = new Set(PLANET_PAIRS.map(pairKey))

/** 卦关系盘圆心：默认全局模式 + 飞伏，无聚焦、无动爻 */
const emptyRelationTypes = new Set<GuaRelationType>()
const emptyMovingLines = new Set<number>()

/** 页头显示的当前时刻（分钟粒度，与缩略盘一致） */
const clockText = computed(() => {
  const d = minuteTime.value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})
</script>

<template>
  <div class="compass-overview">
    <header class="overview-header">
      <a class="back-link" :href="withBase('/compass/')">← 罗盘一览</a>
      <h1 class="overview-title">罗盘总览</h1>
      <p class="overview-subtitle">十三个罗盘 · 同页实况 · 点击任一枚进入全屏盘</p>
      <p class="overview-clock">当前时刻 {{ clockText }}</p>
    </header>

    <div class="overview-grid">
      <a
        v-for="spec in specs"
        :key="spec.id"
        class="thumb-card"
        :href="withBase(`/compass/${spec.id}`)"
        :aria-label="`${spec.name} —— ${spec.summary}`"
      >
        <div class="thumb-frame" :class="{ 'thumb-frame--yixiang': spec.kind === 'yixiang' }">
          <LazyThumb>
            <!-- 标准同心环罗盘 -->
            <CompassThumb
              v-if="spec.kind === 'ringstack'"
              :outer-radius="spec.outerRadius"
              :rings="spec.rings"
              :gap="spec.gap"
              rotation-direction="clockwise"
            >
              <template #center="{ innerRadius }">
                <!-- 观斗盘：北斗七星 + 紫微垣 -->
                <BeidouCenter
                  v-if="spec.center === 'beidou'"
                  :radius="innerRadius"
                  :time="minuteTime"
                  rotation-direction="clockwise"
                  :observer-lat="THUMB_OBSERVER_LAT"
                  :observer-lon="THUMB_OBSERVER_LON"
                  location-label="洛阳"
                />
                <!-- 卦关系盘：有向箭头 -->
                <GuaRelationCenter
                  v-else-if="spec.center === 'gua-relation'"
                  :radius="innerRadius"
                  rotation-direction="clockwise"
                  :start-degree="0"
                  layout="jingfang"
                  relation-type="feifu"
                  mode="global"
                  :focused-value="null"
                  :focus-relation-types="emptyRelationTypes"
                  :moving-lines="emptyMovingLines"
                />
                <!-- 先天六十四卦盘：中央伏羲方图（缩略版：只画卦符） -->
                <XiantianSquareThumb v-else-if="spec.center === 'xiantian-square'" />
                <!-- 二十四山风水盘：圆心方向指示器（缩略盘无传感器，取固定北向） -->
                <g v-else-if="spec.center === 'fengshui'" class="fengshui-indicator">
                  <circle cx="0" cy="0" :r="innerRadius * 0.85" fill="none" stroke="#5a5a5a" stroke-width="2" />
                  <line x1="0" :y1="-innerRadius * 0.7" x2="0" :y2="innerRadius * 0.7" stroke="#6a6a6a" stroke-width="2" />
                  <line :x1="-innerRadius * 0.7" y1="0" :x2="innerRadius * 0.7" y2="0" stroke="#6a6a6a" stroke-width="2" />
                  <circle cx="0" cy="0" r="9" fill="#C62828" />
                </g>
                <!-- 苏州石刻天文图：世界地图底图 + 三规圆星图 -->
                <template v-else-if="spec.center === 'suzhou'">
                  <WorldMapCenter
                    :radius="innerRadius"
                    :time="minuteTime"
                    rotation-direction="clockwise"
                    :observer-lat="SUZHOU_OBSERVER_LAT"
                    :observer-lon="SUZHOU_OBSERVER_LON"
                    orientation="fixed-ground"
                    :show-meridian="true"
                  />
                  <SuzhouSkyMap
                    :radius="innerRadius"
                    :time="minuteTime"
                    rotation-direction="clockwise"
                    :observer-lat="SUZHOU_OBSERVER_LAT"
                    :observer-lon="SUZHOU_OBSERVER_LON"
                    orientation="fixed-ground"
                    :show-horizon="true"
                    detail-mode="classic"
                    :canvas-scale="1"
                  />
                </template>
                <!-- 会合周期盘：会合点与连线 -->
                <ConjunctionCanvas
                  v-else-if="spec.center === 'conjunction'"
                  :time="minuteTime"
                  :radius="innerRadius"
                  rotation-direction="clockwise"
                  :window-years="200"
                  :enabled-pairs="conjunctionPairs"
                  :show-points="true"
                  :show-lines="true"
                  :show-future="true"
                  :show-past="true"
                  future-color="#4a9eff"
                  past-color="#ff5a5a"
                />
              </template>
            </CompassThumb>
            <!-- 易象罗盘：独立坐标系 + 宣纸朱砂配色 -->
            <YixiangThumb v-else :snapshot="yixiangSnapshot" />
          </LazyThumb>
        </div>

        <div class="thumb-meta">
          <span class="thumb-category">{{ spec.category }}</span>
          <h2 class="thumb-name">{{ spec.name }}</h2>
          <p class="thumb-summary">{{ spec.summary }}</p>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.compass-overview {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 96px;
  box-sizing: border-box;
}

/* ── 页头 ─────────────────────────────────────────────────── */
.overview-header {
  text-align: center;
  margin-bottom: 40px;
}

.back-link {
  display: inline-block;
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  letter-spacing: 0.05em;
  margin-bottom: 20px;
}

.back-link:hover {
  color: var(--ysg-gold-600, #c8a2e8);
}

.overview-title {
  font-size: 30px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin: 0 0 10px;
  letter-spacing: 0.14em;
}

.overview-subtitle {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  letter-spacing: 0.08em;
}

.overview-clock {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin: 0;
  font-family: 'Consolas', 'Menlo', monospace;
  letter-spacing: 0.05em;
}

/* ── 缩略盘网格 ───────────────────────────────────────────── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

.thumb-card {
  display: block;
  text-decoration: none;
  color: inherit;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 18px 18px 20px;
  transition:
    border-color 0.2s,
    transform 0.2s,
    background-color 0.2s,
    box-shadow 0.2s;
}

.thumb-card:hover {
  border-color: var(--ysg-gold-600, #c8a2e8);
  background-color: var(--vp-c-bg-elv);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

/* 圆盘底衬：与全屏罗盘一致的黑底 */
.thumb-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: #05060a;
  overflow: hidden;
  margin-bottom: 16px;
}

.thumb-meta {
  text-align: center;
}

.thumb-category {
  display: inline-block;
  font-size: 11px;
  color: var(--ysg-gold-600, #c8a2e8);
  border: 1px solid var(--ysg-gold-600, #c8a2e8);
  border-radius: 4px;
  padding: 1px 7px;
  margin-bottom: 9px;
}

.thumb-name {
  font-size: 17px;
  font-weight: 400;
  color: var(--vp-c-text-1);
  margin: 0 0 6px;
}

.thumb-summary {
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0;
}

/* ══════════════════════════════════════════════════════════════
   易象罗盘缩略盘的宣纸底 + 朱砂配色
   —— 变量只挂 .thumb-frame--yixiang，不写入 :root，
      不影响站内其它页面（与易象罗盘全屏页 .container 的变量表保持一致）
   ══════════════════════════════════════════════════════════════ */
.thumb-frame--yixiang {
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
  --gua-qian: #d8c99a;
  --gua-dui: #e4dcc4;
  --gua-li: #c25640;
  --gua-zhen: #6b9d72;
  --gua-xun: #8fb389;
  --gua-kan: #4a7896;
  --gua-gen: #a89a6e;
  --gua-kun: #bfa87c;

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

  background: #efe7d6;
}
</style>
