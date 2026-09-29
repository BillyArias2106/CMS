'use client'

import type { CSSProperties } from 'react'
import { twMerge } from 'tailwind-merge'

export type TextAlign = 'center' | 'justify' | 'left' | 'right'
export type FontStyle = 'italic' | 'normal'
export type FontWeight = 'bold' | 'normal'
export type TextDecoration = 'line-through' | 'none' | 'underline'
export type TextTransform = 'lowercase' | 'none' | 'uppercase'
export type ListStyle = 'decimal' | 'disc' | 'none'
export type VisualAnimation =
  | 'visual-animate-blink'
  | 'visual-animate-bounce-in'
  | 'visual-animate-fade-in'
  | 'visual-animate-pulse'
  | 'visual-animate-shake'
  | 'visual-animate-slide-in'
  | 'visual-animate-slide-up'
  | 'visual-animate-spin'
  | 'visual-animate-typewriter'
  | 'visual-animate-wipe-in'
  | 'visual-animate-zoom-in'
  | 'none'

export type VisualLayerOverride = {
  backgroundColor?: string
  color?: string
  fontFamily?: string
  fontSize?: number
  fontStyle?: FontStyle
  fontWeight?: FontWeight
  height?: number
  letterSpacing?: number
  lineHeight?: number
  listStyle?: ListStyle
  opacity?: number
  rotation?: number
  textAlign?: TextAlign
  textDecoration?: TextDecoration
  textTransform?: TextTransform
  triggerOnClick?: boolean
  width?: number
  x?: number
  y?: number
  zIndex?: number
  animation?: VisualAnimation
  animationDelay?: number
  animationDuration?: number
  animationLoop?: boolean
}

export type VisualOverrides = Record<string, VisualLayerOverride>

export type VisualEditActiveElement = {
  fieldPath: string
  id: string
  label?: string
  override: VisualLayerOverride
  sectionIndex: number
  visualOverrides?: Record<string, unknown> | null
}

export type VisualEditSnapshot = {
  activeElement: VisualEditActiveElement | null
}

type VisualEditUpdate = {
  path: string
  value: unknown
}

type VisualEditListener = (snapshot: VisualEditSnapshot) => void

const listeners = new Set<VisualEditListener>()
const draftOverridesBySection = new Map<number, VisualOverrides>()
const debounceTimersBySection = new Map<number, number>()

let activeElement: VisualEditActiveElement | null = null

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const round = (value: number) => Math.round(value * 100) / 100

const isColor = (value: unknown): value is string =>
  typeof value === 'string' &&
  (value === 'transparent' || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))

const getNumber = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : undefined

const getBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined)

const getString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined

const getTextAlign = (value: unknown): TextAlign | undefined =>
  value === 'left' || value === 'center' || value === 'right' || value === 'justify'
    ? value
    : undefined

const getFontStyle = (value: unknown): FontStyle | undefined =>
  value === 'italic' || value === 'normal' ? value : undefined

const getFontWeight = (value: unknown): FontWeight | undefined =>
  value === 'bold' || value === 'normal' ? value : undefined

const getTextDecoration = (value: unknown): TextDecoration | undefined =>
  value === 'underline' || value === 'line-through' || value === 'none' ? value : undefined

const getTextTransform = (value: unknown): TextTransform | undefined =>
  value === 'uppercase' || value === 'lowercase' || value === 'none' ? value : undefined

const getListStyle = (value: unknown): ListStyle | undefined =>
  value === 'disc' || value === 'decimal' || value === 'none' ? value : undefined

const getAnimation = (value: unknown): VisualAnimation | undefined =>
  value === 'visual-animate-fade-in' ||
  value === 'visual-animate-slide-up' ||
  value === 'visual-animate-slide-in' ||
  value === 'visual-animate-typewriter' ||
  value === 'visual-animate-zoom-in' ||
  value === 'visual-animate-bounce-in' ||
  value === 'visual-animate-wipe-in' ||
  value === 'visual-animate-spin' ||
  value === 'visual-animate-pulse' ||
  value === 'visual-animate-blink' ||
  value === 'visual-animate-shake' ||
  value === 'none'
    ? value
    : undefined

