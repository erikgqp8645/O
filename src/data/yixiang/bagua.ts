/**
 * 八卦基础数据
 *
 * 先天（伏羲）方位：乾南、坤北，离东、坎西，兑东南、震东北，巽西南、艮西北。
 * 后天（文王）方位：离南、坎北，震东、兑西，巽东南、艮东北，乾西北、坤西南。
 *
 * 纳甲：乾纳甲壬、坤纳乙癸、震纳庚、巽纳辛、坎纳戊、离纳己、艮纳丙、兑纳丁。
 * 内卦（初二三爻）自下而上依「阳顺阴逆」纳地支，外卦（四五上爻）同理。
 */

/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水'

export interface BaguaInfo {
  /** 卦名 */
  name: string
  /** 卦符 */
  unicode: string
  /** 三爻阴阳自下而上：true=阳 */
  lines: boolean[]
  /** 五行 */
  element: WuXing
  /** 先天方位（八卦角度制，0=正北，顺时针） */
  xiantianDirection: string
  /** 后天方位 */
  houtianDirection: string
  /** 天时（自然象） */
  nature: string
  /** 人物象 */
  family: string
  /** 身体象 */
  body: string
  /** 动物象 */
  animal: string
  /** 纳甲地支：内卦三爻自下而上 */
  innerZhi: string[]
  /** 纳甲地支：外卦三爻自下而上 */
  outerZhi: string[]
  /** 纳甲天干 */
  gan: string
}

/**
 * 八卦方位角（0=正北，顺时针，与罗盘一致）
 * 先天：乾居南(180°) → 八卦「面南背北」时乾=南=180。
 * 本盘以正北为 0° 顺时针计角。
 */
export const BAGUA_XIANTIAN_ANGLE: Readonly<Record<string, number>> = {
  乾: 180,
  兑: 135,
  离: 90,
  震: 45,
  巽: 225,
  坎: 270,
  艮: 315,
  坤: 0
}

/** 后天八卦方位角 */
export const BAGUA_HOUTIAN_ANGLE: Readonly<Record<string, number>> = {
  离: 180,
  坤: 225,
  兑: 270,
  乾: 315,
  坎: 0,
  艮: 45,
  震: 90,
  巽: 135
}

export const BAGUA: readonly BaguaInfo[] = [
  {
    name: '乾',
    unicode: '☰',
    lines: [true, true, true],
    element: '金',
    xiantianDirection: '南',
    houtianDirection: '西北',
    nature: '天',
    family: '父',
    body: '首',
    animal: '马',
    innerZhi: ['子', '寅', '辰'],
    outerZhi: ['午', '申', '戌'],
    gan: '甲壬'
  },
  {
    name: '兑',
    unicode: '☱',
    lines: [true, true, false],
    element: '金',
    xiantianDirection: '东南',
    houtianDirection: '西',
    nature: '泽',
    family: '少女',
    body: '口',
    animal: '羊',
    innerZhi: ['巳', '卯', '丑'],
    outerZhi: ['亥', '酉', '未'],
    gan: '丁'
  },
  {
    name: '离',
    unicode: '☲',
    lines: [true, false, true],
    element: '火',
    xiantianDirection: '东',
    houtianDirection: '南',
    nature: '火',
    family: '中女',
    body: '目',
    animal: '雉',
    innerZhi: ['卯', '丑', '亥'],
    outerZhi: ['酉', '未', '巳'],
    gan: '己'
  },
  {
    name: '震',
    unicode: '☳',
    lines: [false, true, true],
    element: '木',
    xiantianDirection: '东北',
    houtianDirection: '东',
    nature: '雷',
    family: '长男',
    body: '足',
    animal: '龙',
    innerZhi: ['子', '寅', '辰'],
    outerZhi: ['午', '申', '戌'],
    gan: '庚'
  },
  {
    name: '巽',
    unicode: '☴',
    lines: [false, true, false],
    element: '木',
    xiantianDirection: '西南',
    houtianDirection: '东南',
    nature: '风',
    family: '长女',
    body: '股',
    animal: '鸡',
    innerZhi: ['丑', '亥', '酉'],
    outerZhi: ['未', '巳', '卯'],
    gan: '辛'
  },
  {
    name: '坎',
    unicode: '☵',
    lines: [false, false, true],
    element: '水',
    xiantianDirection: '西',
    houtianDirection: '北',
    nature: '水',
    family: '中男',
    body: '耳',
    animal: '豕',
    innerZhi: ['寅', '辰', '午'],
    outerZhi: ['申', '戌', '子'],
    gan: '戊'
  },
  {
    name: '艮',
    unicode: '☶',
    lines: [false, false, false],
    element: '土',
    xiantianDirection: '西北',
    houtianDirection: '东北',
    nature: '山',
    family: '少男',
    body: '手',
    animal: '狗',
    innerZhi: ['辰', '午', '申'],
    outerZhi: ['戌', '子', '寅'],
    gan: '丙'
  },
  {
    name: '坤',
    unicode: '☷',
    lines: [false, false, false],
    element: '土',
    xiantianDirection: '北',
    houtianDirection: '西南',
    nature: '地',
    family: '母',
    body: '腹',
    animal: '牛',
    innerZhi: ['未', '巳', '卯'],
    outerZhi: ['丑', '亥', '酉'],
    gan: '乙癸'
  }
]

/** 八卦名 → 信息 */
export const BAGUA_MAP: Readonly<Record<string, BaguaInfo>> = Object.freeze(
  BAGUA.reduce<Record<string, BaguaInfo>>((acc, b) => {
    acc[b.name] = b
    return acc
  }, {})
)

/** 五行相生：木→火→土→金→水→木 */
export const WUXING_SHENG: Readonly<Record<WuXing, WuXing>> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木'
}

/** 五行相克：木克土、土克水、水克火、火克金、金克木 */
export const WUXING_KE: Readonly<Record<WuXing, WuXing>> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木'
}
