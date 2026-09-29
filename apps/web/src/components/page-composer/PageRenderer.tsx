'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

import { getTemplateForBlockType, type SectionRenderer } from '@starter/page-sections'

import type { MediaAsset, PageSection, SitePage } from '@/lib/cms'

type PageRendererProps = {
  isPreview?: boolean
  page: SitePage
}

type ActionLinkProps = {
  backgroundColor?: unknown
  children: ReactNode
  href?: unknown
  openInNewTab?: unknown
  previewDisabled?: boolean
  secondary?: boolean
  shape?: unknown
  textColor?: unknown
}

type SectionItem = Record<string, unknown> & { id?: string | null }
type SectionButton = Record<string, unknown>
type VisualEditUpdate = {
  path: string
  value: unknown
}
type CanvasBreakpoint = 'desktop' | 'tablet' | 'mobile'
type CanvasElementType = 'heading' | 'paragraph' | 'button' | 'buttonGroup' | 'image' | 'video' | 'shape' | 'divider'
type CanvasBox = {
  height: number
  hidden?: boolean
  rotation?: number
  width: number
  x: number
  y: number
}
type CanvasElement = {
  accessibility?: Record<string, unknown>
  content?: Record<string, unknown>
  groupId?: string | null
  height: number
  hidden?: boolean
  id: string
  locked?: boolean
  name: string
  opacity?: number
  responsive?: Partial<Record<CanvasBreakpoint, Partial<CanvasBox>>>
  rotation?: number
  styles?: Record<string, unknown>
  type: CanvasElementType
  width: number
  x: number
  y: number
  zIndex: number
}
type CustomCanvas = {
  background?: Record<string, unknown>
  breakpoints?: Partial<Record<CanvasBreakpoint, { height?: number; width?: number }>>
  elements: CanvasElement[]
  grid?: { enabled?: boolean; size?: number; snap?: boolean; tolerance?: number }
  schemaVersion?: number
}

