# AGENTS.md

> 道由天观 · 古代天文与易学算法的可视化观测台（VitePress + Vue 3 + SVG 罗盘）。
> 仓库根：`C:\Users\hxst01\Documents\aicoding\O`，分支约定见「PR & commit」一节。
> 架构与五层分层细节见同目录 `CLAUDE.md`——任何涉及 `src/views`、`src/components/rings`、`src/components/centers` 的改动，先读 `CLAUDE.md` 第 0/1/2 节。

## Setup commands

- Install deps: `npm install`（Node `^20.19.0 || >=22.12.0`，包管理器固定 npm，锁文件 `package-lock.json`）
- Start dev:    `npm run dev`   # VitePress dev server，监听所有网卡
- Build:        `npm run build` # 产物输出到仓库根 `dist/`
- Preview:      `npm run preview`

> ⚠️ **`build` 之后必须重启 `preview`**。VitePress preview 启动时会把产物文件清单快照进内存，`build` 清空重建 `dist/` 后，HTML 路径没变（能读到新内容），但新哈希的 JS/CSS 不在快照里 → **404 → 页面黑屏**。排查顺序：`Invoke-WebRequest` 抓页面 HTML 里的 `<script src>`，逐个 HEAD 看是否 200。长期开发建议直接用 `npm run dev`（VitePress dev server 不缓存清单）。
- Test (unit):  `npm run test:unit` # Vitest
- Test (e2e):   `npm run test:e2e`  # Playwright，浏览器首次运行需 `npx playwright install`
- Lint:         `npm run lint`    # ESLint flat config，自带 `--fix`
- Format:       `npm run format`  # Prettier，仅作用于 `src/` 与 `docs/.vitepress/`
- Typecheck:    `npm run type-check` # `vue-tsc --build --noEmit`
- Deploy:       `npm run deploy`  # 触发本地 `gh-pages` 推送；CI 部署走 `.github/workflows/deploy.yml`

## Project layout

- `docs/` — VitePress 站点根（`docs/.vitepress/config.ts` 配 `base: '/O/'`，输出 `dist/`）；其中 `docs/compass/*.md` 走自定义 `layout: compass` 全屏布局
- `src/views/` — 顶层罗盘 View（Layer 2，组合层；唯一持有 `controlledTime` 状态）
- `src/components/rings/` — 环组件（Layer 3，含 `qimen-dun-jia/`、`wuyun-liuqi/`、`conjunction-cycles/`、`guan-dou/` 等子目录）
- `src/components/centers/` — 圆心组件（Layer 3）
- `src/components/base/` — 基础渲染（`PolarCanvas` / `RingStack` / `DataRing` 等 Layer 4）
- `src/composables/` — 共享组合式函数（`useLiveClock`、`useAltDragPan` 等）
- `src/utils/` — 纯函数工具层（Layer 5：`celestial.ts` / `geometry.ts` / `liushiJiazi.ts` / `qimenDunJia.ts` 等）
- `src/data/` — 静态数据（二十八宿、北斗恒星等）
- `src/compasses/` — 罗盘元数据注册表（驱动 `HomeView` 卡片列表）
- `src/types/` — 跨层共享类型
- `scripts/` — 数据抓取与生成脚本（中间产物在 `scripts/stellarium-data/`，已 `.gitignore`）
- `e2e/` — Playwright 用例
- `public/` — 静态资源

## Code style

- TypeScript 严格模式（`tsconfig.app.json` 继承 `@vue/tsconfig`）
- Prettier：半角分号关闭、单引号、`printWidth: 100`（见 `.prettierrc.json`）
- ESLint flat config（`eslint.config.ts`）：Vue + TS + Vitest + Playwright 插件；`@typescript-eslint/no-unused-vars` 允许 `_` 前缀
- 文件命名：组件 `PascalCase.vue`；工具/组合式 `camelCase.ts`；环组件位于专用罗盘时放进 `src/components/rings/<compass-id>/`，文件名**不带盘名前缀**
- 提交前跑一遍 `npm run lint && npm run type-check`

## Testing instructions

