import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { ZOOM_MAX, ZOOM_MIN, type UseViewportReturn } from './useViewport'

/**
 * 鼠标拖拽平移 / 滚轮以光标为锚缩放
 *
 * 平移有两种手势，任选其一（可并存）：
 *   1. 中键拖拽（button === 1）—— CAD / GIS 通用习惯，单手即可挪盘面
 *   2. Alt + 左键拖拽—— 没有中键的设备（触控板）上的替代手势
 * 两者都会更新 offsetX / offsetY；屏幕像素通过 SVG 的显示比例换算为 viewBox 单位，
 * 与当前 zoomLevel 独立（因为在 View 模板中，translate 位于 scale 之外，
 * offset 使用 viewBox 单位）。
 *
 * 滚轮 → 以光标位置为锚缩放（无需按 Alt）：这是「放大观看」的主入口，
 *       光标下的内容点原地不动，滚动即对准想看的地方。
 * 双击 → 在光标处放大（< 150% 放到 250%，否则复位 100%）。
 *
 * 所有指针事件都挂在 SVG 的**父容器**上（而不是 SVG 本身）：
 *   · SVG 内的 pointerdown 会冒泡到容器 → 原行为不变
 *   · 盘面上方若有遮罩（如风水盘定位授权层）也能收到中键平移
 *
 * 用法（新，推荐）：
 * ```ts
 * const viewport = useViewport()
 * const { isDragging, isAltPressed, isMiddlePanning } = useAltDragPan({ svgRef, viewport })
 * ```
 *
 * 兼容旧签名（散 ref）：
 * ```ts
 * useAltDragPan({ svgRef, offsetX, offsetY, zoomLevel })
 * ```
 */
export interface AltDragPanOptions {
  /** SVG 元素 ref */
  svgRef: Ref<SVGSVGElement | null>
  /** 首选：整套视口状态（useViewport 返回值） */
  viewport?: UseViewportReturn
  /** 兼容：单独的平移 X 状态（viewBox 单位） */
  offsetX?: Ref<number>
  /** 兼容：单独的平移 Y 状态（viewBox 单位） */
  offsetY?: Ref<number>
  /** 兼容：缩放级别（可选：传入后即启用 Alt + 滚轮缩放） */
  zoomLevel?: Ref<number>
  /** SVG viewBox 正方形边长（默认 1200，与所有罗盘 View 一致） */
  viewBoxSize?: number
  /** 缩放最小值，默认 ZOOM_MIN（0.05 = 5%） */
  zoomMin?: number
  /** 缩放最大值，默认 ZOOM_MAX（10 = 1000%） */
  zoomMax?: number
  /** 滚轮单档的乘性系数，默认 1.12（滚一格放大 12%） */
  wheelFactor?: number
}