export const normalizeLayerOverride = (value: unknown): VisualLayerOverride => {
  if (!isRecord(value)) {
    return {}
  }

  return {
    backgroundColor: isColor(value.backgroundColor) ? value.backgroundColor : undefined,
    color: isColor(value.color) ? value.color : undefined,
    fontFamily: getString(value.fontFamily),
    fontSize: getNumber(value.fontSize, 10, 160),
    fontStyle: getFontStyle(value.fontStyle),
    fontWeight: getFontWeight(value.fontWeight),
    height: getNumber(value.height, 10, 2400),
    letterSpacing: getNumber(value.letterSpacing, -10, 30),
    lineHeight: getNumber(value.lineHeight, 0.75, 3),
    listStyle: getListStyle(value.listStyle),
    opacity: getNumber(value.opacity, 0, 100),
    rotation: getNumber(value.rotation, -360, 360),
    textAlign: getTextAlign(value.textAlign),
    textDecoration: getTextDecoration(value.textDecoration),
    textTransform: getTextTransform(value.textTransform),
    triggerOnClick: getBoolean(value.triggerOnClick),
    width: getNumber(value.width, 40, 2400),
    x: getNumber(value.x, -3000, 3000),
    y: getNumber(value.y, -3000, 3000),
    zIndex: getNumber(value.zIndex, -1000, 1000),
    animation: getAnimation(value.animation),
    animationDelay: getNumber(value.animationDelay, 0, 10),
    animationDuration: getNumber(value.animationDuration, 0.5, 10),
    animationLoop: getBoolean(value.animationLoop),
  }
}

export const normalizeVisualOverrides = (
  visualOverrides: Record<string, unknown> | null | undefined,
): VisualOverrides => {
  if (!isRecord(visualOverrides)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(visualOverrides).map(([key, value]) => [key, normalizeLayerOverride(value)]),
  )
}

export const getVisualContentStyle = (
  visualOverrides: Record<string, unknown> | null | undefined,
  fieldPath: string,
): CSSProperties => {
  const override = normalizeLayerOverride(visualOverrides?.[fieldPath])
  const hasTextColor = Boolean(override.color)
  const isTypewriterAnimation = override.animation === 'visual-animate-typewriter'

  return {
    '--visual-bg-color': override.backgroundColor ?? 'transparent',
    '--visual-text-color': override.color ?? 'inherit',
    animationDelay:
      !isTypewriterAnimation && typeof override.animationDelay === 'number'
        ? `${override.animationDelay}s`
        : undefined,
    animationDuration:
      !isTypewriterAnimation && override.animationDuration
        ? `${override.animationDuration}s`
        : undefined,
    animationIterationCount:
      !isTypewriterAnimation && override.animationLoop ? 'infinite' : undefined,
    backgroundColor: override.backgroundColor,
    backgroundImage: hasTextColor ? 'none' : undefined,
    color: override.color,
    display:
      override.listStyle && override.listStyle !== 'none'
        ? 'list-item'
        : undefined,
    fontFamily: override.fontFamily,
    fontSize: override.fontSize ? `${override.fontSize}px` : undefined,
    fontStyle: override.fontStyle,
    fontWeight: override.fontWeight,
    letterSpacing:
      typeof override.letterSpacing === 'number' ? `${override.letterSpacing}px` : undefined,
    lineHeight: override.lineHeight,
    listStylePosition: override.listStyle && override.listStyle !== 'none' ? 'inside' : undefined,
    listStyleType: override.listStyle === 'none' ? 'none' : override.listStyle,
    opacity: typeof override.opacity === 'number' ? override.opacity / 100 : undefined,
    overflowWrap: 'break-word',
    textAlign: override.textAlign,
    textDecoration: override.textDecoration,
    textTransform: override.textTransform === 'none' ? 'none' : override.textTransform,
    whiteSpace: 'normal',
    WebkitTextFillColor: override.color,
    wordBreak: 'break-word',
  } as CSSProperties
}