- 单元测试：Vitest，文件放 `src/**/__tests__/*.spec.ts`（与 ESLint 配置一致）
- 端到端测试：Playwright，文件放 `e2e/**/*.{test,spec}.ts`
- 新增行为必须配测试，参考同目录现有用例
- 罗盘类 PR 必须至少通过 `npm run type-check` + `npm run test:unit`；涉及 UI 视觉或 DeviceOrientation/定位等浏览器能力时，必须同时通过 `npm run test:e2e`
- 严禁跳过测试提交

## Architecture invariants（违反需在 PR 描述中显式说明）

- **唯一时间真理源**：`src/views/*.vue` 持有 `controlledTime = ref<Date>()`，向下传 `time: controlledTime`，不解构 `.value`
- **时间驱动环三行范式**：`props: { time?: MaybeRef<Date> }` → `const timeRef = computed(() => unref(props.time) ?? new Date())` → 所有 `ringData` 派生自 `timeRef.value`。禁止直接 `watch` 父组件状态
- **层间单向数据流**：View 不算环数据；环/圆心不向 View `emit`；领域计算下沉到 `src/utils/*.ts` 纯函数
- **VitePress ↔ `src/` 融合**：`@` alias 指向 `src/`，通过 `docs/.vitepress/config.ts` 的 `vite.resolve.alias` 暴露；新增 View 后必须同步在 `docs/compass/<id>.md` 注册（`layout: compass` + 顶层 View 标签），并在 `src/compasses/index.ts` 登记元数据
- **新增罗盘五步走**：① `src/views/XxxView.vue` ② `src/compasses/index.ts` 注册 ③ `docs/compass/<id>.md`（layout: compass）④ `src/components/rings/<id>/` 放专用环（共享环放 `rings/` 根）⑤ 复杂计算下沉到 `src/utils/`

## 易象罗盘 · 方位锚定口径（改盘面前先读）

**易象罗盘的唯一来源就是本仓库**（2026-10-30 决策）。独立仓 `C:\Users\hxst01\Documents\aicoding\yixiang-luopan` 曾是同一套逻辑的另一份拷贝，现已**冻结留档、不再同步、不再维护**——改易象罗盘只改本仓，**不要**把改动同步回独立仓。本仓相关落点：`src/data/yixiang/`（纯数据）、`src/utils/yixiang/`（口径与几何）、`src/components/yixiang/`（盘面）、`src/views/YixiangLuopanView.vue`（View）、`src/utils/yixiang/__tests__/`（自检）。

盘面为罗盘古式「**上南下北、左东右西**」：**正上 = 南（午）· 正下 = 北（子）· 正左 = 东（卯）· 正右 = 西（酉）**。
SVG 空间角 0° = 正右、顺时针增加；方位角 bearing 0° = 正北、顺时针增加；换算 `SVG = (bearing + 90) mod 360`（`src/utils/yixiang/geometry.ts`）。

各环**不是各自随意排布**，而是全部锚定到同一套方位基准。锚点声明在 `src/utils/yixiang/rings.ts` 的 `RING_ANCHORS`，起始角由 `resolveStartAngle()` 反解——**调整环的先后顺序或格数都不会破坏对位**。新增环层时必须同时声明锚点。

| 环 | 锚点 | 依据 |
|---|---|---|
| 周天三百六十度 | 0° 在正北（子中） | 传统度盘：子=0°、午=180°、卯=90°、酉=270° |
| 二十八宿分度 | 角宿起于巽（后天巽位在**东南**，bearing 135°），逆行二十四山 | 「巽中起角木蛟，逆行二十四山」 |
| 先天六十四卦 | **地雷复居正北（冬至）**、天风姤居正南（夏至），二者正对 | 伏羲圆图的阴阳转换点；与十二辟卦环的复/姤完全重合。圆图方位「上南见乾、下北见坤」，本盘整体旋转半格以让复/姤精确落在子/午，于是乾偏正南以东半格、坤偏正北以西半格 |
| 八卦 | 乾居正南，**卦格居中于该卦方位** | 先天方位：乾南坤北、离东坎西 |
| 二十四节气 | 冬至与子中同轴（二分二至落在子卯午酉） | 「节中气附于正针之下……冬至始于正针子中，而尽于正针癸中」 |
| 十二辟卦 | 复≡冬至（正北），大壮≡春分、姤≡夏至、观≡秋分 | 十二消息卦统摄十二月与二十四节气；四正卦落在子卯午酉 |
| 七十二候 | 与所属节气同轴 | 每节气三候 |
| 六十甲子 | 甲子与子中同轴 | |
| 纳甲六十四卦 | 坎为水直冬至 | 京房四正卦主二分二至：坎冬至、离夏至、震春分、兑秋分 |
| 十二时辰 | 子时与子中同轴 | |
| 二十四山 | 子在正北 | 传统度盘基准 |

