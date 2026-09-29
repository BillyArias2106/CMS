'use client'

import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

import {
  clamp,
  getVisualContentClassName,
  getVisualContentStyle,
  normalizeLayerOverride,
  round,
  setActiveVisualEditElement,
  subscribeToVisualEdit,
  syncActiveVisualEditElement,
  updateVisualEditOverride,
  type VisualLayerOverride,
} from './visual-edit-store'
import { useResponsiveEditor } from './useResponsiveEditor'

export { getVisualContentClassName, getVisualContentStyle }
export type { VisualLayerOverride }

type VisualEditWrapperProps = {
  children: ReactNode
  className?: string
  displayBlock?: boolean
  fieldPath: string
  isPreview?: boolean
  label?: string
  maxWidth?: string
  sectionIndex?: number
  visualOverrides?: Record<string, unknown> | null
}

type ResizeHandle = 'e' | 'n' | 'ne' | 'nw' | 's' | 'se' | 'sw' | 'w'

const SNAP_THRESHOLD = 8
const SIBLING_SNAP_THRESHOLD = 5

type RelativeRect = {
  bottom: number
  centerX: number
  centerY: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

type GuideElements = {
  horizontal: HTMLDivElement
  overlay: HTMLDivElement
  vertical: HTMLDivElement
}

type SnapCandidate = {
  distance: number
  lineEnd: number
  lineStart: number
  lineValue: number
  offset: number
  type: 'center' | 'sibling'
}

const getTransform = (override: VisualLayerOverride) =>
  `translate3d(${override.x ?? 0}px, ${override.y ?? 0}px, 0) rotate(${override.rotation ?? 0}deg)`

const TYPEWRITER_ANIMATION = 'visual-animate-typewriter'
const MOBILE_OVERRIDE_BREAKPOINT = 768
const TABLET_OVERRIDE_BREAKPOINT = 1024

const getResponsiveLayerOverride = ({
  fieldPath,
  override,
  viewportWidth,
}: {
  fieldPath: string
  override: VisualLayerOverride
  viewportWidth: number
}): VisualLayerOverride => {
  if (viewportWidth <= 0 || viewportWidth > TABLET_OVERRIDE_BREAKPOINT) {
    return override
  }

  const isMobileViewport = viewportWidth <= MOBILE_OVERRIDE_BREAKPOINT
  const safeWidth = Math.max(260, viewportWidth - (isMobileViewport ? 32 : 64))
  const isTitle = fieldPath === 'title' || fieldPath.endsWith('.title')
  const isDescription =
    fieldPath === 'description' ||
    fieldPath === 'intro' ||
    fieldPath.endsWith('.description')
  const isEyebrow = fieldPath === 'eyebrow'
  const mobileFontSize =
    typeof override.fontSize === 'number'
      ? Math.min(
          override.fontSize,
          isMobileViewport
            ? isTitle ? 40 : isDescription ? 21 : isEyebrow ? 13 : 24
            : isTitle ? 56 : isDescription ? 24 : isEyebrow ? 14 : 28,
        )
      : undefined

  return {
    ...override,
    fontSize: mobileFontSize ?? override.fontSize,
    height: isTitle || isDescription || isEyebrow ? undefined : override.height,
    rotation: Math.abs(override.rotation ?? 0) > (isMobileViewport ? 8 : 12) ? 0 : override.rotation,
    width: typeof override.width === 'number' ? Math.min(override.width, safeWidth) : undefined,
    x: isMobileViewport ? 0 : typeof override.x === 'number' ? clamp(override.x, -32, 32) : override.x,
    y: override.y ? clamp(override.y, isMobileViewport ? -24 : -48, isMobileViewport ? 24 : 48) : override.y,
  }
}

const getBoxStyle = ({
  maxWidth,
  override,
}: {
  maxWidth: string
  override: VisualLayerOverride
}): CSSProperties => ({
  height: override.height ? `${override.height}px` : undefined,
  maxWidth: override.width ? '100%' : `min(100%, ${maxWidth})`,
  minWidth: 0,
  overflowWrap: 'break-word',
  position: 'relative',
  transform: getTransform(override),
  transformOrigin: 'center center',
  willChange: 'transform, width, height',
  width: override.width ? `${override.width}px` : 'max-content',
  wordBreak: 'break-word',
  zIndex: override.zIndex ?? (typeof override.x === 'number' ||
  typeof override.y === 'number' ||
  typeof override.rotation === 'number'
    ? 40
    : undefined),
})

const getCurrentFontSize = (element: HTMLElement | null, fallback?: number) => {
  if (!element) {
    return fallback ?? 18
  }

  const computed = Number.parseFloat(window.getComputedStyle(element).fontSize)

  return Number.isFinite(computed) ? computed : fallback ?? 18
}

const toRelativeRect = (rect: DOMRect, parentRect: DOMRect): RelativeRect => {
  const left = rect.left - parentRect.left
  const top = rect.top - parentRect.top
  const width = rect.width
  const height = rect.height

  return {
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    height,
    left,
    right: left + width,
    top,
    width,
  }
}

const getMovedRect = ({
  deltaX,
  deltaY,
  startRect,
}: {
  deltaX: number
  deltaY: number
  startRect: RelativeRect
}): RelativeRect => {
  const left = startRect.left + deltaX
  const top = startRect.top + deltaY

  return {
    bottom: top + startRect.height,
    centerX: left + startRect.width / 2,
    centerY: top + startRect.height / 2,
    height: startRect.height,
    left,
    right: left + startRect.width,
    top,
    width: startRect.width,
  }
}

const getSiblingSnapCandidates = ({
  movingRect,
  siblings,
}: {
  movingRect: RelativeRect
  siblings: RelativeRect[]
}) => {
  let bestX: SnapCandidate | null = null
  let bestY: SnapCandidate | null = null
  const xPoints = [
    { key: 'left', value: movingRect.left },
    { key: 'centerX', value: movingRect.centerX },
    { key: 'right', value: movingRect.right },
  ] as const
  const yPoints = [
    { key: 'top', value: movingRect.top },
    { key: 'centerY', value: movingRect.centerY },
    { key: 'bottom', value: movingRect.bottom },
  ] as const

  siblings.forEach((sibling) => {
    const siblingXPoints = [
      sibling.left,
      sibling.centerX,
      sibling.right,
    ]
    const siblingYPoints = [
      sibling.top,
      sibling.centerY,
      sibling.bottom,
    ]

    xPoints.forEach((movingPoint) => {
      siblingXPoints.forEach((siblingValue) => {
        const distance = Math.abs(movingPoint.value - siblingValue)

        if (distance >= SIBLING_SNAP_THRESHOLD || distance >= (bestX?.distance ?? Infinity)) {
          return
        }

        bestX = {
          distance,
          lineEnd: Math.max(movingRect.bottom, sibling.bottom),
          lineStart: Math.min(movingRect.top, sibling.top),
          lineValue: siblingValue,
          offset: siblingValue - movingPoint.value,
          type: 'sibling',
        }
      })
    })

    yPoints.forEach((movingPoint) => {
      siblingYPoints.forEach((siblingValue) => {
        const distance = Math.abs(movingPoint.value - siblingValue)

        if (distance >= SIBLING_SNAP_THRESHOLD || distance >= (bestY?.distance ?? Infinity)) {
          return
        }

        bestY = {
          distance,
          lineEnd: Math.max(movingRect.right, sibling.right),
          lineStart: Math.min(movingRect.left, sibling.left),
          lineValue: siblingValue,
          offset: siblingValue - movingPoint.value,
          type: 'sibling',
        }
      })
    })
  })

  return { bestX, bestY }
}

const showVerticalGuide = ({
  bottom,
  guides,
  isSibling = false,
  left,
  top,
}: {
  bottom: number
  guides: GuideElements
  isSibling?: boolean
  left: number
  top: number
}) => {
  guides.vertical.style.borderLeft = isSibling ? '2px solid #ec4899' : '2px dashed #d946ef'
  guides.vertical.style.bottom = 'auto'
  guides.vertical.style.height = `${Math.max(1, bottom - top)}px`
  guides.vertical.style.left = `${left}px`
  guides.vertical.style.opacity = '1'
  guides.vertical.style.top = `${top}px`
}

const showHorizontalGuide = ({
  guides,
  isSibling = false,
  left,
  right,
  top,
}: {
  guides: GuideElements
  isSibling?: boolean
  left: number
  right: number
  top: number
}) => {
  guides.horizontal.style.borderTop = isSibling ? '2px solid #ec4899' : '2px dashed #d946ef'
  guides.horizontal.style.left = `${left}px`
  guides.horizontal.style.opacity = '1'
  guides.horizontal.style.right = 'auto'
  guides.horizontal.style.top = `${top}px`
  guides.horizontal.style.width = `${Math.max(1, right - left)}px`
}

const getHandleClassName = (handle: ResizeHandle) =>
  twMerge(
    'pointer-events-auto absolute z-50 rounded-full border-2 border-white bg-[#7c3aed] shadow-[0_0_0_3px_rgba(124,58,237,0.2),0_0_20px_rgba(59,130,246,0.42)] transition-transform hover:scale-125',
    handle === 'n' ? '-top-1.5 left-1/2 h-3 w-8 -translate-x-1/2 cursor-ns-resize' : '',
    handle === 's' ? '-bottom-1.5 left-1/2 h-3 w-8 -translate-x-1/2 cursor-ns-resize' : '',
    handle === 'e' ? '-right-1.5 top-1/2 h-8 w-3 -translate-y-1/2 cursor-ew-resize' : '',
    handle === 'w' ? '-left-1.5 top-1/2 h-8 w-3 -translate-y-1/2 cursor-ew-resize' : '',
    handle === 'nw' ? '-left-2 -top-2 h-4 w-4 cursor-nwse-resize' : '',
    handle === 'ne' ? '-right-2 -top-2 h-4 w-4 cursor-nesw-resize' : '',
    handle === 'sw' ? '-bottom-2 -left-2 h-4 w-4 cursor-nesw-resize' : '',
    handle === 'se' ? '-bottom-2 -right-2 h-4 w-4 cursor-nwse-resize' : '',
  )

export function VisualEditWrapper({
  children,
  className,
  displayBlock = true,
  fieldPath,
  isPreview = false,
  label,
  maxWidth = '48rem',
  sectionIndex,
  visualOverrides,
}: VisualEditWrapperProps) {
  const wrapperId = useId()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const latestOverrideRef = useRef<VisualLayerOverride>(
    normalizeLayerOverride(visualOverrides?.[fieldPath]),
  )
  const guidesOverlayRef = useRef<HTMLDivElement | null>(null)
  const verticalGuideRef = useRef<HTMLDivElement | null>(null)
  const horizontalGuideRef = useRef<HTMLDivElement | null>(null)
  const typewriterTimersRef = useRef<number[]>([])
  const typewriterOriginalHtmlRef = useRef<string | null>(null)
  const typewriterOriginalTextRef = useRef<string | null>(null)
  const typewriterTargetRef = useRef<HTMLElement | null>(null)
  const typewriterTargetStylesRef = useRef<{
    minHeight: string
    minWidth: string
    width: string
  } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [override, setOverride] = useState<VisualLayerOverride>(() =>
    normalizeLayerOverride(visualOverrides?.[fieldPath]),
  )
  const { editorMode, isMobile, viewportWidth } = useResponsiveEditor()
  const canEdit = isPreview && typeof sectionIndex === 'number'
  const isActive = canEdit && activeId === wrapperId
  const canUseAbsoluteEditing = canEdit && editorMode !== 'flow'
  const responsiveOverride = getResponsiveLayerOverride({
    fieldPath,
    override,
    viewportWidth,
  })

  const activate = () => {
    if (typeof sectionIndex !== 'number') {
      return
    }

    setActiveVisualEditElement({
      fieldPath,
      id: wrapperId,
      label,
      override,
      sectionIndex,
      visualOverrides,
    })
  }

  useEffect(
    () =>
      subscribeToVisualEdit((snapshot) => {
        setActiveId(snapshot.activeElement?.id ?? null)

        if (snapshot.activeElement?.id === wrapperId) {
          latestOverrideRef.current = snapshot.activeElement.override
          setOverride(snapshot.activeElement.override)
        }
      }),
    [wrapperId],
  )

  useEffect(() => {
    const nextOverride = normalizeLayerOverride(visualOverrides?.[fieldPath])

    latestOverrideRef.current = nextOverride
    setOverride(nextOverride)
    syncActiveVisualEditElement({
      fieldPath,
      id: wrapperId,
      label,
      sectionIndex,
      visualOverrides,
    })
  }, [fieldPath, label, sectionIndex, visualOverrides, wrapperId])

  useEffect(() => {
    const element = wrapperRef.current

    if (!element) {
      return
    }

    if (!canUseAbsoluteEditing && isMobile) {
      element.style.height = ''
      element.style.maxWidth = '100%'
      element.style.transform = ''
      element.style.width = '100%'
      return
    }

    element.style.transform = getTransform(responsiveOverride)
    element.style.width = responsiveOverride.width ? `${responsiveOverride.width}px` : 'max-content'
    element.style.height = responsiveOverride.height ? `${responsiveOverride.height}px` : ''
  }, [canUseAbsoluteEditing, isMobile, responsiveOverride])

  const ensureGuidesOverlay = (container: HTMLElement) => {
    if (
      guidesOverlayRef.current &&
      verticalGuideRef.current &&
      horizontalGuideRef.current &&
      guidesOverlayRef.current.parentElement === container
    ) {
      return {
        horizontal: horizontalGuideRef.current,
        overlay: guidesOverlayRef.current,
        vertical: verticalGuideRef.current,
      }
    }

    guidesOverlayRef.current?.remove()

    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }

    const overlay = document.createElement('div')
    const vertical = document.createElement('div')
    const horizontal = document.createElement('div')

    overlay.setAttribute('data-visual-edit-guides', 'true')
    overlay.style.position = 'absolute'
    overlay.style.inset = '0'
    overlay.style.opacity = '0'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '99999'

    vertical.style.position = 'absolute'
    vertical.style.top = '0'
    vertical.style.bottom = '0'
    vertical.style.width = '0'
    vertical.style.borderLeft = '2px dashed #d946ef'
    vertical.style.boxShadow = '0 0 22px rgba(217,70,239,0.9)'
    vertical.style.opacity = '0'

    horizontal.style.position = 'absolute'
    horizontal.style.left = '0'
    horizontal.style.right = '0'
    horizontal.style.height = '0'
    horizontal.style.borderTop = '2px dashed #d946ef'
    horizontal.style.boxShadow = '0 0 22px rgba(217,70,239,0.9)'
    horizontal.style.opacity = '0'

    overlay.append(vertical, horizontal)
    container.append(overlay)
    guidesOverlayRef.current = overlay
    verticalGuideRef.current = vertical
    horizontalGuideRef.current = horizontal

    return { horizontal, overlay, vertical }
  }

  const hideGuides = () => {
    if (guidesOverlayRef.current) {
      guidesOverlayRef.current.style.opacity = '0'
    }

    if (verticalGuideRef.current) {
      verticalGuideRef.current.style.opacity = '0'
    }

    if (horizontalGuideRef.current) {
      horizontalGuideRef.current.style.opacity = '0'
    }
  }

  const clearTypewriterTimers = () => {
    typewriterTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    typewriterTimersRef.current = []
  }

  const restoreTypewriterText = () => {
    clearTypewriterTimers()

    const element = typewriterTargetRef.current ?? contentRef.current

    if (!element || typewriterOriginalHtmlRef.current === null) {
      return
    }

    element.innerHTML = typewriterOriginalHtmlRef.current
    element.removeAttribute('aria-label')

    if (typewriterTargetStylesRef.current) {
      element.style.minHeight = typewriterTargetStylesRef.current.minHeight
      element.style.minWidth = typewriterTargetStylesRef.current.minWidth
      element.style.width = typewriterTargetStylesRef.current.width
    }

    typewriterOriginalHtmlRef.current = null
    typewriterOriginalTextRef.current = null
    typewriterTargetRef.current = null
    typewriterTargetStylesRef.current = null
  }

  const startTypewriterAnimation = () => {
    const contentElement = contentRef.current

    if (!contentElement) {
      return
    }

    clearTypewriterTimers()

    const element = (contentElement.firstElementChild as HTMLElement | null) ?? contentElement
    const originalText = typewriterOriginalTextRef.current ?? element.textContent ?? ''
    const characters = Array.from(originalText)
    const measuredRect = element.getBoundingClientRect()

    typewriterOriginalHtmlRef.current ??= element.innerHTML
    typewriterOriginalTextRef.current = originalText
    typewriterTargetRef.current = element
    typewriterTargetStylesRef.current ??= {
      minHeight: element.style.minHeight,
      minWidth: element.style.minWidth,
      width: element.style.width,
    }

    // Reserve the final text box before typing so the animation never pushes layout.
    if (!latestOverrideRef.current.width && measuredRect.width > 0) {
      element.style.width = `${Math.ceil(measuredRect.width)}px`
      element.style.minWidth = `${Math.ceil(measuredRect.width)}px`
    }

    if (!latestOverrideRef.current.height && measuredRect.height > 0) {
      element.style.minHeight = `${Math.ceil(measuredRect.height)}px`
    }

    element.setAttribute('aria-label', originalText)
    element.textContent = ''

    if (characters.length === 0) {
      return
    }

    const durationMs = Math.max(300, (latestOverrideRef.current.animationDuration ?? 1.6) * 1000)
    const delayMs = Math.max(0, (latestOverrideRef.current.animationDelay ?? 0) * 1000)
    const stepMs = Math.max(24, durationMs / characters.length)
    const shouldLoop = Boolean(latestOverrideRef.current.animationLoop)

    const queue = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(callback, delay)

      typewriterTimersRef.current.push(timer)
      return timer
    }

    const run = () => {
      let index = 0

      const tick = () => {
        index += 1
        element.textContent = characters.slice(0, index).join('')

        if (index < characters.length) {
          queue(tick, stepMs)
          return
        }

        if (shouldLoop) {
          queue(() => {
            element.textContent = ''
            run()
          }, Math.max(delayMs, 650))
        }
      }

      tick()
    }

    queue(run, delayMs)
  }

  useEffect(
    () => () => {
      guidesOverlayRef.current?.remove()
      clearTypewriterTimers()
    },
    [],
  )

  useEffect(() => {
    if (override.animation !== TYPEWRITER_ANIMATION) {
      restoreTypewriterText()
      return
    }

    typewriterOriginalTextRef.current = null
    startTypewriterAnimation()

    return () => {
      restoreTypewriterText()
    }
  }, [
    children,
    override.animation,
    override.animationDelay,
    override.animationDuration,
    override.animationLoop,
  ])

  useEffect(() => {
    if (!canEdit || !isActive) {
      return
    }

    const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement | null

      if (target?.closest('[data-visual-edit-control]')) {
        return
      }

      if (target?.closest('[data-visual-edit-wrapper]')) {
        return
      }

      if (!wrapperRef.current?.contains(event.target as Node)) {
        setActiveVisualEditElement(null)
      }
    }

    window.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => window.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [canEdit, isActive])

  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!canEdit || event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement

    event.preventDefault()
    event.stopPropagation()
    activate()

    if (!canUseAbsoluteEditing) {
      return
    }

    if (target.closest('[data-visual-edit-control]')) {
      return
    }

    const element = wrapperRef.current
    const parent =
      (element?.closest('[data-visual-slice-root]') as HTMLElement | null) ?? element?.parentElement

    if (!element || !parent) {
      return
    }

    const startX = event.clientX
    const startY = event.clientY
    const startOverride = latestOverrideRef.current
    const currentX = startOverride.x ?? 0
    const currentY = startOverride.y ?? 0
    const currentRotation = startOverride.rotation ?? 0
    const dragLimitX = Math.max(600, window.innerWidth)
    const dragLimitY = Math.max(600, window.innerHeight)
    const elementRect = element.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect()
    const startRelativeRect = toRelativeRect(elementRect, parentRect)
    const parentCenterX = parentRect.width / 2
    const parentCenterY = parentRect.height / 2
    const siblingRects = Array.from(
      parent.querySelectorAll<HTMLElement>('[data-visual-edit-wrapper]'),
    )
      .filter(
        (node) => node !== element && !node.contains(element) && !element.contains(node),
      )
      .map((node) => toRelativeRect(node.getBoundingClientRect(), parentRect))
    const guides = ensureGuidesOverlay(parent)
    let latestX = currentX
    let latestY = currentY

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      let nextX = currentX + deltaX
      let nextY = currentY + deltaY
      const movingRect = getMovedRect({ deltaX, deltaY, startRect: startRelativeRect })
      const siblingSnap = getSiblingSnapCandidates({ movingRect, siblings: siblingRects })
      const parentCenterXDistance = Math.abs(movingRect.centerX - parentCenterX)
      const parentCenterYDistance = Math.abs(movingRect.centerY - parentCenterY)
      const parentXSnap: SnapCandidate | null =
        parentCenterXDistance < SNAP_THRESHOLD
          ? {
              distance: parentCenterXDistance,
              lineEnd: parentRect.height,
              lineStart: 0,
              lineValue: parentCenterX,
              offset: parentCenterX - movingRect.centerX,
              type: 'center',
            }
          : null
      const parentYSnap: SnapCandidate | null =
        parentCenterYDistance < SNAP_THRESHOLD
          ? {
              distance: parentCenterYDistance,
              lineEnd: parentRect.width,
              lineStart: 0,
              lineValue: parentCenterY,
              offset: parentCenterY - movingRect.centerY,
              type: 'center',
            }
          : null
      const xSnap = siblingSnap.bestX ?? parentXSnap
      const ySnap = siblingSnap.bestY ?? parentYSnap

      if (xSnap) {
        nextX += xSnap.offset
      }

      if (ySnap) {
        nextY += ySnap.offset
      }

      latestX = round(clamp(nextX, -dragLimitX, dragLimitX))
      latestY = round(clamp(nextY, -dragLimitY, dragLimitY))
      element.style.transform = `translate3d(${latestX}px, ${latestY}px, 0) rotate(${currentRotation}deg)`

      guides.overlay.style.opacity = xSnap || ySnap ? '1' : '0'

      if (xSnap) {
        showVerticalGuide({
          bottom: xSnap.lineEnd,
          guides,
          isSibling: xSnap.type === 'sibling',
          left: xSnap.lineValue,
          top: xSnap.lineStart,
        })
      } else {
        guides.vertical.style.opacity = '0'
      }

      if (ySnap) {
        showHorizontalGuide({
          guides,
          isSibling: ySnap.type === 'sibling',
          left: ySnap.lineStart,
          right: ySnap.lineEnd,
          top: ySnap.lineValue,
        })
      } else {
        guides.horizontal.style.opacity = '0'
      }
    }

    const handlePointerUp = () => {
      hideGuides()
      latestOverrideRef.current = { ...latestOverrideRef.current, x: latestX, y: latestY }
      updateVisualEditOverride({ x: latestX, y: latestY }, true)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
  }

  const startResize = (handle: ResizeHandle) => (event: PointerEvent<HTMLButtonElement>) => {
    if (!canUseAbsoluteEditing || event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    activate()

    const element = wrapperRef.current

    if (!element) {
      return
    }

    const startX = event.clientX
    const startY = event.clientY
    const startOverride = latestOverrideRef.current
    const startRect = element.getBoundingClientRect()
    const startWidth = startOverride.width ?? startRect.width
    const startHeight = startOverride.height ?? startRect.height
    const startFontSize = startOverride.fontSize ?? getCurrentFontSize(contentRef.current)
    const parentWidth =
      element.parentElement?.clientWidth && element.parentElement.clientWidth > 0
        ? element.parentElement.clientWidth
        : window.innerWidth
    const availableViewportWidth = Math.max(80, window.innerWidth - 24)
    const maxWidthPx = Math.max(80, Math.min(parentWidth, availableViewportWidth, 2400))
    let latestHeight = startOverride.height
    let latestWidth = startOverride.width
    let latestFontSize = startOverride.fontSize

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      if (handle.includes('e') || handle.includes('w')) {
        const direction = handle.includes('e') ? 1 : -1

        latestWidth = round(clamp(startWidth + deltaX * direction, 40, maxWidthPx))
        element.style.width = `${latestWidth}px`
      }

      if (handle.includes('n') || handle.includes('s')) {
        const direction = handle.includes('s') ? 1 : -1
        const diagonalBoost = handle.length === 2 ? Math.abs(deltaX) * 0.02 : 0

        latestHeight = round(clamp(startHeight + deltaY * direction, 10, 2400))
        latestFontSize = round(clamp(startFontSize + deltaY * direction * 0.18 + diagonalBoost, 10, 160))
        element.style.height = `${latestHeight}px`

        if (contentRef.current) {
          contentRef.current.style.fontSize = `${latestFontSize}px`
        }
      }
    }

    const handlePointerUp = () => {
      const patch: VisualLayerOverride = {
        ...(typeof latestHeight === 'number' ? { height: latestHeight } : {}),
        ...(typeof latestWidth === 'number' ? { width: latestWidth } : {}),
        ...(typeof latestFontSize === 'number' ? { fontSize: latestFontSize } : {}),
      }

      latestOverrideRef.current = { ...latestOverrideRef.current, ...patch }
      updateVisualEditOverride(patch, true)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
  }

  const startRotate = (event: PointerEvent<HTMLButtonElement>) => {
    if (!canUseAbsoluteEditing || event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    activate()

    const element = wrapperRef.current

    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX)
    const startOverride = latestOverrideRef.current
    const startRotation = startOverride.rotation ?? 0
    const currentX = startOverride.x ?? 0
    const currentY = startOverride.y ?? 0
    let latestRotation = startRotation

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX)
      const degrees = ((angle - startAngle) * 180) / Math.PI

      latestRotation = round(clamp(startRotation + degrees, -360, 360))
      element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${latestRotation}deg)`
    }

    const handlePointerUp = () => {
      latestOverrideRef.current = { ...latestOverrideRef.current, rotation: latestRotation }
      updateVisualEditOverride({ rotation: latestRotation }, true)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
  }

  const boxStyle = canUseAbsoluteEditing || !isMobile
    ? getBoxStyle({ maxWidth, override: responsiveOverride })
    : ({
        maxWidth: '100%',
        minWidth: 0,
        overflowWrap: 'break-word',
        position: 'relative',
        width: '100%',
        wordBreak: 'break-word',
      } as CSSProperties)
  const contentStyle = getVisualContentStyle({ [fieldPath]: responsiveOverride }, fieldPath)
  const replayAnimation = () => {
    const element = contentRef.current
    const animationClass = override.animation

    if (!element || !override.triggerOnClick || !animationClass || animationClass === 'none') {
      return
    }

    if (animationClass === TYPEWRITER_ANIMATION) {
      startTypewriterAnimation()
      return
    }

    element.classList.remove(animationClass)
    element.style.animation = 'none'
    void element.offsetWidth
    element.style.animation = ''
    element.classList.add(animationClass)
  }

  return (
    <div
      aria-label={label}
      className={twMerge(
        displayBlock ? 'block' : 'inline-block align-middle',
        'group/visual-edit relative w-fit max-w-full',
        canEdit
          ? 'cursor-move select-none rounded-xl outline outline-1 outline-transparent transition-[outline,box-shadow] duration-200 hover:outline-[#8b5cf6]/55 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] [&_a]:pointer-events-none'
          : '',
        isActive
          ? 'outline-[#2563eb] shadow-[0_0_0_4px_rgba(37,99,235,0.18),0_0_34px_rgba(124,58,237,0.22)]'
          : '',
        className,
      )}
      data-visual-edit-active={isActive ? 'true' : undefined}
      data-visual-edit-mode={editorMode}
      data-visual-edit-wrapper={wrapperId}
      onClick={(event) => {
        if (!canEdit) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        activate()
      }}
      onPointerDown={startMove}
      ref={wrapperRef}
      style={boxStyle}
    >
      <div
        className={twMerge(
          'max-w-full overflow-hidden',
          getVisualContentClassName({ [fieldPath]: responsiveOverride }, fieldPath),
        )}
        onClick={replayAnimation}
        ref={contentRef}
        style={contentStyle}
      >
        {children}
      </div>

      {isActive && !canUseAbsoluteEditing ? (
        <div className="pointer-events-none absolute -top-8 left-0 z-50 rounded-full border border-cyan-200/30 bg-slate-950/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 shadow-xl backdrop-blur">
          Modo responsive: posicionamiento deshabilitado
        </div>
      ) : null}

      {isActive && canUseAbsoluteEditing ? (
        <>
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((handle) => (
            <button
              aria-label={`Redimensionar ${label ?? fieldPath}`}
              className={getHandleClassName(handle)}
              data-visual-edit-control
              key={handle}
              onPointerDown={startResize(handle)}
              type="button"
            />
          ))}

          <button
            aria-label={`Rotar ${label ?? fieldPath}`}
            className="pointer-events-auto absolute -bottom-12 left-1/2 z-50 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border-2 border-white bg-white text-blue-700 shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition hover:scale-110"
            data-visual-edit-control
            onPointerDown={startRotate}
            type="button"
          >
            <RotateCw size={16} strokeWidth={2.5} />
          </button>
          <div className="pointer-events-none absolute -bottom-4 left-1/2 h-4 w-px -translate-x-1/2 bg-blue-500/70" />
        </>
      ) : null}
    </div>
  )
}
