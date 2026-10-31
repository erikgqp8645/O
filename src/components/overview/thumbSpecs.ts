/**
 * 罗盘总览 · 13 枚缩略盘规格
 *
 * ════════════════════════════════════════════════════════════════
 *  这份「规格表」是各全屏罗盘环配置的**缩略版镜像**：
 *  同一批环组件、同一套 props、同一套坐标系，
 *  只是把 viewBox 缩小后并排陈列。
 *
 *  🔑 维护纪律
 *  ────────────────────────────────────────────────────────────
 *  改了某个全屏盘的环配置，这里要同步改一次 ——
 *  否则缩略图会和全屏盘对不上（环数 / 环序 / 锚点）。
 *  spec.spec.ts 里有「每个罗盘都必须有缩略规格」的一致性断言兜底。
 *
 *  ⚠️ 旋转方向说明
 *  ────────────────────────────────────────────────────────────
 *  RingStack 的模板里 `v-bind="ring.extraProps"` 排在
 *  `:rotation-direction` **之前**，因此 RingStack 注入的方向会覆盖
 *  环 props 里自带的 rotationDirection。
 *  这与各全屏盘的行为一致（View 同样只给 RingStack 一个方向），
 *  所以这里**不再**给环单独写 rotationDirection，避免写出无效配置。
 * ════════════════════════════════════════════════════════════════
 */
import { markRaw, type Ref } from 'vue'

import SixtyJiaziRing from '@/components/rings/SixtyJiaziRing.vue'
import StemsRing from '@/components/rings/StemsRing.vue'
import BranchesRing from '@/components/rings/BranchesRing.vue'
import GuaRing from '@/components/rings/GuaRing.vue'
import JingFangEightPalaceRing from '@/components/rings/JingFangEightPalaceRing.vue'
import ShiYingRing from '@/components/rings/ShiYingRing.vue'
import SolarTermsPointRing from '@/components/rings/SolarTermsPointRing.vue'
import DayScaleRing from '@/components/rings/DayScaleRing.vue'
import LiuRiQiFenScaleRing from '@/components/rings/jingfang/LiuRiQiFenScaleRing.vue'
import JingFangGuaRing from '@/components/rings/JingFangGuaRing.vue'
import NajiaRing from '@/components/rings/NajiaRing.vue'
import DegreeScale from '@/components/rings/DegreeScale.vue'
import MansionDegreeRing from '@/components/rings/MansionDegreeRing.vue'
import SevenLuminariesRing from '@/components/rings/SevenLuminariesRing.vue'
import ConstellationsRing from '@/components/rings/ConstellationsRing.vue'
import SolarTermsSkyRing from '@/components/rings/planet-mansion/SolarTermsSkyRing.vue'
import SiXiangRing from '@/components/rings/SiXiangRing.vue'
import SkyChart from '@/components/rings/planet-mansion/SkyChart.vue'
import MoonPhaseRing from '@/components/rings/tropical-year/MoonPhaseRing.vue'
import LunarMonthsRing from '@/components/rings/LunarMonthsRing.vue'
import GuanDouSolarTermsRing from '@/components/rings/guan-dou/GuanDouSolarTermsRing.vue'
import MonthGeneralRing from '@/components/rings/guan-dou/MonthGeneralRing.vue'
import MonthEstablishRing from '@/components/rings/guan-dou/MonthEstablishRing.vue'
import HourShichenRing from '@/components/rings/guan-dou/HourShichenRing.vue'
import SunDiurnalRing from '@/components/rings/guan-dou/SunDiurnalRing.vue'
import GuaRelationTextRing from '@/components/rings/GuaRelationTextRing.vue'
import TwentyFourMountainsRing from '@/components/rings/fengshui24/TwentyFourMountainsRing.vue'
import LiuJiaziDayRing from '@/components/rings/qi-men-dun-jia/LiuJiaziDayRing.vue'
import QiMenSolarTermsRing from '@/components/rings/qi-men-dun-jia/QiMenSolarTermsRing.vue'
import LunarDateRing from '@/components/rings/qi-men-dun-jia/LunarDateRing.vue'
import SanYuanRing from '@/components/rings/qi-men-dun-jia/SanYuanRing.vue'
import JuShuRing from '@/components/rings/qi-men-dun-jia/JuShuRing.vue'
import WuYunLiuQiRing from '@/components/rings/wuyun-liuqi/WuYunLiuQiRing.vue'
import KeQiRing from '@/components/rings/wuyun-liuqi/KeQiRing.vue'
import MainYunRing from '@/components/rings/wuyun-liuqi/MainYunRing.vue'
import KeYunRing from '@/components/rings/wuyun-liuqi/KeYunRing.vue'
import BranchZodiacRing from '@/components/rings/conjunction-cycles/BranchZodiacRing.vue'