自检：`src/utils/yixiang/__tests__/anchors.spec.ts`（对位断言 + 顺/逆时针同构 + 十二辟卦阴阳消长与节气覆盖）。

### 先天六十四卦圆图口径（2026-10-30 修正）

- **圆图次序由排布规则算出**（**唯一实现在 `src/utils/guaUtils.ts`** 的 `XIANTIAN_POS_BY_VALUE` / `getXiantianPos()`；易象罗盘与站内先天六十四卦盘共用同一份），不是位反转：
  - 左半（冬至→夏至，阳顺，天道左旋）：下卦卦主 **震→离→兑→乾**，每组内上卦依次 **坤→艮→坎→巽→震→离→兑→乾**
  - 右半（夏至→冬至，阴逆，地道右旋）：下卦卦主 **巽→坎→艮→坤**，每组内上卦依次 **乾→兑→离→震→巽→坎→艮→坤**
  - 圆周位次：`复(0) … 乾(31) 姤(32) … 坤(63)` → 复≡冬至、姤≡夏至正对；乾南坤北亦正对（各偏半格）
- ⚠️ **圆图不是「相邻两卦变一爻」的次序**（那是方图的性质）。圆图 64 条相邻边中只有 34 条恰好变一爻 —— 别拿「每卦一变」去反推圆图。
- 权威依据（两处互证）：悟行阁《先天六十四卦方圆图解析》的圆图 64 卦名单 + 易象乾坤《伏羲先天六十四卦圆图规律》的排布规则；另以「左半 32 卦阳爻 112 / 阴爻 80，右半反之」交叉验证。
- 自检：`src/utils/yixiang/__tests__/gua.spec.ts`（11 条：名单逐字比对、位次、阴阳消长、半圆爻数统计）。
- ✅ 站内另一个页面「先天六十四卦盘」已于 2026-10-30 一并修正，与本罗盘共用同一套规则（见下节）。

### 站内先天六十四卦盘的圆图口径（2026-10-30 修正）

- **排布规则的唯一实现**在 `src/utils/guaUtils.ts`（`XIANTIAN_POS_BY_VALUE` / `getXiantianPos()`）：易象罗盘、站内先天六十四卦盘（`src/data/sixtyFourGua.ts`）、卦关系页的「先天圆图」布局（`src/utils/guaLayoutConstants.ts`）三处共用——**改规则只改这一个文件**。
- **圆周位次**：`复(0) … 乾(31) 姤(32) … 坤(63)`，与权威圆图名单逐字一致（自检 `src/utils/guaUtils.spec.ts` 16 条）。
- **盘面角度**（`getXiantianCenterAngle()`，SVG 空间 0°正右 / 90°正下 / 270°正上）：乾居**正上 270°**、姤紧右 275.625°、坤居**正下 90°**、复紧左 95.625°；阳仪（复…乾，pos≤31）在**左半**、阴仪（姤…坤，pos≥32）在**右半**。
- ⚠️ **位反转（`bitReverse6`）只用于综卦**（上下颠倒），与圆图位次是两回事——早前把二者混用，才把左右两个半圆对调（坤与乾首尾相邻、姤紧贴乾，阴阳两极挤在一侧）。

### 七十二候环的排版口径（2026-10-30）

- **锚点**：`hou` 锚在「冬至**二候**」居中于子中（`RING_ANCHORS.hou`），三候即 `[-7.5,-2.5] / [-2.5,2.5] / [2.5,7.5]`，恰好铺满冬至格。
  ⚠️ 若把锚设在「冬至初候」，整环后移一个候格（5°），冬至三候越入小寒格——看上去就是「一候二候三候顺序不对」。