const safeHrefPattern = /^(#|\/|https?:\/\/|mailto:|tel:)/i

const asText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const asNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const asItems = (value: unknown): SectionItem[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is SectionItem => Boolean(item && typeof item === 'object'),
      )
    : []

const asButtons = (section: PageSection): SectionButton[] => {
  const buttons = asItems(section.buttons)

  if (buttons.length > 0) {
    return buttons
  }

  const primaryLabel = asText(section.primaryActionLabel ?? section.actionLabel)
  const primaryUrl = asText(section.primaryActionUrl ?? section.actionUrl)
  const secondaryLabel = asText(section.secondaryActionLabel)
  const secondaryUrl = asText(section.secondaryActionUrl)

  const legacyButtons: SectionButton[] = []

  if (primaryLabel && primaryUrl) {
    legacyButtons.push({ label: primaryLabel, url: primaryUrl })
  }

  if (secondaryLabel && secondaryUrl) {
    legacyButtons.push({ label: secondaryLabel, style: 'secondary', url: secondaryUrl })
  }

  return legacyButtons
}

const asMedia = (value: unknown): MediaAsset | null =>
  value && typeof value === 'object' ? (value as MediaAsset) : null

const getSectionItems = (section: PageSection) => {
  const relatedItems = [
    ...asItems(section.caseStudies),
    ...asItems(section.testimonials),
  ]

  return relatedItems.length > 0 ? relatedItems : asItems(section.items)
}

const isSafeHref = (value: string) => safeHrefPattern.test(value.trim())

const asColor = (value: unknown) => {
  const color = asText(value)

  return color && /^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|transparent$|var\()/i.test(color)
    ? color
    : undefined
}

const asColorInput = (value: unknown, fallback: string) => {
  const color = asText(value)

  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback
}

const getSettings = (section: PageSection) => asRecord(section.settings)
const getResponsive = (section: PageSection) => asRecord(section.responsiveSettings)

const getSectionTitle = (section: PageSection) =>
  asText(section.title ?? section.headline ?? section.name) ?? 'Seccion'

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const fontStacks: Record<string, string> = {
  montserrat: 'Montserrat, sans-serif',
  opensans: '"Open Sans", Montserrat, sans-serif',
  rajdhani: 'Rajdhani, Montserrat, sans-serif',
  serif: 'Georgia, serif',
}

const asTextAlign = (value: unknown): CSSProperties['textAlign'] => {
  const align = asText(value)

  return align === 'center' || align === 'right' || align === 'justify' ? align : 'left'
}

const asFontStack = (value: unknown, fallback: string) =>
  fontStacks[asText(value) ?? ''] ?? fontStacks[fallback] ?? fontStacks.montserrat

const defaultCanvasSizes: Record<CanvasBreakpoint, { height: number; width: number }> = {
  desktop: { height: 720, width: 1180 },
  mobile: { height: 720, width: 390 },
  tablet: { height: 760, width: 768 },
}

const canvasFonts = [
  { label: 'Rajdhani', value: 'rajdhani' },
  { label: 'Montserrat', value: 'montserrat' },
  { label: 'Open Sans', value: 'opensans' },
  { label: 'Serif', value: 'serif' },
]

const createCanvasId = (prefix = 'element') =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`

const normalizeCanvasElement = (element: Record<string, unknown>, index: number): CanvasElement => ({
  accessibility: asRecord(element.accessibility),
  content: asRecord(element.content),
  groupId: asText(element.groupId),
  height: clampNumber(asNumber(element.height, 80), 24, 1800),
  hidden: Boolean(element.hidden),
  id: asText(element.id) ?? `element-${index + 1}`,
  locked: Boolean(element.locked),
  name: asText(element.name) ?? `Elemento ${index + 1}`,
  opacity: clampNumber(asNumber(element.opacity, 1), 0.05, 1),
  responsive: asRecord(element.responsive) as CanvasElement['responsive'],
  rotation: clampNumber(asNumber(element.rotation, 0), -180, 180),
  styles: asRecord(element.styles),
  type: (asText(element.type) ?? 'paragraph') as CanvasElementType,
  width: clampNumber(asNumber(element.width, 320), 24, 2400),
  x: Math.max(0, asNumber(element.x, 0)),
  y: Math.max(0, asNumber(element.y, 0)),
  zIndex: Math.round(asNumber(element.zIndex, index + 1)),
})

const getCanvasSize = (canvas: CustomCanvas, breakpoint: CanvasBreakpoint) => {
  const size = canvas.breakpoints?.[breakpoint]
  return {
    height: clampNumber(asNumber(size?.height, defaultCanvasSizes[breakpoint].height), 320, 1800),
    width: clampNumber(asNumber(size?.width, defaultCanvasSizes[breakpoint].width), 320, 1440),
  }
}

const getBreakpointFromWidth = (width: number): CanvasBreakpoint => {
  if (width <= 520) {
    return 'mobile'
  }

  if (width <= 900) {
    return 'tablet'
  }

  return 'desktop'
}

const getElementBox = (
  element: CanvasElement,
  breakpoint: CanvasBreakpoint,
  canvas: CustomCanvas,
): CanvasBox => {
  const desktop = getCanvasSize(canvas, 'desktop')
  const target = getCanvasSize(canvas, breakpoint)
  const responsive = element.responsive?.[breakpoint]
  const scaleX = target.width / desktop.width
  const scaleY = target.height / desktop.height

  return {
    height: clampNumber(asNumber(responsive?.height, element.height * scaleY), 24, target.height),
    hidden: Boolean(responsive?.hidden ?? element.hidden),
    rotation: asNumber(responsive?.rotation, element.rotation ?? 0),
    width: clampNumber(asNumber(responsive?.width, element.width * scaleX), 24, target.width),
    x: clampNumber(asNumber(responsive?.x, element.x * scaleX), 0, target.width),
    y: clampNumber(asNumber(responsive?.y, element.y * scaleY), 0, target.height),
  }
}

const clampCanvasBox = (box: CanvasBox, canvasSize: { height: number; width: number }): CanvasBox => ({
  ...box,
  height: clampNumber(box.height, 24, canvasSize.height),
  width: clampNumber(box.width, 24, canvasSize.width),
  x: clampNumber(box.x, 0, Math.max(0, canvasSize.width - box.width)),
  y: clampNumber(box.y, 0, Math.max(0, canvasSize.height - box.height)),
})

const updateElementBox = (
  element: CanvasElement,
  breakpoint: CanvasBreakpoint,
  box: Partial<CanvasBox>,
): CanvasElement => {
  if (breakpoint === 'desktop') {
    return { ...element, ...box }
  }

  return {
    ...element,
    responsive: {
      ...element.responsive,
      [breakpoint]: {
        ...element.responsive?.[breakpoint],
        ...box,
      },
    },
  }
}

const normalizeCanvas = (section: PageSection): CustomCanvas => {
  const rawCanvas = asRecord(section.canvas)
  const rawElements = asItems(rawCanvas.elements)

  if (rawElements.length > 0) {
    return {
      background: asRecord(rawCanvas.background),
      breakpoints: asRecord(rawCanvas.breakpoints) as CustomCanvas['breakpoints'],
      elements: rawElements.map((element, index) => normalizeCanvasElement(element, index)),
      grid: asRecord(rawCanvas.grid) as CustomCanvas['grid'],
      schemaVersion: asNumber(rawCanvas.schemaVersion, 2),
    }
  }

  const layout = asRecord(section.layoutControls)
  const buttons = asButtons(section)
  const legacyElements: CanvasElement[] = [
    {
      content: { htmlTag: 'h1', text: getSectionTitle(section) },
      height: 120,
      id: 'element-title-01',
      name: 'Titulo principal',
      styles: {
        color: asColor(layout.titleColor) ?? '#07164b',
        fontFamily: asText(layout.titleFont) ?? 'rajdhani',
        fontSize: Math.round(asNumber(layout.titleSize, 4.6) * 16),
        fontWeight: 900,
        lineHeight: 0.95,
        textAlign: asText(layout.titleAlign) ?? 'left',
      },
      type: 'heading',
      width: 620,
      x: (asNumber(layout.titleX, 34) / 100) * defaultCanvasSizes.desktop.width,
      y: (asNumber(layout.titleY, 42) / 100) * defaultCanvasSizes.desktop.height,
      zIndex: 3,
    },
  ]
  const description = asText(section.description)

  if (description) {
    legacyElements.push({
      content: { text: description },
      height: 88,
      id: 'element-description-01',
      name: 'Descripcion',
      styles: {
        color: asColor(layout.descriptionColor) ?? '#42517e',
        fontFamily: asText(layout.descriptionFont) ?? 'montserrat',
        fontSize: Math.round(asNumber(layout.descriptionSize, 1.15) * 16),
        lineHeight: 1.6,
        textAlign: asText(layout.descriptionAlign) ?? 'left',
      },
      type: 'paragraph',
      width: 520,
      x: (asNumber(layout.descriptionX, 34) / 100) * defaultCanvasSizes.desktop.width,
      y: (asNumber(layout.descriptionY, 58) / 100) * defaultCanvasSizes.desktop.height,
      zIndex: 4,
    })
  }

  buttons.forEach((button, index) => {
    legacyElements.push({
      content: {
        openInNewTab: Boolean(button.openInNewTab),
        text: asText(button.label) ?? `Boton ${index + 1}`,
        url: asText(button.url) ?? '#contacto',
      },
      groupId: 'button-group-01',
      height: 54,
      id: `element-button-${index + 1}`,
      name: `Boton ${index + 1}`,
      styles: {
        backgroundColor: asColor(button.backgroundColor) ?? (index === 0 ? '#07164b' : 'transparent'),
        borderColor: asColor(button.borderColor) ?? '#07164b',
        borderRadius: asText(button.shape) === 'pill' ? 999 : asText(button.shape) === 'square' ? 0 : 12,
        color: asColor(button.textColor) ?? (index === 0 ? '#ffffff' : '#07164b'),
        fontFamily: 'montserrat',
        fontSize: 15,
        fontWeight: 800,
      },
      type: 'button',
      width: 180,
      x: (asNumber(layout.buttonsX, 34) / 100) * defaultCanvasSizes.desktop.width + index * 198,
      y: (asNumber(layout.buttonsY, 72) / 100) * defaultCanvasSizes.desktop.height,
      zIndex: 5 + index,
    })
  })

  return {
    background: { overlay: asText(asRecord(section.settings).overlay) ?? 'soft', type: 'media' },
    breakpoints: defaultCanvasSizes,
    elements: legacyElements.map((element, index) => normalizeCanvasElement(element, index)),
    grid: { enabled: false, size: 20, snap: true, tolerance: 8 },
    schemaVersion: 2,
  }
}

const sendVisualUpdates = (updates: VisualEditUpdate[]) => {
  if (typeof window === 'undefined' || window.parent === window || updates.length === 0) {
    return
  }

  window.parent.postMessage({ type: 'cms-visual-edit', updates }, '*')
}

const ActionLink = ({
  backgroundColor,
  children,
  href,
  openInNewTab = false,
  previewDisabled = false,
  secondary = false,
  shape,
  textColor,
}: ActionLinkProps) => {
  const destination = asText(href)

  if (!destination || !isSafeHref(destination)) {
    return null
  }

  const isExternal = /^https?:\/\//i.test(destination)
  const shouldOpenNewTab = Boolean(openInNewTab) || isExternal
  const customStyle = {
    '--composer-button-bg': asColor(backgroundColor),
    '--composer-button-color': asColor(textColor),
  } as CSSProperties
  const buttonShape = asText(shape) ?? 'rounded'

  return (
    <a
      className={`composer-action${secondary ? ' composer-action--secondary' : ''}`}
      data-button-shape={buttonShape}
      href={destination}
      onClick={previewDisabled ? (event) => event.preventDefault() : undefined}
      rel={shouldOpenNewTab ? 'noreferrer' : undefined}
      style={customStyle}
      target={shouldOpenNewTab ? '_blank' : undefined}
    >
      {children}
      <span aria-hidden="true">-&gt;</span>
    </a>
  )
}

const SectionHeading = ({ section }: { section: PageSection }) => {
  const eyebrow = asText(section.eyebrow ?? section.category)
  const title = getSectionTitle(section)
  const description = asText(section.description ?? section.subtitle ?? section.summary)

  return (
    <div className="composer-section-heading">
      {eyebrow ? <p>{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <span>{description}</span> : null}
    </div>
  )
}

const isVideoMedia = (media: MediaAsset | null, kind?: unknown) => {
  const url = media?.url?.toLowerCase() ?? ''
  const mime = media?.mimeType?.toLowerCase() ?? ''

  return (
    kind === 'video' ||
    media?.mediaType === 'video' ||
    mime.startsWith('video/') ||
    /\.(mp4|webm|ogg)(\?.*)?$/.test(url)
  )
}

const MediaFrame = ({
  decorative = false,
  kind,
  label,
  media,
}: {
  decorative?: boolean
  kind?: unknown
  label: string
  media: MediaAsset | null
}) => (
  <div className="composer-media-frame">
    {media?.url && isVideoMedia(media, kind) ? (
      <video
        autoPlay
        controls={false}
        loop
        muted
        playsInline
        poster={media.poster?.url ?? undefined}
        preload="metadata"
        src={media.url}
      />
    ) : media?.url ? (
      <img alt={decorative ? '' : media.alt ?? label} loading="lazy" src={media.url} />
    ) : (
      <div aria-hidden="true" className="composer-media-placeholder">
        <i />
        <i />
        <i />
      </div>
    )}
  </div>
)

const BackgroundVisual = ({
  decorative = true,
  kind,
  label,
  media,
}: {
  decorative?: boolean
  kind?: unknown
  label: string
  media: MediaAsset | null
}) =>
  media?.url ? (
    <div aria-hidden={decorative ? 'true' : undefined} className="composer-background-visual">
      {isVideoMedia(media, kind) ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={media.poster?.url ?? undefined}
          preload="metadata"
          src={media.url}
        />
      ) : (
        <img alt={decorative ? '' : media.alt ?? label} loading="lazy" src={media.url} />
      )}
    </div>
  ) : null

const SectionShell = ({
  children,
  section,
  templateKey,
}: {
  children: ReactNode
  section: PageSection
  templateKey: string
}) => {
  const settings = getSettings(section)
  const responsive = getResponsive(section)
  const anchorId = asText(section.anchorId)
  const spacingTop = asText(settings.spacingTop) ?? 'normal'
  const spacingBottom = asText(settings.spacingBottom) ?? 'normal'
  const width = asText(settings.containerWidth) ?? 'normal'
  const theme = asText(settings.theme) ?? 'auto'

  return (
    <section
      className="composer-section"
      data-hide-desktop={responsive.hideOnDesktop ? 'true' : undefined}
      data-hide-mobile={responsive.hideOnMobile ? 'true' : undefined}
      data-hide-tablet={responsive.hideOnTablet ? 'true' : undefined}
      data-section-template={templateKey}
      data-section-theme={theme}
      data-spacing-bottom={spacingBottom}
      data-spacing-top={spacingTop}
      id={anchorId ?? undefined}
    >
      <div className={`composer-shell composer-shell--${width}`}>{children}</div>
    </section>
  )
}

const renderActions = (section: PageSection) => {
  const buttons = asButtons(section)

  if (buttons.length === 0) {
    return null
  }

  return (
    <div className="composer-actions">
      {buttons.map((button, index) => (
        <ActionLink
          href={button.url}
          key={`${asText(button.label) ?? 'button'}-${index}`}
          openInNewTab={button.openInNewTab}
          secondary={button.style === 'secondary' || index > 0}
          backgroundColor={button.backgroundColor}
          shape={button.shape}
          textColor={button.textColor}
        >
          {asText(button.label) ?? 'Conocer mas'}
        </ActionLink>
      ))}
    </div>
  )
}

const renderHero = (section: PageSection, templateKey: string) => {
  const settings = getSettings(section)
  const variant = asText(settings.variant ?? section.layout) ?? 'split'
  const title = getSectionTitle(section)
  const eyebrow = asText(section.eyebrow)
  const description = asText(section.description ?? section.subtitle)
  const media = asMedia(section.media ?? section.backgroundMedia)
  const isSimpleHero = templateKey === 'hero_split'

  return (
    <section
      className={`composer-hero composer-hero--${isSimpleHero ? 'simple' : variant}`}
      data-alignment={asText(settings.alignment) ?? undefined}
      data-overlay={asText(settings.overlay) ?? undefined}
      data-section-template={templateKey}
      id={asText(section.anchorId) ?? undefined}
    >
      {isSimpleHero ? (
        <BackgroundVisual
          decorative={Boolean(section.decorativeMedia)}
          kind={section.mediaKind}
          label={title}
          media={media}
        />
      ) : null}
      <div className="composer-shell composer-hero__grid">
        <div className="composer-hero__content">
          {eyebrow ? <p className="composer-kicker">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? <span>{description}</span> : null}
          {renderActions(section)}
          {asText(section.note) ? <small>{asText(section.note)}</small> : null}
        </div>
        {!isSimpleHero && variant !== 'centered' ? (
          <MediaFrame
            decorative={Boolean(section.decorativeMedia)}
            kind={section.mediaKind}
            label={title}
            media={media}
          />
        ) : null}
      </div>
    </section>
  )
}

export const CustomCanvasEditor = ({
  isPreview,
  section,
  sectionIndex,
  templateKey,
}: {
  isPreview: boolean
  section: PageSection
  sectionIndex: number
  templateKey: string
}) => {
  const initialCanvas = useMemo(() => normalizeCanvas(section), [section])
  const [canvas, setCanvas] = useState(initialCanvas)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [breakpoint, setBreakpoint] = useState<CanvasBreakpoint>('desktop')
  const [zoom, setZoom] = useState(1)
  const [guides, setGuides] = useState<Array<{ orientation: 'horizontal' | 'vertical'; value: number }>>([])
  const [history, setHistory] = useState<CustomCanvas[]>([])
  const [redoStack, setRedoStack] = useState<CustomCanvas[]>([])
  const canvasRef = useRef<HTMLElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setCanvas(initialCanvas), [initialCanvas])

  useEffect(() => {
    if (!isPreview) {
      return
    }

    const updateBreakpoint = () => {
      const width = frameRef.current?.clientWidth ?? window.innerWidth
      setBreakpoint(getBreakpointFromWidth(width))
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [isPreview])

  const canvasSize = getCanvasSize(canvas, breakpoint)
  const selectedElements = selectedIds
    .map((id) => canvas.elements.find((element) => element.id === id))
    .filter((element): element is CanvasElement => Boolean(element))
  const primarySelected = selectedElements[0]
  const media = asMedia(section.backgroundMedia ?? section.media)
  const commitCanvas = (nextCanvas: CustomCanvas, previousCanvas = canvas) => {
    setCanvas(nextCanvas)
    setHistory((items) => [...items.slice(-39), previousCanvas])
    setRedoStack([])
    sendVisualUpdates([{ path: `sections.${sectionIndex}.canvas`, value: nextCanvas }])
  }
  const updateCanvasOnly = (nextCanvas: CustomCanvas) => setCanvas(nextCanvas)
  const selectElement = (event: React.MouseEvent, id: string) => {
    if (!isPreview) {
      return
    }

    event.stopPropagation()
    setSelectedIds((current) => {
      if (event.shiftKey) {
        return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      }

      return [id]
    })
  }
  const updateElements = (updater: (elements: CanvasElement[]) => CanvasElement[], commit = true) => {
    const nextCanvas = { ...canvas, elements: updater(canvas.elements) }

    if (commit) {
      commitCanvas(nextCanvas)
    } else {
      updateCanvasOnly(nextCanvas)
    }
  }
  const updateSelectedStyle = (styles: Record<string, unknown>) => {
    const targetIds = selectedIds.length > 0 ? selectedIds : primarySelected ? [primarySelected.id] : []

    updateElements((elements) =>
      elements.map((element) =>
        targetIds.includes(element.id)
          ? { ...element, styles: { ...element.styles, ...styles } }
          : element,
      ),
    )
  }
  const updateSelectedContent = (content: Record<string, unknown>) => {
    const targetIds = selectedIds.length > 0 ? selectedIds : primarySelected ? [primarySelected.id] : []

    updateElements((elements) =>
      elements.map((element) =>
        targetIds.includes(element.id)
          ? { ...element, content: { ...element.content, ...content } }
          : element,
      ),
    )
  }
  const changeLayer = (mode: 'back' | 'backward' | 'forward' | 'front') => {
    updateElements((elements) => {
      const maxZ = Math.max(...elements.map((element) => element.zIndex), 1)
      const minZ = Math.min(...elements.map((element) => element.zIndex), 1)

      return elements.map((element) => {
        if (!selectedIds.includes(element.id)) {
          return element
        }

        const nextZ =
          mode === 'front'
            ? maxZ + 1
            : mode === 'back'
              ? minZ - 1
              : mode === 'forward'
                ? element.zIndex + 1
                : element.zIndex - 1

        return { ...element, zIndex: nextZ }
      })
    })
  }
  const deleteSelected = () => {
    if (selectedIds.length === 0) {
      return
    }

    updateElements((elements) => elements.filter((element) => !selectedIds.includes(element.id)))
    setSelectedIds([])
  }
  const duplicateSelected = () => {
    const copies = selectedElements.map((element) => {
      const box = clampCanvasBox(
        { ...getElementBox(element, breakpoint, canvas), x: getElementBox(element, breakpoint, canvas).x + 24, y: getElementBox(element, breakpoint, canvas).y + 24 },
        canvasSize,
      )

      return updateElementBox(
        {
          ...element,
          groupId: element.groupId ? createCanvasId('group') : element.groupId,
          id: createCanvasId(element.type),
          name: `${element.name} copia`,
          zIndex: element.zIndex + 10,
        },
        breakpoint,
        box,
      )
    })

    updateElements((elements) => [...elements, ...copies])
    setSelectedIds(copies.map((copy) => copy.id))
  }
  const addElement = (type: CanvasElementType) => {
    const base: CanvasElement = {
      content:
        type === 'button'
          ? { text: 'Nuevo boton', url: '#contacto' }
          : type === 'heading'
            ? { htmlTag: 'h2', text: 'Nuevo titulo' }
            : { text: 'Nuevo texto' },
      height: type === 'heading' ? 90 : type === 'button' ? 52 : 80,
      id: createCanvasId(type),
      name: type === 'heading' ? 'Titulo' : type === 'button' ? 'Boton' : 'Texto',
      styles:
        type === 'button'
          ? { backgroundColor: '#07164b', borderRadius: 12, color: '#ffffff', fontSize: 15, fontWeight: 800 }
          : { color: '#07164b', fontFamily: type === 'heading' ? 'rajdhani' : 'montserrat', fontSize: type === 'heading' ? 48 : 18, fontWeight: type === 'heading' ? 900 : 500, lineHeight: type === 'heading' ? 0.95 : 1.55, textAlign: 'left' },
      type,
      width: type === 'button' ? 180 : type === 'heading' ? 520 : 420,
      x: Math.round(canvasSize.width * 0.18),
      y: Math.round(canvasSize.height * 0.2),
      zIndex: Math.max(0, ...canvas.elements.map((element) => element.zIndex)) + 1,
    }

    commitCanvas({ ...canvas, elements: [...canvas.elements, base] })
    setSelectedIds([base.id])
  }
  const undo = () => {
    const previous = history.at(-1)

    if (!previous) {
      return
    }

    setRedoStack((items) => [canvas, ...items.slice(0, 39)])
    setHistory((items) => items.slice(0, -1))
    setCanvas(previous)
    sendVisualUpdates([{ path: `sections.${sectionIndex}.canvas`, value: previous }])
  }
  const redo = () => {
    const next = redoStack[0]

    if (!next) {
      return
    }

    setHistory((items) => [...items.slice(-39), canvas])
    setRedoStack((items) => items.slice(1))
    setCanvas(next)
    sendVisualUpdates([{ path: `sections.${sectionIndex}.canvas`, value: next }])
  }
  const applySnap = (box: CanvasBox, elementId: string) => {
    const snapEnabled = canvas.grid?.snap !== false
    const tolerance = asNumber(canvas.grid?.tolerance, 8)
    const nextGuides: Array<{ orientation: 'horizontal' | 'vertical'; value: number }> = []
    let nextBox = { ...box }

    if (!snapEnabled) {
      return { box: nextBox, guides: nextGuides }
    }

    const xPoints = [0, canvasSize.width / 2, canvasSize.width]
    const yPoints = [0, canvasSize.height / 2, canvasSize.height]

    canvas.elements.forEach((element) => {
      if (element.id === elementId || element.hidden) {
        return
      }

      const other = getElementBox(element, breakpoint, canvas)
      xPoints.push(other.x, other.x + other.width / 2, other.x + other.width)
      yPoints.push(other.y, other.y + other.height / 2, other.y + other.height)
    })

    const currentX = [nextBox.x, nextBox.x + nextBox.width / 2, nextBox.x + nextBox.width]
    const currentY = [nextBox.y, nextBox.y + nextBox.height / 2, nextBox.y + nextBox.height]

    xPoints.some((point) => currentX.some((current, index) => {
      if (Math.abs(point - current) > tolerance) {
        return false
      }

      nextBox.x += point - current
      nextGuides.push({ orientation: 'vertical', value: point })
      return true
    }))
    yPoints.some((point) => currentY.some((current) => {
      if (Math.abs(point - current) > tolerance) {
        return false
      }

      nextBox.y += point - current
      nextGuides.push({ orientation: 'horizontal', value: point })
      return true
    }))

    nextBox = clampCanvasBox(nextBox, canvasSize)
    return { box: nextBox, guides: nextGuides }
  }
  const handleMoveStart = (event: PointerEvent<HTMLElement>, element: CanvasElement) => {
    if (!isPreview || element.locked) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const beforeCanvas = canvas
    const movingIds = selectedIds.includes(element.id) ? selectedIds : [element.id]
    const startBoxes = new Map(
      movingIds.map((id) => {
        const item = canvas.elements.find((entry) => entry.id === id)
        return [id, item ? getElementBox(item, breakpoint, canvas) : null] as const
      }),
    )
    let latestCanvas = canvas
    let frame = 0

    event.currentTarget.setPointerCapture?.(event.pointerId)

    const move = (moveEvent: globalThis.PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const dx = (moveEvent.clientX - startX) / zoom
        const dy = (moveEvent.clientY - startY) / zoom

        latestCanvas = {
          ...canvas,
          elements: canvas.elements.map((item) => {
            const startBox = startBoxes.get(item.id)

            if (!startBox || item.locked) {
              return item
            }

            const nextRaw = clampCanvasBox({ ...startBox, x: startBox.x + dx, y: startBox.y + dy }, canvasSize)
            const snapped = movingIds.length === 1 ? applySnap(nextRaw, item.id) : { box: nextRaw, guides: [] }

            setGuides(snapped.guides)
            return updateElementBox(item, breakpoint, snapped.box)
          }),
        }
        setCanvas(latestCanvas)
      })
    }
    const up = () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setGuides([])
      commitCanvas(latestCanvas, beforeCanvas)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }
  const handleResizeStart = (event: PointerEvent<HTMLElement>, element: CanvasElement, handle: string) => {
    if (!isPreview || element.locked) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startBox = getElementBox(element, breakpoint, canvas)
    const beforeCanvas = canvas
    let latestCanvas = canvas
    let frame = 0

    event.currentTarget.setPointerCapture?.(event.pointerId)

    const move = (moveEvent: globalThis.PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const dx = (moveEvent.clientX - startX) / zoom
        const dy = (moveEvent.clientY - startY) / zoom
        const nextBox = { ...startBox }

        if (handle.includes('e')) nextBox.width = startBox.width + dx
        if (handle.includes('s')) nextBox.height = startBox.height + dy
        if (handle.includes('w')) {
          nextBox.width = startBox.width - dx
          nextBox.x = startBox.x + dx
        }
        if (handle.includes('n')) {
          nextBox.height = startBox.height - dy
          nextBox.y = startBox.y + dy
        }

        const clamped = clampCanvasBox(nextBox, canvasSize)
        latestCanvas = {
          ...canvas,
          elements: canvas.elements.map((item) =>
            item.id === element.id ? updateElementBox(item, breakpoint, clamped) : item,
          ),
        }
        setCanvas(latestCanvas)
      })
    }
    const up = () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      commitCanvas(latestCanvas, beforeCanvas)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  useEffect(() => {
    if (!isPreview) {
      return
    }

    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]')

      if (isTyping) {
        return
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length > 0) {
        event.preventDefault()
        deleteSelected()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelected()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setSelectedIds(canvas.elements.filter((element) => !element.hidden).map((element) => element.id))
      }

      if (event.key === 'Escape') {
        setEditingTextId(null)
        setSelectedIds([])
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && selectedIds.length > 0) {
        event.preventDefault()
        const delta = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0
        const dy = event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0

        updateElements((elements) =>
          elements.map((element) => {
            if (!selectedIds.includes(element.id) || element.locked) {
              return element
            }

            const box = getElementBox(element, breakpoint, canvas)
            return updateElementBox(element, breakpoint, clampCanvasBox({ ...box, x: box.x + dx, y: box.y + dy }, canvasSize))
          }),
        )
      }
    }

    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })

  const renderElement = (element: CanvasElement) => {
    const box = getElementBox(element, breakpoint, canvas)

    if (box.hidden || element.hidden) {
      return null
    }

    const selected = selectedIds.includes(element.id)
    const isEditingText = editingTextId === element.id
    const styles = asRecord(element.styles)
    const content = asRecord(element.content)
    const elementStyle = {
      '--element-h': `${box.height}px`,
      '--element-opacity': element.opacity ?? 1,
      '--element-rotate': `${box.rotation ?? 0}deg`,
      '--element-w': `${box.width}px`,
      '--element-x': `${box.x}px`,
      '--element-y': `${box.y}px`,
      zIndex: element.zIndex,
    } as CSSProperties
    const textStyle = {
      color: asColor(styles.color) ?? '#07164b',
      fontFamily: asFontStack(styles.fontFamily, element.type === 'heading' ? 'rajdhani' : 'montserrat'),
      fontSize: `${asNumber(styles.fontSize, element.type === 'heading' ? 56 : 18)}px`,
      fontWeight: asNumber(styles.fontWeight, element.type === 'heading' ? 900 : 500),
      letterSpacing: `${asNumber(styles.letterSpacing, 0)}px`,
      lineHeight: asNumber(styles.lineHeight, element.type === 'heading' ? 0.95 : 1.55),
      opacity: element.opacity ?? 1,
      textAlign: asTextAlign(styles.textAlign),
      textDecoration: [styles.underline ? 'underline' : null, styles.strike ? 'line-through' : null].filter(Boolean).join(' ') || undefined,
      textTransform: styles.uppercase ? 'uppercase' : undefined,
    } as CSSProperties
    const text = asText(content.text) ?? ''
    const Tag = (asText(content.htmlTag) === 'h1' || asText(content.htmlTag) === 'h3' ? asText(content.htmlTag) : element.type === 'heading' ? 'h2' : 'p') as 'h1' | 'h2' | 'h3' | 'p'

    return (
      <div
        aria-label={element.name}
        className={`composer-canvas-element${selected ? ' is-selected' : ''}${element.locked ? ' is-locked' : ''}`}
        data-element-type={element.type}
        key={element.id}
        onClick={(event) => selectElement(event, element.id)}
        onPointerDown={(event) => handleMoveStart(event, element)}
        role={isPreview ? 'button' : undefined}
        style={elementStyle}
        tabIndex={isPreview ? 0 : undefined}
      >
        {element.type === 'button' ? (
          <a
            className="composer-canvas-button"
            href={asText(content.url) && isSafeHref(asText(content.url) ?? '') ? asText(content.url) ?? '#' : '#'}
            onClick={isPreview ? (event) => event.preventDefault() : undefined}
            rel={content.openInNewTab ? 'noreferrer' : undefined}
            style={{
              background: asColor(styles.backgroundColor) ?? '#07164b',
              borderColor: asColor(styles.borderColor) ?? 'transparent',
              borderRadius: `${asNumber(styles.borderRadius, 12)}px`,
              borderWidth: `${asNumber(styles.borderWidth, 1)}px`,
              color: asColor(styles.color) ?? '#ffffff',
              fontFamily: asFontStack(styles.fontFamily, 'montserrat'),
              fontSize: `${asNumber(styles.fontSize, 15)}px`,
              fontWeight: asNumber(styles.fontWeight, 800),
              opacity: element.opacity ?? 1,
            }}
            target={content.openInNewTab ? '_blank' : undefined}
          >
            {text || 'Boton'}
          </a>
        ) : (
          <Tag
            contentEditable={isPreview && isEditingText && !element.locked}
            onBlur={(event) => {
              updateSelectedContent({ text: event.currentTarget.textContent?.slice(0, 500) ?? '' })
              setEditingTextId(null)
            }}
            onDoubleClick={(event) => {
              if (!isPreview || element.locked) {
                return
              }

              event.stopPropagation()
              setSelectedIds([element.id])
              setEditingTextId(element.id)
            }}
            onPointerDown={(event) => {
              if (isEditingText) {
                event.stopPropagation()
              }
            }}
            style={textStyle}
            suppressContentEditableWarning
          >
            {text}
          </Tag>
        )}
        {isPreview && selected ? (
          <>
            <span className="composer-canvas-element__label">{element.locked ? 'Bloqueado' : element.name}</span>
            {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
              <button
                aria-label={`Redimensionar ${element.name}`}
                className={`composer-canvas-resize composer-canvas-resize--${handle}`}
                key={handle}
                onPointerDown={(event) => handleResizeStart(event, element, handle)}
                type="button"
              />
            ))}
          </>
        ) : null}
      </div>
    )
  }

  const toolbarStyle = primarySelected
    ? (() => {
        const box = getElementBox(primarySelected, breakpoint, canvas)
        const top = box.y > 58 ? box.y - 48 : box.y + box.height + 12
        const toolbarInset = Math.min(172, Math.max(72, canvasSize.width / 2 - 8))
        return {
          '--toolbar-x': `${clampNumber(
            box.x + box.width / 2,
            toolbarInset,
            canvasSize.width - toolbarInset,
          )}px`,
          '--toolbar-y': `${clampNumber(top, 8, canvasSize.height - 56)}px`,
        } as CSSProperties
      })()
    : undefined

  return (
    <section
      className={`composer-custom-canvas-editor${isPreview ? ' is-editing' : ''}`}
      data-section-template={templateKey}
      id={asText(section.anchorId) ?? undefined}
      ref={canvasRef}
    >
      <BackgroundVisual decorative kind={section.mediaKind} label="Fondo personalizado" media={media} />
      {isPreview ? (
        <div className="composer-canvas-topbar">
          <button onClick={() => addElement('heading')} type="button">Titulo</button>
          <button onClick={() => addElement('paragraph')} type="button">Texto</button>
          <button onClick={() => addElement('button')} type="button">Boton</button>
          <button disabled={history.length === 0} onClick={undo} type="button">Deshacer</button>
          <button disabled={redoStack.length === 0} onClick={redo} type="button">Rehacer</button>
          {(['desktop', 'tablet', 'mobile'] as const).map((item) => (
            <button className={breakpoint === item ? 'is-active' : undefined} key={item} onClick={() => setBreakpoint(item)} type="button">
              {item === 'desktop' ? 'Escritorio' : item === 'tablet' ? 'Tablet' : 'Movil'}
            </button>
          ))}
          <button onClick={() => setZoom((value) => clampNumber(Number((value - 0.1).toFixed(2)), 0.5, 1.5))} type="button">-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => clampNumber(Number((value + 0.1).toFixed(2)), 0.5, 1.5))} type="button">+</button>
        </div>
      ) : null}
      {isPreview ? (
        <div
          className="fixed bottom-4 left-3 right-3 z-[99990] flex max-w-[calc(100vw-1.5rem)] flex-wrap justify-end gap-2 rounded-2xl border border-white/15 bg-slate-950/88 p-2 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:left-auto sm:right-4 sm:max-w-[calc(100vw-2rem)]"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            className="min-w-0 max-w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase leading-tight tracking-[0] transition hover:border-cyan-200/50 hover:bg-cyan-200 hover:text-slate-950"
            onClick={() => addElement('paragraph')}
            type="button"
          >
            + Añadir Texto
          </button>
          <button
            className="min-w-0 max-w-full rounded-xl border border-blue-400/60 bg-blue-600 px-4 py-2 text-xs font-black uppercase leading-tight tracking-[0] text-white shadow-lg transition hover:bg-blue-500"
            onClick={() => addElement('button')}
            type="button"
          >
            + Añadir Botón
          </button>
        </div>
      ) : null}
      <div className="composer-canvas-workbench" ref={frameRef}>
        <div
          className="composer-canvas-viewport"
          onClick={() => isPreview && setSelectedIds([])}
          style={{
            '--canvas-height': `${canvasSize.height}px`,
            '--canvas-width': `${canvasSize.width}px`,
            '--canvas-zoom': zoom,
          } as CSSProperties}
        >
          <div className="composer-canvas-surface">
            {canvas.grid?.enabled ? <div className="composer-canvas-grid" /> : null}
            {guides.map((guide, index) => (
              <span
                className={`composer-canvas-guide composer-canvas-guide--${guide.orientation}`}
                key={`${guide.orientation}-${guide.value}-${index}`}
                style={{ [guide.orientation === 'vertical' ? 'left' : 'top']: guide.value } as CSSProperties}
              />
            ))}
            {[...canvas.elements].sort((a, b) => a.zIndex - b.zIndex).map(renderElement)}
            {isPreview && primarySelected ? (
              <div
                className="composer-canvas-toolbar"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                style={toolbarStyle}
              >
                {selectedIds.length > 1 ? (
                  <>
                    <button onClick={duplicateSelected} type="button">Duplicar grupo</button>
                    <button onClick={deleteSelected} type="button">Eliminar</button>
                    <button onClick={() => changeLayer('front')} type="button">Frente</button>
                    <button onClick={() => changeLayer('back')} type="button">Fondo</button>
                  </>
                ) : primarySelected.type === 'button' ? (
                  <>
                    <input
                      aria-label="Texto del boton"
                      onChange={(event) => updateSelectedContent({ text: event.currentTarget.value.slice(0, 80) })}
                      value={asText(primarySelected.content?.text) ?? ''}
                    />
                    <input
                      aria-label="Destino"
                      onChange={(event) => updateSelectedContent({ url: event.currentTarget.value })}
                      value={asText(primarySelected.content?.url) ?? ''}
                    />
                    <input
                      aria-label="Color de fondo"
                      onChange={(event) => updateSelectedStyle({ backgroundColor: event.currentTarget.value })}
                      type="color"
                      value={asColorInput(primarySelected.styles?.backgroundColor, '#07164b')}
                    />
                    <input
                      aria-label="Color del texto"
                      onChange={(event) => updateSelectedStyle({ color: event.currentTarget.value })}
                      type="color"
                      value={asColorInput(primarySelected.styles?.color, '#ffffff')}
                    />
                    <button onClick={duplicateSelected} type="button">Duplicar</button>
                    <button onClick={deleteSelected} type="button">Eliminar</button>
                  </>
                ) : (
                  <>
                    <select
                      aria-label="Tipo de letra"
                      onChange={(event) => updateSelectedStyle({ fontFamily: event.currentTarget.value })}
                      value={asText(primarySelected.styles?.fontFamily) ?? 'montserrat'}
                    >
                      {canvasFonts.map((font) => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                      ))}
                    </select>
                    <button onClick={() => updateSelectedStyle({ fontSize: Math.max(10, asNumber(primarySelected.styles?.fontSize, 18) - 2) })} type="button">-</button>
                    <input
                      aria-label="Tamano de letra"
                      className="composer-canvas-toolbar__size-input"
                      max="160"
                      min="10"
                      onChange={(event) => updateSelectedStyle({ fontSize: clampNumber(Number(event.currentTarget.value), 10, 160) })}
                      type="number"
                      value={asNumber(primarySelected.styles?.fontSize, 18)}
                    />
                    <button onClick={() => updateSelectedStyle({ fontSize: Math.min(160, asNumber(primarySelected.styles?.fontSize, 18) + 2) })} type="button">+</button>
                    <input
                      aria-label="Color del texto"
                      onChange={(event) => updateSelectedStyle({ color: event.currentTarget.value })}
                      type="color"
                      value={asColorInput(primarySelected.styles?.color, '#07164b')}
                    />
                    <button aria-pressed={Boolean(primarySelected.styles?.bold)} onClick={() => updateSelectedStyle({ fontWeight: asNumber(primarySelected.styles?.fontWeight, 500) >= 700 ? 500 : 900 })} type="button">B</button>
                    <button onClick={() => updateSelectedStyle({ textAlign: 'left' })} type="button">Izq</button>
                    <button onClick={() => updateSelectedStyle({ textAlign: 'center' })} type="button">Cen</button>
                    <button onClick={() => updateSelectedStyle({ textAlign: 'right' })} type="button">Der</button>
                    <button onClick={duplicateSelected} type="button">Duplicar</button>
                    <button onClick={deleteSelected} type="button">Eliminar</button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
        {isPreview ? (
          <aside className="composer-canvas-layers" aria-label="Capas del lienzo">
            <strong>Capas</strong>
            {[...canvas.elements].sort((a, b) => b.zIndex - a.zIndex).map((element) => (
              <button
                className={selectedIds.includes(element.id) ? 'is-active' : undefined}
                key={element.id}
                onClick={(event) => selectElement(event, element.id)}
                type="button"
              >
                <span>{element.hidden ? 'Oculto' : element.locked ? 'Bloq.' : element.type}</span>
                {element.name}
              </button>
            ))}
          </aside>
        ) : null}
      </div>
    </section>
  )
}

const renderCustom = (
  section: PageSection,
  templateKey: string,
  sectionIndex: number,
  isPreview: boolean,
) => {
  return (
    <CustomCanvasEditor
      isPreview={isPreview}
      section={section}
      sectionIndex={sectionIndex}
      templateKey={templateKey}
    />
  )

  const settings = getSettings(section)
  const layoutControls = asRecord(section.layoutControls)
  const buttons = asButtons(section)
  const title = getSectionTitle(section)
  const description = asText(section.description ?? section.subtitle)
  const media = asMedia(section.backgroundMedia ?? section.media)
  const height = asText(settings.height) ?? 'large'
  const updateField = (path: string, value: unknown) =>
    sendVisualUpdates([{ path: `sections.${sectionIndex}.${path}`, value }])
  const updateFields = (updates: Array<{ path: string; value: unknown }>) =>
    sendVisualUpdates(
      updates.map((update) => ({ path: `sections.${sectionIndex}.${update.path}`, value: update.value })),
    )
  const titleX = asNumber(layoutControls.titleX, 34)
  const titleY = asNumber(layoutControls.titleY, 42)
  const titleSize = asNumber(layoutControls.titleSize, 4.6)
  const titleColor = asColor(layoutControls.titleColor) ?? '#07164b'
  const titleFont = asText(layoutControls.titleFont) ?? 'rajdhani'
  const titleAlign = asTextAlign(layoutControls.titleAlign)
  const descriptionX = asNumber(layoutControls.descriptionX, 34)
  const descriptionY = asNumber(layoutControls.descriptionY, 58)
  const descriptionSize = asNumber(layoutControls.descriptionSize, 1.15)
  const descriptionColor = asColor(layoutControls.descriptionColor) ?? '#42517e'
  const descriptionFont = asText(layoutControls.descriptionFont) ?? 'montserrat'
  const descriptionAlign = asTextAlign(layoutControls.descriptionAlign)
  const buttonsX = asNumber(layoutControls.buttonsX, 34)
  const buttonsY = asNumber(layoutControls.buttonsY, 72)
  const buttonsScale = asNumber(layoutControls.buttonsScale, 100)
  const fontOptions = [
    { label: 'Rajdhani', value: 'rajdhani' },
    { label: 'Montserrat', value: 'montserrat' },
    { label: 'Open Sans', value: 'opensans' },
    { label: 'Serif', value: 'serif' },
  ]
  const handleLayerMove = (
    event: PointerEvent<HTMLElement>,
    xPath: string,
    yPath: string,
    initialX: number,
    initialY: number,
  ) => {
    if (!isPreview) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const canvas = event.currentTarget.closest('.composer-custom-hero')
    const rect = canvas?.getBoundingClientRect()

    if (!rect) {
      return
    }

    const startX = event.clientX
    const startY = event.clientY

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextX = clampNumber(initialX + ((moveEvent.clientX - startX) / rect.width) * 100, 5, 95)
      const nextY = clampNumber(initialY + ((moveEvent.clientY - startY) / rect.height) * 100, 5, 95)

      updateFields([
        { path: `layoutControls.${xPath}`, value: Math.round(nextX) },
        { path: `layoutControls.${yPath}`, value: Math.round(nextY) },
      ])
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
  }
  const handleTextResize = (
    event: PointerEvent<HTMLElement>,
    sizePath: string,
    initialSize: number,
    min: number,
    max: number,
  ) => {
    if (!isPreview) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const startX = event.clientX
    const startY = event.clientY

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const delta = (moveEvent.clientX - startX + moveEvent.clientY - startY) / 90
      const nextSize = Number(clampNumber(initialSize + delta, min, max).toFixed(2))

      updateField(`layoutControls.${sizePath}`, nextSize)
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
  }
  const renderInlineToolbar = ({
    align,
    alignPath,
    colorFallback,
    colorPath,
    font,
    fontPath,
    maxSize,
    minSize,
    moveLabel,
    onMove,
    size,
    sizePath,
  }: {
    align: CSSProperties['textAlign']
    alignPath: string
    colorFallback: string
    colorPath: string
    font: string
    fontPath: string
    maxSize: number
    minSize: number
    moveLabel: string
    onMove: (event: PointerEvent<HTMLElement>) => void
    size: number
    sizePath: string
  }) =>
    isPreview ? (
      <div className="composer-inline-toolbar" aria-label={`Barra de edicion de ${moveLabel}`}>
        <button className="composer-inline-toolbar__move" onPointerDown={onMove} type="button">
          Mover
        </button>
        <select
          aria-label="Tipo de letra"
          onChange={(event) => updateField(`layoutControls.${fontPath}`, event.currentTarget.value)}
          value={font}
        >
          {fontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          aria-label="Reducir tamano"
          onClick={() => updateField(`layoutControls.${sizePath}`, Number(clampNumber(size - 0.15, minSize, maxSize).toFixed(2)))}
          type="button"
        >
          -
        </button>
        <span>{Math.round(size * 10)}</span>
        <button
          aria-label="Aumentar tamano"
          onClick={() => updateField(`layoutControls.${sizePath}`, Number(clampNumber(size + 0.15, minSize, maxSize).toFixed(2)))}
          type="button"
        >
          +
        </button>
        <input
          aria-label="Color del texto"
          onChange={(event) => updateField(`layoutControls.${colorPath}`, event.currentTarget.value)}
          type="color"
          value={asColorInput(layoutControls[colorPath], colorFallback)}
        />
        {(['left', 'center', 'right'] as const).map((option) => (
          <button
            aria-pressed={align === option}
            key={option}
            onClick={() => updateField(`layoutControls.${alignPath}`, option)}
            type="button"
          >
            {option === 'left' ? 'Izq' : option === 'center' ? 'Cen' : 'Der'}
          </button>
        ))}
      </div>
    ) : null

  return (
    <section
      className={`composer-custom-hero${isPreview ? ' composer-custom-hero--editable' : ''}`}
      data-custom-height={height}
      data-overlay={asText(settings.overlay) ?? undefined}
      data-section-template={templateKey}
      id={asText(section.anchorId) ?? undefined}
    >
      <BackgroundVisual
        decorative={Boolean(section.decorativeMedia)}
        kind={section.mediaKind}
        label={title}
        media={media}
      />
      <div
        className="composer-custom-hero__layer composer-custom-hero__layer--title"
        style={{
          '--font-family': asFontStack(titleFont, 'rajdhani'),
          '--text-color': titleColor,
          '--text-size': `${titleSize}rem`,
          '--x': `${titleX}%`,
          '--y': `${titleY}%`,
          textAlign: titleAlign,
        } as CSSProperties}
      >
        {renderInlineToolbar({
          align: titleAlign,
          alignPath: 'titleAlign',
          colorFallback: '#07164b',
          colorPath: 'titleColor',
          font: titleFont,
          fontPath: 'titleFont',
          maxSize: 8,
          minSize: 1.5,
          moveLabel: 'titulo',
          onMove: (event) => handleLayerMove(event, 'titleX', 'titleY', titleX, titleY),
          size: titleSize,
          sizePath: 'titleSize',
        })}
        <h2
          contentEditable={isPreview}
          onBlur={(event) => updateField('title', event.currentTarget.textContent ?? '')}
          suppressContentEditableWarning
        >
          {title}
        </h2>
        {isPreview ? (
          <button
            aria-label="Arrastra para cambiar el tamano del titulo"
            className="composer-inline-resize"
            onPointerDown={(event) => handleTextResize(event, 'titleSize', titleSize, 1.5, 8)}
            type="button"
          />
        ) : null}
      </div>
      {description ? (
        <div
          className="composer-custom-hero__layer composer-custom-hero__layer--description"
          style={{
            '--font-family': asFontStack(descriptionFont, 'montserrat'),
            '--text-color': descriptionColor,
            '--text-size': `${descriptionSize}rem`,
            '--x': `${descriptionX}%`,
            '--y': `${descriptionY}%`,
            textAlign: descriptionAlign,
          } as CSSProperties}
        >
          {renderInlineToolbar({
            align: descriptionAlign,
            alignPath: 'descriptionAlign',
            colorFallback: '#42517e',
            colorPath: 'descriptionColor',
            font: descriptionFont,
            fontPath: 'descriptionFont',
            maxSize: 3,
            minSize: 0.8,
            moveLabel: 'descripcion',
            onMove: (event) => handleLayerMove(event, 'descriptionX', 'descriptionY', descriptionX, descriptionY),
            size: descriptionSize,
            sizePath: 'descriptionSize',
          })}
          <p
            contentEditable={isPreview}
            onBlur={(event) => updateField('description', event.currentTarget.textContent ?? '')}
            suppressContentEditableWarning
          >
            {description}
          </p>
          {isPreview ? (
            <button
              aria-label="Arrastra para cambiar el tamano de la descripcion"
              className="composer-inline-resize"
              onPointerDown={(event) => handleTextResize(event, 'descriptionSize', descriptionSize, 0.8, 3)}
              type="button"
            />
          ) : null}
        </div>
      ) : null}
      {buttons.length > 0 ? (
        <div
          className="composer-custom-hero__layer composer-custom-hero__layer--buttons"
          style={{
            '--button-scale': buttonsScale / 100,
            '--x': `${buttonsX}%`,
            '--y': `${buttonsY}%`,
          } as CSSProperties}
        >
          {isPreview ? (
            <button
              className="composer-custom-handle"
              onPointerDown={(event) => handleLayerMove(event, 'buttonsX', 'buttonsY', buttonsX, buttonsY)}
              type="button"
            >
              Mover botones
            </button>
          ) : null}
          <div className="composer-actions">
            {buttons.map((button, index) => (
              <ActionLink
                backgroundColor={button.backgroundColor}
                href={button.url}
                key={`${asText(button.label) ?? 'button'}-${index}`}
                openInNewTab={button.openInNewTab}
                previewDisabled={isPreview}
                secondary={button.style === 'secondary' || index > 0}
                shape={button.shape}
                textColor={button.textColor}
              >
                {asText(button.label) ?? 'Boton'}
              </ActionLink>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

const renderLogos = (section: PageSection, templateKey: string) => {
  const items = asItems(section.items)
  const settings = getSettings(section)
  const variant = asText(settings.variant ?? section.displayMode) ?? 'grid'
  const rowItems = variant === 'marquee' || variant === 'carousel' ? [...items, ...items] : items

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <SectionHeading section={section} />
      <div className={`composer-logo-cloud composer-logo-cloud--${variant}`}>
        {rowItems.map((item, index) => {
          const logo = asMedia(item.logo ?? item.media)
          const name = asText(item.name ?? item.title) ?? `Aliado ${index + 1}`
          const content = logo?.url ? (
            <img alt={logo.alt ?? name} loading="lazy" src={logo.url} />
          ) : (
            <span>{name}</span>
          )

          return asText(item.url) && isSafeHref(asText(item.url) ?? '') ? (
            <a href={asText(item.url) ?? '#'} key={`${item.id ?? name}-${index}`}>
              {content}
            </a>
          ) : (
            <div key={`${item.id ?? name}-${index}`}>{content}</div>
          )
        })}
      </div>
    </SectionShell>
  )
}

const renderCards = (section: PageSection, templateKey: string) => {
  const items = getSectionItems(section)
  const responsive = getResponsive(section)
  const columns = asNumber(responsive.columnsDesktop, 3)

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <SectionHeading section={section} />
      <div className="composer-card-grid" style={{ '--composer-columns': columns } as CSSProperties}>
        {items.length > 0 ? (
          items.map((item, index) => {
            const media = asMedia(item.media ?? item.image)
            const title = asText(item.title ?? item.name ?? item.client) ?? `Elemento ${index + 1}`
            const description = asText(item.description ?? item.summary ?? item.quote)

            return (
              <article className="composer-card" key={item.id ?? `${title}-${index}`}>
                {media?.url ? <img alt={media.alt ?? title} loading="lazy" src={media.url} /> : null}
                <span className="composer-card__index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                {description ? <p>{description}</p> : null}
                {asText(item.value ?? item.result) ? <strong>{asText(item.value ?? item.result)}</strong> : null}
                <ActionLink href={item.url} secondary>
                  {asText(item.linkLabel) ?? 'Ver mas'}
                </ActionLink>
              </article>
            )
          })
        ) : (
          <div className="composer-empty-proof">Agrega elementos para completar esta seccion.</div>
        )}
      </div>
    </SectionShell>
  )
}

const renderMetrics = (section: PageSection, templateKey: string) => {
  const items = asItems(section.items)

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <SectionHeading section={section} />
      <div className="composer-metric-grid">
        {items.map((item, index) => (
          <article key={item.id ?? `metric-${index}`}>
            <strong>
              {asText(item.prefix)}
              {asText(item.value) ?? '00'}
              {asText(item.suffix)}
            </strong>
            <span>{asText(item.label ?? item.title) ?? 'Resultado'}</span>
            {asText(item.description ?? item.source) ? <small>{asText(item.description ?? item.source)}</small> : null}
          </article>
        ))}
      </div>
    </SectionShell>
  )
}

const renderSteps = (section: PageSection, templateKey: string) => {
  const steps = asItems(section.items ?? section.steps)

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <SectionHeading section={section} />
      <ol className="composer-step-list">
        {steps.map((step, index) => (
          <li key={step.id ?? `step-${index}`}>
            <span>{asText(step.number) ?? String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{asText(step.title) ?? 'Paso importante'}</h3>
              {asText(step.description) ? <p>{asText(step.description)}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  )
}

const renderTimeline = (section: PageSection, templateKey: string) => {
  const items = asItems(section.items)

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <SectionHeading section={section} />
      <div className="composer-timeline">
        {items.map((item, index) => (
          <article key={item.id ?? `timeline-${index}`}>
            <time>{asText(item.date) ?? String(index + 1).padStart(2, '0')}</time>
            <h3>{asText(item.title) ?? 'Evento'}</h3>
            {asText(item.description) ? <p>{asText(item.description)}</p> : null}
          </article>
        ))}
      </div>
    </SectionShell>
  )
}

const renderFaq = (section: PageSection, templateKey: string) => {
  const items = asItems(section.items)

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <div className="composer-faq__grid">
        <SectionHeading section={section} />
        <div>
          {items.map((item, index) => (
            <details key={item.id ?? `faq-${index}`}>
              <summary>{asText(item.question ?? item.title) ?? 'Pregunta frecuente'}</summary>
              <p>{asText(item.answer ?? item.description) ?? 'Agrega una respuesta clara.'}</p>
            </details>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

const renderCta = (section: PageSection, templateKey: string) => (
  <SectionShell section={section} templateKey={templateKey}>
    <div className="composer-cta__panel">
      <SectionHeading section={section} />
      {renderActions(section)}
    </div>
  </SectionShell>
)

const renderTerminal = (section: PageSection, templateKey: string) => {
  const lines = asItems(section.code)

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <SectionHeading section={section} />
      <pre className="composer-terminal" aria-label={asText(section.ariaLabel) ?? 'Demo visual tipo terminal'}>
        {lines.map((line, index) => (
          <code key={line.id ?? `line-${index}`}>{asText(line.line) ?? ''}</code>
        ))}
      </pre>
    </SectionShell>
  )
}

const renderComparison = (section: PageSection, templateKey: string) => {
  const columns = asItems(section.columns).map((column) => asText(column.title ?? column.name)).filter(Boolean)
  const items = asItems(section.items)

  return (
    <SectionShell section={section} templateKey={templateKey}>
      <SectionHeading section={section} />
      <div className="composer-table-wrap" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Caracteristica</th>
              {(columns.length > 0 ? columns : ['Opcion A', 'Opcion B']).map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id ?? `row-${index}`}>
                <td>{asText(item.title ?? item.label) ?? 'Caracteristica'}</td>
                <td>{asText(item.value ?? item.description) ?? 'Incluido'}</td>
                <td>{asText(item.secondaryValue) ?? 'Disponible'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  )
}

const renderPricing = (section: PageSection, templateKey: string) => renderCards(section, templateKey)
const renderDocuments = (section: PageSection, templateKey: string) => renderCards(section, templateKey)
const renderMedia = (section: PageSection, templateKey: string) => renderCards(section, templateKey)
const renderContact = (section: PageSection, templateKey: string) => renderCards(section, templateKey)
const renderScoreboard = (section: PageSection, templateKey: string) => renderCards(section, templateKey)

const rendererMap: Record<Exclude<SectionRenderer, 'custom'>, (section: PageSection, templateKey: string) => ReactNode> = {
  cards: renderCards,
  comparison: renderComparison,
  contact: renderContact,
  cta: renderCta,
  documents: renderDocuments,
  faq: renderFaq,
  hero: renderHero,
  logos: renderLogos,
  media: renderMedia,
  metrics: renderMetrics,
  pricing: renderPricing,
  scoreboard: renderScoreboard,
  steps: renderSteps,
  terminal: renderTerminal,
  timeline: renderTimeline,
}

const renderSection = (section: PageSection, sectionIndex: number, isPreview: boolean) => {
  if (section.enabled === false) {
    return null
  }

  const template = getTemplateForBlockType(section.blockType)
  const templateKey = template?.key ?? section.blockType
  const pageAnchor = typeof section.pageAnchor === 'string' ? section.pageAnchor : undefined
  const renderedSection =
    template?.renderer === 'custom'
      ? renderCustom(section, templateKey, sectionIndex, isPreview)
      : (template ? rendererMap[template.renderer] : renderCards)(section, templateKey)

  return (
    <div id={pageAnchor} key={section.id ?? `${section.blockType}-${templateKey}`}>
      {renderedSection}
    </div>
  )
}

export function PageRenderer({ isPreview = false, page }: PageRendererProps) {
  return (
    <main
      className="composer-page"
      data-density="balanced"
      data-motion="subtle"
      data-page-preview={isPreview ? 'true' : undefined}
      data-page-style="corporate"
    >
      {page.sections.length > 0 ? (
        page.sections.map((section, sectionIndex) => renderSection(section, sectionIndex, isPreview))
      ) : (
        <section className="composer-empty-page">
          <div className="composer-shell">
            <p className="composer-kicker">PAGINA EN PREPARACION</p>
            <h1>{page.title}</h1>
            <span>Agrega secciones desde el administrador para construir la pagina.</span>
          </div>
        </section>
      )}
    </main>
  )
}
