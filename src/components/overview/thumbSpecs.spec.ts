import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { compasses } from '@/compasses'
import { buildThumbSpecs } from './thumbSpecs'

const time = ref(new Date(2026, 9, 30, 12, 0, 0))
const specs = buildThumbSpecs(() => time)

describe('thumbSpecs · 与罗盘注册表的一致性', () => {
  it('缩略盘数量与罗盘总数一致（13）', () => {
    expect(specs).toHaveLength(13)
    expect(specs).toHaveLength(compasses.length)
  })

  it('每个罗盘都有缩略规格，且 id 一一对应（顺序也一致）', () => {
    expect(specs.map((s) => s.id)).toEqual(compasses.map((c) => c.id))
  })

  it('每个规格都有名称、分类与一句话说明', () => {
    for (const s of specs) {
      expect(s.name.length, `${s.id} 缺 name`).toBeGreaterThan(0)
      expect(s.category.length, `${s.id} 缺 category`).toBeGreaterThan(0)
      expect(s.summary.length, `${s.id} 缺 summary`).toBeGreaterThan(0)
    }
  })

  it('环规格外缘半径为正、间隙非负', () => {
    for (const s of specs) {
      expect(s.outerRadius, `${s.id} outerRadius 非法`).toBeGreaterThan(0)
      expect(s.gap, `${s.id} gap 非法`).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('thumbSpecs · 环层结构（防止与全屏盘漂移）', () => {
  const byId = (id: string) => specs.find((s) => s.id === id)!

  it('六十甲子六环 = 12 环（6 甲子环 + 月/日/时 各一对干支环）', () => {
    expect(byId('liushi-jiazi').rings).toHaveLength(12)
  })

  it('先天六十四卦盘 = 3 环', () => {
    expect(byId('sixty-four-gua').rings).toHaveLength(3)
  })

  it('京房盘 = 5 环', () => {
    expect(byId('jingfang').rings).toHaveLength(5)
  })

  it('七曜入宿天象盘 = 7 环（最内环省略 thickness → 填满中心）', () => {
    const rings = byId('planet-mansion').rings
    expect(rings).toHaveLength(7)
    expect(rings[6]!.thickness).toBeUndefined()
  })

  it('回归年闰月盘 = 15 环（1 日刻 + 1 节气 + 1 月相 + 12 农历月）', () => {
    expect(byId('tropical-year').rings).toHaveLength(15)
  })

  it('观斗盘 = 6 环', () => {
    expect(byId('guan-dou').rings).toHaveLength(6)
  })

  it('卦关系盘 = 2 环（卦符 + 卦名）', () => {
    expect(byId('gua-relation').rings).toHaveLength(2)
  })

  it('苏州石刻天文图无外环（内容全在圆心）', () => {
    expect(byId('suzhou-stellar-map').rings).toHaveLength(0)
    expect(byId('suzhou-stellar-map').center).toBe('suzhou')
  })

  it('二十四山风水盘 = 1 环', () => {
    expect(byId('fengshui24').rings).toHaveLength(1)
  })

  it('奇门盘 = 5 环', () => {
    expect(byId('qi-men-dun-jia').rings).toHaveLength(5)
  })

  it('五运六气盘 = 7 环', () => {
    expect(byId('huangdi-neijing').rings).toHaveLength(7)
  })

  it('会合周期盘 = 5 环', () => {
    expect(byId('conjunction-cycles').rings).toHaveLength(5)
  })

  it('易象罗盘走独立渲染方式（YixiangDial），不走 RingStack', () => {
    const s = byId('yixiang-luopan')
    expect(s.kind).toBe('yixiang')
    expect(s.rings).toHaveLength(0)
    // 380 × 1.35 = 513
    expect(s.outerRadius).toBe(513)
  })
})

describe('thumbSpecs · 时间粒度与圆心', () => {
  it('仅六十甲子盘按秒推进，其余按分推进', () => {
    const seconds = specs.filter((s) => s.precision === 'second').map((s) => s.id)
    expect(seconds).toEqual(['liushi-jiazi'])
    expect(specs.filter((s) => s.precision === 'minute')).toHaveLength(12)
  })

  it('需要实况圆心的盘都声明了对应的圆心类型', () => {
    const centers = Object.fromEntries(specs.map((s) => [s.id, s.center]))
    expect(centers['guan-dou']).toBe('beidou')
    expect(centers['gua-relation']).toBe('gua-relation')
    expect(centers['suzhou-stellar-map']).toBe('suzhou')
    expect(centers['conjunction-cycles']).toBe('conjunction')
    expect(centers['sixty-four-gua']).toBe('xiantian-square')
    expect(centers['fengshui24']).toBe('fengshui')
  })

  it('纯文字圆心的盘（信息卡类）统一不画圆心', () => {
    // 这些盘的全屏圆心是文字信息卡，缩略图尺寸下不可读，略去
    for (const id of ['liushi-jiazi', 'tropical-year', 'qi-men-dun-jia', 'huangdi-neijing']) {
      expect(specs.find((s) => s.id === id)!.center).toBe('none')
    }
  })
})