- **环带**：候环宽 0.078（`rInner 0.532 / rOuter 0.610`），比六十甲子环多让出 0.020 给它——候环要同时容下「一/二/三」序号与当前候名，两者径向合计已占满 30 单位。
- **每格序号**「一/二/三」放**内圈**（10 单位、加粗）；当前节气的三格用朱砂，其余墨色 60%。
- **当前候名**放**外圈**，沿弧排布，字号上限 7.5 单位；位置由 `fitHouName()`（`src/utils/yixiang/geometry.ts`）计算——名字必须整体容于**所属节气格（15°）**之内，否则会压到邻节气的分隔线、且描边底色会盖错邻节颜色。自检见 `geometry.spec.ts` 的 `fitHouName` 组。
- **描边技巧**：候名用 `paint-order: stroke fill` + 描边色 = 该格底色（季节色），把穿过的朱砂分隔线让到字下面——这是「候名清楚」的关键。
- 全部 72 个候名不落盘（单格弧长仅 ~19 单位，8 字长名根本放不下）；完整名称在盘心「物候」栏与底部状态行。

⚠️ **二十八宿用的是「风水罗盘宿度」**（合计 358 度，巽起逆行），与站内星盘用的《汉书·律历志》汉代赤道宿度（`src/data/rings/twentyEightConstellations.ts`，合计 365.25 度）是**两套不同体系，不可混用**。

⚠️ **六十四卦卦名的字序**：卦名前字为**上卦（外卦）**、后字为**下卦（内卦）**，如「水火既济」＝上坎下离、「地雷复」＝上坤下震。`value` 编码为 `下卦值 + 上卦值 × 8`（bit0 = 初爻）。写断言时勿按「前字为下卦」的直觉反推。

⚠️ `src/utils/yixiang/geometry.ts` 顶部的角度约定注释：SVG 0° = 正右、90° = 正下、180° = 正左、270° = 正上；因盘面是上南下北，**正上 = 南、正右 = 西**，别按现代地图习惯反推。

## PR & commit conventions

- 默认分支：`main`；从 `main` 切功能分支，**禁止**直接 push 到 `main`
- 提交信息：Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` / `chore:` / `test:` / `build:`），中文一句话 subject 即可
- 每个罗盘 / 概念 / 工具函数变更独立一个 commit，便于回溯
- 推送后通过 GitHub PR 合入；CI 检查（lint + typecheck + test）全绿方可 review
- 部署：合入 `main` 后由 `.github/workflows/deploy.yml` 自动发布

### 远端与部署（2026-10-30 起）

| remote | 指向 | 用途 |
|---|---|---|
| `origin` | `github.com/erikgqp8645/O`（**本仓自有仓库，可写**） | 推送、开 PR、合入 |
| `upstream` | `github.com/andaoai/O`（**只读参照**） | 拉取对照，**不推送** |

- 公网站点：**<https://erikgqp8645.github.io/O/>**（由 `origin` 的 `main` 推送触发 `deploy.yml` 发布）
- ⚠️ **URL 不带尾斜杠**：VitePress `cleanUrls` + GitHub Pages 的既有行为 —— `/compass/yixiang-luopan` ✅，`/compass/yixiang-luopan/` ❌ 404（上游站点同样如此，非本仓引入）
- ⚠️ `deploy.yml` 的部署步骤带 `if: github.ref == 'refs/heads/main'` —— **PR 触发的运行不会发布**，只有合入 main 后的 push 才发布
- ⚠️ **`gh` 命令必须显式 `--repo erikgqp8645/O`**：本仓有 `upstream`（andaoai/O）只读远端，`gh` 会把它当成默认仓库，导致 `gh pr create` 报「Head sha can't be blank / No commits between main and …」（分支其实在 fork 上、push 正常）
- fork 首次创建后，GitHub 需一次真实 push 才会索引并注册 `deploy.yml`（此前 workflow 列表为空、push 不生成 run）；`deploy.yml` 已加 `workflow_dispatch`，可手动重发

## Security

- 仓库 License：`CC-BY-NC-4.0`（README 顶部已声明）；不得引入与该协议冲突的依赖
- 严禁提交任何隐私数据（设备 ID、个人经纬度历史等）；`.env*` 一律 `.gitignore`
- 第三方数据源（Stellarium / SIMBAD 抓取）走 `scripts/` 中转，原始产物不入 git；提交前确认 `scripts/stellarium-data/` 未被追踪
- 部署密钥仅放在 GitHub Actions Secrets；本地 `gh-pages` 部署需自备 `GITHUB_TOKEN` 环境变量