import type { TimePrecision } from '@/utils/overview/thumbGeometry'
import type { ThumbRingConfig, ThumbSpec } from './thumbTypes'

/** 时间源工厂：按盘面实际变化粒度给出对应的时间 ref */
export type ThumbTimeSource = (precision: TimePrecision) => Ref<Date>

/** 六十甲子六环的柱子定义（与 LiushiJiaziView 一致） */
const JIAZI_PILLARS: readonly {
  id: string
  thickness: number
  color: string
  borderWidth: number
  vertical: boolean
}[] = [
  { id: 'year', thickness: 24, color: '#9C8420', borderWidth: 1.8, vertical: false },
  { id: 'month', thickness: 24, color: '#9C6B22', borderWidth: 1.8, vertical: false },
  { id: 'day', thickness: 24, color: '#9C4848', borderWidth: 1, vertical: false },
  { id: 'hour', thickness: 24, color: '#357E78', borderWidth: 1.8, vertical: false },
  // 分、秒柱半径小、每格仅 6°，双字横排必重叠 → 竖排省切向空间
  { id: 'minute', thickness: 28, color: '#2F7286', borderWidth: 1, vertical: true },
  { id: 'second', thickness: 28, color: '#5E4A8A', borderWidth: 1, vertical: true }
]

/** 六十甲子环与十二时辰环共享参考点（屏幕正上方） */
const JIAZI_START_DEGREE = -90

/** 奇门 / 五运六气系共享的日粒度起点（屏幕正上方） */
const DAY_GRID_START_DEGREE = -90

/** 观测点默认值（缩略盘不请求浏览器定位，统一用洛阳） */
export const THUMB_OBSERVER_LAT = 34.65
export const THUMB_OBSERVER_LON = 112.45

/** 苏州石刻天文图底本观测点（北宋汴京） */
export const SUZHOU_OBSERVER_LAT = 35
export const SUZHOU_OBSERVER_LON = 116.4

/** 六十甲子六环：年→秒，每柱一环；月 / 日 / 时三柱各配一对天干环 + 地支环 */
function buildLiushiJiaziRings(time: Ref<Date>): ThumbRingConfig[] {
  const rings: ThumbRingConfig[] = []
  for (const p of JIAZI_PILLARS) {
    rings.push({
      component: markRaw(SixtyJiaziRing),
      thickness: p.thickness,
      props: {
        time,
        pillarId: p.id,
        verticalTwoChar: p.vertical === true,
        circleColor: p.color,
        circleWidth: p.borderWidth,
        startDegree: JIAZI_START_DEGREE
      }
    })
    if (p.id === 'month' || p.id === 'day' || p.id === 'hour') {
      for (const C of [StemsRing, BranchesRing]) {
        rings.push({
          component: markRaw(C),
          thickness: 28,
          gapBefore: 0,
          props: {
            time,
            pillarId: p.id,
            circleColor: p.color,
            circleWidth: Math.max(0.8, p.borderWidth - 0.8),
            startDegree: JIAZI_START_DEGREE
          }
        })
      }
    }
  }
  return rings
}

