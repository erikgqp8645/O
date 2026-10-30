/**
 * 二十四节气与七十二候
 *
 * 【节气】
 *   太阳黄经每 15° 为一节气，自春分（黄经 0°）起算。
 *   顺序：立春(315°) 雨水(330°) 惊蛰(345°) 春分(0°) 清明(15°) 谷雨(30°)
 *        立夏(45°) 小满(60°) 芒种(75°) 夏至(90°) 小暑(105°) 大暑(120°)
 *        立秋(135°) 处暑(150°) 白露(165°) 秋分(180°) 寒露(195°) 霜降(210°)
 *        立冬(225°) 小雪(240°) 大雪(255°) 冬至(270°) 小寒(285°) 大寒(300°)
 *
 * 【七十二候】
 *   每节气分初候、二候、三候，每候约 5 日（一候 ≈ 15 日）。
 *   出处：《逸周书·时训解》《礼记·月令》。
 *
 * 【节气五行】
 *   春（立春—清明）木、夏（立夏—大暑）火、长夏（立秋—立冬前后）土、
 *   秋（白露—霜降）金、冬（立冬—大寒）水。
 */

export interface SolarTermInfo {
  /** 节气名 */
  name: string
  /** 太阳黄经（度） */
  longitude: number
  /** 所属季节 */
  season: '春' | '夏' | '长夏' | '秋' | '冬'
  /** 五行 */
  element: '木' | '火' | '土' | '金' | '水'
  /** 三候：初候、二候、三候 */
  hou: [string, string, string]
}

/** 二十四节气表（按黄经递增） */
export const SOLAR_TERMS: readonly SolarTermInfo[] = [
  { name: '春分', longitude: 0, season: '春', element: '木', hou: ['玄鸟至', '雷乃发声', '始电'] },
  { name: '清明', longitude: 15, season: '春', element: '木', hou: ['桐始华', '田鼠化为鴽', '虹始见'] },
  { name: '谷雨', longitude: 30, season: '春', element: '木', hou: ['萍始生', '鸣鸠拂其羽', '戴胜降于桑'] },
  { name: '立夏', longitude: 45, season: '夏', element: '火', hou: ['蝼蝈鸣', '蚯蚓出', '王瓜生'] },
  { name: '小满', longitude: 60, season: '夏', element: '火', hou: ['苦菜秀', '靡草死', '麦秋至'] },
  { name: '芒种', longitude: 75, season: '夏', element: '火', hou: ['螳螂生', '鵙始鸣', '反舌无声'] },
  { name: '夏至', longitude: 90, season: '长夏', element: '土', hou: ['鹿角解', '蜩始鸣', '半夏生'] },
  { name: '小暑', longitude: 105, season: '长夏', element: '土', hou: ['温风至', '蟋蟀居壁', '鹰始鸷'] },
  { name: '大暑', longitude: 120, season: '长夏', element: '土', hou: ['腐草为萤', '土润溽暑', '大雨时行'] },
  { name: '立秋', longitude: 135, season: '秋', element: '金', hou: ['凉风至', '白露降', '寒蝉鸣'] },
  { name: '处暑', longitude: 150, season: '秋', element: '金', hou: ['鹰乃祭鸟', '天地始肃', '禾乃登'] },
  { name: '白露', longitude: 165, season: '秋', element: '金', hou: ['鸿雁来', '玄鸟归', '群鸟养羞'] },
  { name: '秋分', longitude: 180, season: '秋', element: '金', hou: ['雷始收声', '蛰虫坯户', '水始涸'] },
  { name: '寒露', longitude: 195, season: '冬', element: '水', hou: ['鸿雁来宾', '雀入大水为蛤', '菊有黄华'] },
  { name: '霜降', longitude: 210, season: '冬', element: '水', hou: ['豺乃祭兽', '草木黄落', '蛰虫咸俯'] },
  { name: '立冬', longitude: 225, season: '冬', element: '水', hou: ['水始冰', '地始冻', '雉入大水为蜃'] },
  { name: '小雪', longitude: 240, season: '冬', element: '水', hou: ['虹藏不见', '天气上升地气下降', '闭塞成冬'] },
  { name: '大雪', longitude: 255, season: '冬', element: '水', hou: ['鹖鴠不鸣', '虎始交', '荔挺出'] },
  { name: '冬至', longitude: 270, season: '冬', element: '水', hou: ['蚯蚓结', '麋角解', '水泉动'] },
  { name: '小寒', longitude: 285, season: '冬', element: '水', hou: ['雁北乡', '鹊始巢', '雉始雊'] },
  { name: '大寒', longitude: 300, season: '冬', element: '水', hou: ['鸡始乳', '征鸟厉疾', '水泽腹坚'] },
  { name: '立春', longitude: 315, season: '春', element: '木', hou: ['东风解冻', '蛰虫始振', '鱼陟负冰'] },
  { name: '雨水', longitude: 330, season: '春', element: '木', hou: ['獭祭鱼', '鸿雁来', '草木萌动'] },
  { name: '惊蛰', longitude: 345, season: '春', element: '木', hou: ['桃始华', '仓庚鸣', '鹰化为鸠'] }
]

/** 节气名 → 信息 */
export const SOLAR_TERM_MAP: Readonly<Record<string, SolarTermInfo>> = Object.freeze(
  SOLAR_TERMS.reduce<Record<string, SolarTermInfo>>((acc, t) => {
    acc[t.name] = t
    return acc
  }, {})
)

/** 节气名按黄经顺序的索引（用于环上排布，索引 0 = 春分） */
export const SOLAR_TERM_BY_LONGITUDE: readonly SolarTermInfo[] = SOLAR_TERMS.slice().sort(
  (a, b) => a.longitude - b.longitude
)

/**
 * 十二节令（"节"，月令分界）—— 干支月的划分依据。
 * 立春起为寅月，依次：立春→寅，惊蛰→卯，清明→辰，立夏→巳，芒种→午，
 * 小暑→未，立秋→申，白露→酉，寒露→戌，立冬→亥，大雪→子，小寒→丑。
 */
export const TWELVE_MONTH_TERMS: readonly { term: string; zhi: string }[] = [
  { term: '立春', zhi: '寅' },
  { term: '惊蛰', zhi: '卯' },
  { term: '清明', zhi: '辰' },
  { term: '立夏', zhi: '巳' },
  { term: '芒种', zhi: '午' },
  { term: '小暑', zhi: '未' },
  { term: '立秋', zhi: '申' },
  { term: '白露', zhi: '酉' },
  { term: '寒露', zhi: '戌' },
  { term: '立冬', zhi: '亥' },
  { term: '大雪', zhi: '子' },
  { term: '小寒', zhi: '丑' }
]