export const getVisualContentClassName = (
  visualOverrides: Record<string, unknown> | null | undefined,
  fieldPath: string,
) => {
  const override = normalizeLayerOverride(visualOverrides?.[fieldPath])

  return twMerge(
    'break-words whitespace-normal [overflow-wrap:break-word] [word-break:break-word]',
    override.animation && override.animation !== 'none' ? override.animation : '',
    override.color ? '[&_*]:![background-image:none] [&_*]:![color:inherit]' : '',
    override.backgroundColor ? '[&_a]:![background-color:inherit]' : '',
    override.fontFamily ? '[&_*]:![font-family:inherit]' : '',
    override.fontSize ? '[&_*]:![font-size:inherit]' : '',
    override.fontStyle ? '[&_*]:![font-style:inherit]' : '',
    override.fontWeight ? '[&_*]:![font-weight:inherit]' : '',
    typeof override.letterSpacing === 'number' ? '[&_*]:![letter-spacing:inherit]' : '',
    typeof override.lineHeight === 'number' ? '[&_*]:![line-height:inherit]' : '',
    override.textDecoration ? '[&_*]:![text-decoration:inherit]' : '',
    override.textTransform ? '[&_*]:![text-transform:inherit]' : '',
    override.color ? '[&_*]:![-webkit-text-fill-color:inherit]' : '',
  )
}

const emit = () => {
  const snapshot = getVisualEditSnapshot()

  listeners.forEach((listener) => listener(snapshot))
}

const sendVisualEditUpdates = (updates: VisualEditUpdate[]) => {
  if (typeof window === 'undefined' || window.parent === window || updates.length === 0) {
    return
  }

  window.parent.postMessage({ type: 'cms-visual-edit', updates }, '*')
}

const scheduleVisualOverridesCommit = ({
  immediate = false,
  sectionIndex,
  value,
}: {
  immediate?: boolean
  sectionIndex: number
  value: VisualOverrides
}) => {
  const existingTimer = debounceTimersBySection.get(sectionIndex)

  if (existingTimer) {
    window.clearTimeout(existingTimer)
    debounceTimersBySection.delete(sectionIndex)
  }

  const commit = () => {
    sendVisualEditUpdates([
      {
        path: `sections.${sectionIndex}.visualOverrides`,
        value,
      },
    ])
  }

  if (immediate) {
    commit()
    return
  }

  debounceTimersBySection.set(sectionIndex, window.setTimeout(commit, 90))
}

export const getVisualEditSnapshot = (): VisualEditSnapshot => ({
  activeElement,
})

export const subscribeToVisualEdit = (listener: VisualEditListener) => {
  listeners.add(listener)
  listener(getVisualEditSnapshot())

  return () => {
    listeners.delete(listener)
  }
}

export const setActiveVisualEditElement = (element: VisualEditActiveElement | null) => {
  activeElement = element
  emit()
}

export const syncActiveVisualEditElement = ({
  fieldPath,
  id,
  label,
  sectionIndex,
  visualOverrides,
}: {
  fieldPath: string
  id: string
  label?: string
  sectionIndex?: number
  visualOverrides?: Record<string, unknown> | null
}) => {
  if (!activeElement || activeElement.id !== id || typeof sectionIndex !== 'number') {
    return
  }

  activeElement = {
    ...activeElement,
    fieldPath,
    label,
    override: normalizeLayerOverride(visualOverrides?.[fieldPath]),
    sectionIndex,
    visualOverrides,
  }
  emit()
}

export const updateVisualEditOverride = (patch: VisualLayerOverride, immediate = false) => {
  if (!activeElement) {
    return null
  }

  const { fieldPath, sectionIndex, visualOverrides } = activeElement
  const base = draftOverridesBySection.get(sectionIndex) ?? normalizeVisualOverrides(visualOverrides)
  const nextLayer = {
    ...(base[fieldPath] ?? {}),
    ...patch,
  }
  const nextOverrides = {
    ...base,
    [fieldPath]: nextLayer,
  }

  draftOverridesBySection.set(sectionIndex, nextOverrides)
  activeElement = {
    ...activeElement,
    override: nextLayer,
  }

  scheduleVisualOverridesCommit({ immediate, sectionIndex, value: nextOverrides })
  emit()

  return nextLayer
}

export const resetVisualEditOverride = () => {
  if (!activeElement) {
    return null
  }

  const { fieldPath, sectionIndex, visualOverrides } = activeElement
  const base = draftOverridesBySection.get(sectionIndex) ?? normalizeVisualOverrides(visualOverrides)
  const nextOverrides = { ...base, [fieldPath]: {} }

  draftOverridesBySection.set(sectionIndex, nextOverrides)
  activeElement = {
    ...activeElement,
    override: {},
  }

  scheduleVisualOverridesCommit({ immediate: true, sectionIndex, value: nextOverrides })
  emit()

  return {}
}