/**
 * 构建 13 枚缩略盘的规格表
 *
 * @param timeOf 按粒度取时间 ref 的工厂（秒 / 分）
 */
export function buildThumbSpecs(timeOf: ThumbTimeSource): ThumbSpec[] {
  const second = timeOf('second')
  const minute = timeOf('minute')

  return [
    // ── 1. 六十甲子六环 ──────────────────────────────────────
    {
      id: 'liushi-jiazi',
      name: '六十甲子六环',
      category: '干支历',
      summary: '年→秒六柱干支同步环',
      kind: 'ringstack',
      outerRadius: 560,
      gap: 2,
      rings: buildLiushiJiaziRings(second),
      center: 'none',
      // 唯一按秒变化的盘（秒柱）
      precision: 'second'
    },

    // ── 2. 先天六十四卦盘 ────────────────────────────────────
    {
      id: 'sixty-four-gua',
      name: '先天六十四卦盘',
      category: '易学',
      summary: '伏羲圆图 · 卦符卦名',
      kind: 'ringstack',
      outerRadius: 560,
      gap: 3,
      rings: [
        { component: markRaw(GuaRing), thickness: 42, props: { showLines: false } },
        { component: markRaw(JingFangEightPalaceRing), thickness: 60 },
        { component: markRaw(ShiYingRing), thickness: 26 }
      ],
      center: 'xiantian-square',
      precision: 'minute'
    },

    // ── 3. 京房六日七分纳甲盘 ────────────────────────────────
    {
      id: 'jingfang',
      name: '京房六日七分纳甲盘',
      category: '易学',
      summary: '六日七分 · 360 爻位',
      kind: 'ringstack',
      outerRadius: 580,
      gap: 3,
      rings: [
        {
          component: markRaw(SolarTermsPointRing),
          thickness: 16,
          props: { time: minute, originMode: 'winterSolstice' }
        },
        {
          component: markRaw(DayScaleRing),
          thickness: 36,
          props: { time: minute, originMode: 'winterSolstice', showGanzhi: true }
        },
        { component: markRaw(LiuRiQiFenScaleRing), thickness: 18, props: { time: minute } },
        { component: markRaw(JingFangGuaRing), thickness: 110, props: { time: minute } },
        { component: markRaw(NajiaRing), thickness: 80, props: { time: minute } }
      ],
      center: 'none',
      precision: 'minute'
    },

    // ── 4. 七曜入宿天象盘 ────────────────────────────────────
    {
      id: 'planet-mansion',
      name: '七曜入宿天象盘',
      category: '天文',
      summary: '七曜入宿 · 盖天星图',
      kind: 'ringstack',
      outerRadius: 580,
      gap: 2,
      rings: [
        {
          component: markRaw(DegreeScale),
          thickness: 22,
          props: {
            scaleInterval: 1,
            labelInterval: 5,
            tickDirection: 'outward',
            startDegree: 0,
            showSectors: false,
            showLabels: true,
            labelColor: '#666666',
            circleColor: '#555555'
          }
        },
        {
          component: markRaw(MansionDegreeRing),
          thickness: 28,
          gapBefore: 6,
          props: { time: minute }
        },
        {
          component: markRaw(SevenLuminariesRing),
          thickness: 30,
          gapBefore: 2,
          props: { time: minute }
        },
        {
          component: markRaw(ConstellationsRing),
          thickness: 40,
          gapBefore: 6,
          props: { time: minute }
        },
        {
          component: markRaw(SolarTermsSkyRing),
          thickness: 30,
          gapBefore: 8,
          props: { time: minute }
        },
        {
          component: markRaw(SiXiangRing),
          thickness: 34,
          gapBefore: 4,
          props: { time: minute }
        },
        {
          component: markRaw(SkyChart),
          // thickness 省略 → 自动填满剩余中心空间
          gapBefore: 8,
          props: {
            time: minute,
            showEquator: true,
            showEcliptic: true,
            showWhiteWay: true,
            showMansions: false,
            showNodes: true,
            showCenters: true,
            showHelioOrbits: true
          }
        }
      ],
      center: 'none',
      precision: 'minute'
    },

    // ── 5. 回归年闰月盘 ──────────────────────────────────────
    {
      id: 'tropical-year',
      name: '回归年闰月盘',
      category: '天文',
      summary: '回归年 · 农历闰月',
      kind: 'ringstack',
      outerRadius: 480,
      gap: 2,
      rings: [
        { component: markRaw(DayScaleRing), thickness: 22, props: { time: minute } },
        { component: markRaw(SolarTermsPointRing), thickness: 14, props: { time: minute } },
        { component: markRaw(MoonPhaseRing), thickness: 22, props: { time: minute } },
        { component: markRaw(LunarMonthsRing), thickness: 13, props: { time: minute, yearOffset: 0 } },
        ...Array.from({ length: 11 }, (_, i) => ({
          component: markRaw(LunarMonthsRing),
          thickness: 13,
          props: { time: minute, yearOffset: -(i + 1) }
        }))
      ],
      center: 'none',
      precision: 'minute'
    },

    // ── 6. 观斗盘 ────────────────────────────────────────────
    {
      id: 'guan-dou',
      name: '观斗盘',
      category: '天文',
      summary: '斗柄读时 · 月建月将',
      kind: 'ringstack',
      outerRadius: 570,
      gap: 4,
      rings: [
        { component: markRaw(GuanDouSolarTermsRing), thickness: 22, props: { time: minute } },
        {
          component: markRaw(SevenLuminariesRing),
          thickness: 28,
          props: {
            time: minute,
            coordinateSystem: 'ecliptic-facing-north',
            showLatitudeLine: false,
            showRetrogradeRing: true
          }
        },
        { component: markRaw(MonthGeneralRing), thickness: 40, props: { time: minute } },
        { component: markRaw(MonthEstablishRing), thickness: 42, props: { time: minute } },
        { component: markRaw(HourShichenRing), thickness: 34, props: { time: minute } },
        {
          component: markRaw(SunDiurnalRing),
          thickness: 28,
          props: {
            time: minute,
            observerLat: THUMB_OBSERVER_LAT,
            observerLon: THUMB_OBSERVER_LON,
            showMoon: false
          }
        }
      ],
      center: 'beidou',
      precision: 'minute'
    },

    // ── 7. 卦关系盘 ──────────────────────────────────────────
    {
      id: 'gua-relation',
      name: '卦关系盘',
      category: '易学',
      summary: '六十四卦 · 五种关系',
      kind: 'ringstack',
      outerRadius: 600,
      gap: 1,
      // 与全屏盘默认状态一致：全局模式 + 飞伏 + 仅卦符 / 卦名两层
      rings: [
        {
          component: markRaw(GuaRelationTextRing),
          thickness: 30,
          gapBefore: 1,
          props: {
            layer: 'unicode',
            layout: 'jingfang',
            relationType: 'feifu',
            startDegree: 0,
            usePaletteColorFallback: true
          }
        },
        {
          component: markRaw(GuaRelationTextRing),
          thickness: 22,
          gapBefore: 1,
          props: {
            layer: 'name',
            layout: 'jingfang',
            relationType: 'feifu',
            startDegree: 0,
            usePaletteColorFallback: true
          }
        }
      ],
      center: 'gua-relation',
      precision: 'minute'
    },

    // ── 8. 苏州石刻天文图 ────────────────────────────────────
    {
      id: 'suzhou-stellar-map',
      name: '苏州石刻天文图',
      category: '天文',
      summary: '南宋石刻天文图复原',
      kind: 'ringstack',
      // 苏图无外环：二十八宿直接看中心辐条
      outerRadius: 580,
      gap: 2,
      rings: [],
      center: 'suzhou',
      precision: 'minute'
    },

    // ── 9. 二十四山风水盘 ────────────────────────────────────
    {
      id: 'fengshui24',
      name: '二十四山风水盘',
      category: '风水',
      summary: '二十四山 · 真北校正',
      kind: 'ringstack',
      outerRadius: 280,
      gap: 4,
      rings: [{ component: markRaw(TwentyFourMountainsRing), thickness: 60, props: {} }],
      center: 'fengshui',
      precision: 'minute'
    },

    // ── 10. 阴阳遁九局盘 ─────────────────────────────────────
    {
      id: 'qi-men-dun-jia',
      name: '阴阳遁九局盘',
      category: '术数',
      summary: '阴阳遁九局 · 三元',
      kind: 'ringstack',
      outerRadius: 560,
      gap: 2,
      rings: [
        {
          component: markRaw(LiuJiaziDayRing),
          thickness: 30,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(QiMenSolarTermsRing),
          thickness: 26,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(LunarDateRing),
          thickness: 24,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(SanYuanRing),
          thickness: 24,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(JuShuRing),
          thickness: 24,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        }
      ],
      center: 'none',
      precision: 'minute'
    },

    // ── 11. 黄帝内经·五运六气盘 ──────────────────────────────
    {
      id: 'huangdi-neijing',
      name: '黄帝内经·五运六气盘',
      category: '术数',
      summary: '五运六气 · 主客运气',
      kind: 'ringstack',
      outerRadius: 560,
      gap: 2,
      rings: [
        {
          component: markRaw(LiuJiaziDayRing),
          thickness: 30,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(QiMenSolarTermsRing),
          thickness: 26,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(LunarDateRing),
          thickness: 24,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(WuYunLiuQiRing),
          thickness: 26,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(KeQiRing),
          thickness: 26,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(MainYunRing),
          thickness: 26,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        },
        {
          component: markRaw(KeYunRing),
          thickness: 26,
          gapBefore: 2,
          props: { time: minute, startDegree: DAY_GRID_START_DEGREE }
        }
      ],
      center: 'none',
      precision: 'minute'
    },

    // ── 12. 会合周期盘 ───────────────────────────────────────
    {
      id: 'conjunction-cycles',
      name: '会合周期盘',
      category: '天文',
      summary: '五星会合 · 赤经序列',
      kind: 'ringstack',
      outerRadius: 480,
      gap: 2,
      rings: [
        { component: markRaw(BranchZodiacRing), thickness: 24, props: {} },
        {
          component: markRaw(SolarTermsSkyRing),
          thickness: 24,
          gapBefore: 2,
          props: { time: minute }
        },
        {
          component: markRaw(DegreeScale),
          thickness: 22,
          gapBefore: 2,
          props: {
            scaleInterval: 1,
            labelInterval: 5,
            tickDirection: 'outward',
            startDegree: 0,
            showSectors: false,
            showLabels: true,
            labelColor: '#666666',
            circleColor: '#555555'
          }
        },
        {
          component: markRaw(MansionDegreeRing),
          thickness: 28,
          gapBefore: 6,
          props: { time: minute }
        },
        {
          component: markRaw(SevenLuminariesRing),
          thickness: 30,
          gapBefore: 2,
          props: { time: minute }
        }
      ],
      center: 'conjunction',
      precision: 'minute'
    },

    // ── 13. 易象罗盘 ─────────────────────────────────────────
    {
      id: 'yixiang-luopan',
      name: '易象罗盘',
      category: '易学',
      summary: '十一层同心环 · 宣纸朱砂',
      kind: 'yixiang',
      // 易象盘面坐标系 800×800，外缘 R=380 × 1.35 = 513
      outerRadius: 513,
      gap: 0,
      rings: [],
      center: 'none',
      precision: 'minute'
    }
  ]
}