export function useAltDragPan(opts: AltDragPanOptions) {
  const {
    svgRef,
    viewport,
    viewBoxSize = 1200,
    zoomMin = ZOOM_MIN,
    zoomMax = ZOOM_MAX,
    wheelFactor = 1.12
  } = opts

  // 兼容层：viewport 优先，回退到旧散 ref 参数
  const offsetX = viewport?.offsetX ?? opts.offsetX
  const offsetY = viewport?.offsetY ?? opts.offsetY
  const zoomLevel = viewport?.zoom ?? opts.zoomLevel
  if (!offsetX || !offsetY) {
    throw new Error('useAltDragPan: must supply either viewport or {offsetX, offsetY}')
  }

  const isDragging = ref(false)
  const isAltPressed = ref(false)
  /** 当前是否处于「中键平移」（区别于 Alt+左键平移），仅作状态标记 */
  const isMiddlePanning = ref(false)

  let startClientX = 0
  let startClientY = 0
  let startOffsetX = 0
  let startOffsetY = 0
  let activePointerId: number | null = null

  /** 拖拽期间锁住 body 的光标与文本选中，避免拖动时鼠标变成箭头 / 选中文字 */
  let bodyStyleBackup: { cursor: string; userSelect: string } | null = null

  const lockBodyCursor = () => {
    if (bodyStyleBackup) return
    bodyStyleBackup = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect
    }
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }

  const unlockBodyCursor = () => {
    if (!bodyStyleBackup) return
    document.body.style.cursor = bodyStyleBackup.cursor
    document.body.style.userSelect = bodyStyleBackup.userSelect
    bodyStyleBackup = null
  }

  /** 事件是否落在 SVG 盘面内部（用于限定 Alt+左键的生效范围，保持旧行为） */
  const isInsideSvg = (target: EventTarget | null): boolean => {
    const svg = svgRef.value
    return !!svg && target instanceof Node && svg.contains(target)
  }

  /** 是否落在可交互控件上（按钮 / 链接 / 输入框……）——这些元素上不启动中键平移 */
  const INTERACTIVE_SELECTOR =
    'button, a, input, select, textarea, [role="button"], [contenteditable="true"]'
  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    const el = target instanceof Element ? target : null
    if (!el) return false
    return !!el.closest(INTERACTIVE_SELECTOR)
  }

  /** 屏幕像素 → viewBox 单位换算系数 */
  const clientToViewBoxScale = (): number => {
    const svg = svgRef.value
    if (!svg) return 1
    const rect = svg.getBoundingClientRect()
    const shortSide = Math.min(rect.width, rect.height)
    if (shortSide === 0) return 1
    // 优先从 SVG viewBox 属性动态读取（支持 viewBox 变化，如全星官模式 3600×3600）
    const vb = svg.getAttribute('viewBox')
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number)
      if (parts.length >= 3 && parts[2] !== undefined && parts[2] > 0) return parts[2] / shortSide
    }
    // preserveAspectRatio="xMidYMid meet"：短边等于 viewBox 边长的映射
    return viewBoxSize / shortSide
  }

  /**
   * 视口几何：屏幕坐标 ↔ viewBox 坐标
   *
   * 各罗盘 View 的 SVG 都是正方形 viewBox（1200，苏州盘全星官模式为 1200×3），
   * 且罗盘中心恒等于 viewBox 中心，所以这套换算对全部罗盘通用。
   */
  const viewBoxGeometry = (svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect()
    let vbW = viewBoxSize
    let vbH = viewBoxSize
    const vb = svg.getAttribute('viewBox')
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number)
      if (parts.length >= 4 && parts[2]! > 0 && parts[3]! > 0) {
        vbW = parts[2]!
        vbH = parts[3]!
      }
    }
    const scale = Math.min(rect.width / vbW, rect.height / vbH) || 1
    return {
      rect,
      scale,
      originX: (rect.width - vbW * scale) / 2,
      originY: (rect.height - vbH * scale) / 2,
      centerX: vbW / 2,
      centerY: vbH / 2
    }
  }

  /**
   * 以「光标位置为锚」缩放
   *
   * View 的变换链是 translate(C + offset) scale(z) rotate(θ)，内容以原点（= 罗盘中心）为轴。
   * 设光标在 viewBox 坐标为 c，当前平移 T = C + offset，缩放 z → z'：
   *   要让光标下的内容点原地不动，需 T' = c - (z'/z)·(c - T)
   * 旋转项在推导中约掉，因此与 rotationAngle 无关。
   */
  const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const svg = svgRef.value
    if (!svg || !zoomLevel) return
    const z0 = zoomLevel.value
    const z1 = Math.max(zoomMin, Math.min(zoomMax, Number(nextZoom.toFixed(4))))
    if (z1 === z0) return

    const geo = viewBoxGeometry(svg)
    // 屏幕像素 → viewBox 坐标（viewBox 在元素内居中，故要减掉 origin 再除以比例）
    const cx = (clientX - geo.rect.left - geo.originX) / geo.scale
    const cy = (clientY - geo.rect.top - geo.originY) / geo.scale
    const tx = geo.centerX + offsetX.value
    const ty = geo.centerY + offsetY.value
    const k = z1 / z0
    offsetX.value = cx - k * (cx - tx) - geo.centerX
    offsetY.value = cy - k * (cy - ty) - geo.centerY
    zoomLevel.value = z1
  }

  const onPointerDown = (e: Event) => {
    const ev = e as PointerEvent
    // 两种平移手势：
    //   · 中键（button 1）→ 直接拖拽平移（CAD 习惯）
    //   · Alt + 左键（button 0）→ 兼容没有中键的设备
    const isMiddle = ev.button === 1
    const isAltLeft = ev.button === 0 && ev.altKey
    if (!isMiddle && !isAltLeft) return

    const svg = svgRef.value
    if (!svg) return

    // 中键：容器内任意空白处都可平移（遮罩层也在内），但按在按钮/链接上不启动
    if (isMiddle) {
      if (isInteractiveTarget(ev.target)) return
    } else {
      // Alt+左键：仅限盘面内部，保持原有行为
      if (!isInsideSvg(ev.target)) return
    }

    ev.preventDefault()
    isDragging.value = true
    isMiddlePanning.value = isMiddle
    startClientX = ev.clientX
    startClientY = ev.clientY
    startOffsetX = offsetX.value
    startOffsetY = offsetY.value
    activePointerId = ev.pointerId
    lockBodyCursor()

    // 用 SVG 元素作为 pointer capture 目标，保证 move / up 都能收到
    // （事件从 SVG 冒泡到父容器，容器上的监听同样能收到）
    try {
      svg.setPointerCapture(ev.pointerId)
    } catch {
      // 某些环境不支持 pointer capture，忽略即可（fallback 到 window 监听）
    }
  }

  const onPointerMove = (e: Event) => {
    if (!isDragging.value) return
    const ev = e as PointerEvent
    if (activePointerId !== null && ev.pointerId !== activePointerId) return

    const scale = clientToViewBoxScale()
    const dx = (ev.clientX - startClientX) * scale
    const dy = (ev.clientY - startClientY) * scale
    offsetX.value = startOffsetX + dx
    offsetY.value = startOffsetY + dy
  }

  const endDrag = (e?: Event) => {
    if (!isDragging.value) return
    isDragging.value = false
    isMiddlePanning.value = false
    unlockBodyCursor()
    const svg = svgRef.value
    if (svg && activePointerId !== null) {
      try {
        svg.releasePointerCapture(activePointerId)
      } catch {
        // ignore
      }
    }
    activePointerId = null
    void e
  }

  /**
   * 中键的浏览器默认行为要拦掉：
   *   · Firefox：中键按下即触发「自动滚动」光标
   *   · Chrome：中键点击链接会在新标签打开
   * 拦掉后中键就是纯平移手势。
   */
  const onMouseDown = (e: Event) => {
    const ev = e as MouseEvent
    if (ev.button !== 1) return
    ev.preventDefault()
  }

  const onAuxClick = (e: Event) => {
    const ev = e as MouseEvent
    if (ev.button !== 1) return
    ev.preventDefault()
  }

  /**
   * 滚轮 → 以光标为锚缩放（滚上放大，滚下缩小）
   *
   * 不再要求按住 Alt：罗盘页本身不可滚动，滚轮专用于缩放更符合直觉；
   * Alt + 滚轮同样生效（行为一致）。
   */
  const onWheel = (e: Event) => {
    const ev = e as WheelEvent
    if (!zoomLevel) return
    const dir = Math.sign(ev.deltaY)
    if (dir === 0) return
    // 阻止页面滚动，让罗盘独占滚轮（wheel 必须 passive:false 才能拦截）
    ev.preventDefault()
    const factor = dir < 0 ? wheelFactor : 1 / wheelFactor
    zoomAt(ev.clientX, ev.clientY, zoomLevel.value * factor)
  }

  /** 双击 → 在光标处放大（当前 < 150% 放大到 250%，否则复位 100%） */
  const onDoubleClick = (e: Event) => {
    const ev = e as MouseEvent
    if (!zoomLevel) return
    zoomAt(ev.clientX, ev.clientY, zoomLevel.value < 1.5 ? 2.5 : 1)
  }

  // Alt 键按下 / 松开 → 控制 cursor 视觉反馈
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Alt' || e.altKey) isAltPressed.value = true
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Alt' || !e.altKey) isAltPressed.value = false
  }
  // 窗口失焦 → 清除 Alt 状态，避免 cursor 卡在 grab
  const onBlur = () => {
    isAltPressed.value = false
    endDrag()
  }

  // 所有交互事件都挂在 SVG 的父容器上（而不是 SVG 本身）：
  //   · SVG 内的 pointerdown 会冒泡到容器 → 原行为不变
  //   · 某些罗盘（如二十四山风水盘）有全屏授权遮罩盖在 SVG 之上，
  //     事件从遮罩冒泡到父容器仍能被收到，遮罩未关闭时也能缩放 / 中键平移。
  let zoomTarget: Element | null = null

  const attach = (svg: SVGSVGElement) => {
    zoomTarget = svg.parentElement ?? svg
    zoomTarget.addEventListener('pointerdown', onPointerDown)
    zoomTarget.addEventListener('pointermove', onPointerMove)
    zoomTarget.addEventListener('pointerup', endDrag)
    zoomTarget.addEventListener('pointercancel', endDrag)
    zoomTarget.addEventListener('mousedown', onMouseDown)
    zoomTarget.addEventListener('auxclick', onAuxClick)
    zoomTarget.addEventListener('dblclick', onDoubleClick)
    // wheel 必须 passive:false 才能 preventDefault 拦截页面滚动
    zoomTarget.addEventListener('wheel', onWheel, { passive: false })
  }

  const detach = (_svg: SVGSVGElement) => {
    if (zoomTarget) {
      zoomTarget.removeEventListener('pointerdown', onPointerDown)
      zoomTarget.removeEventListener('pointermove', onPointerMove)
      zoomTarget.removeEventListener('pointerup', endDrag)
      zoomTarget.removeEventListener('pointercancel', endDrag)
      zoomTarget.removeEventListener('mousedown', onMouseDown)
      zoomTarget.removeEventListener('auxclick', onAuxClick)
      zoomTarget.removeEventListener('dblclick', onDoubleClick)
      zoomTarget.removeEventListener('wheel', onWheel)
      zoomTarget = null
    }
  }

  onMounted(() => {
    if (svgRef.value) attach(svgRef.value)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
  })

  // svgRef 后挂载（ClientOnly / 异步渲染）也能生效
  watch(svgRef, (svg, prev) => {
    if (prev) detach(prev)
    if (svg) attach(svg)
  })

  onBeforeUnmount(() => {
    if (svgRef.value) detach(svgRef.value)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    // 组件卸载时若仍在拖拽，必须把 body 的光标 / 选中状态还回去
    endDrag()
    unlockBodyCursor()
  })

  return { isDragging, isAltPressed, isMiddlePanning }
}
