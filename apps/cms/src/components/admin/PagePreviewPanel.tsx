'use client'

import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useForm, useFormFields } from '@payloadcms/ui'
import { reduceFieldsToValues } from 'payload/shared'

import { formatPageSlug } from '../../lib/page-composer'
import './page-composer-admin.css'

type PageValues = Record<string, unknown> & {
  slug?: unknown
  title?: unknown
}

type PreviewDevice = 'desktop' | 'laptop' | 'mobile' | 'tablet'

type VisualEditUpdate = {
  path: string
  value: unknown
}

const deviceWidths: Record<PreviewDevice, number> = {
  desktop: 1440,
  laptop: 1024,
  mobile: 375,
  tablet: 768,
}

const DEFAULT_FORM_PANEL_WIDTH = 480
const MAX_FORM_PANEL_WIDTH = 720
const MIN_FORM_PANEL_WIDTH = 280
const MIN_PREVIEW_PANEL_WIDTH = 320
const FORM_PANEL_WIDTH_STORAGE_KEY = 'cms-profesional-page-form-width'
const FORM_COLLAPSED_STORAGE_KEY = 'cms-profesional-page-form-collapsed'
const PREVIEW_COLLAPSED_STORAGE_KEY = 'cms-profesional-page-preview-collapsed'

const clampFormPanelWidth = (width: number) => {
  if (typeof window === 'undefined') {
    return Math.min(MAX_FORM_PANEL_WIDTH, Math.max(MIN_FORM_PANEL_WIDTH, Math.round(width)))
  }

  if (window.innerWidth < 768) {
    return Math.min(MAX_FORM_PANEL_WIDTH, Math.max(MIN_FORM_PANEL_WIDTH, Math.round(width)))
  }

  const reservedForPreview = MIN_PREVIEW_PANEL_WIDTH + 24
  const viewportMax = Math.max(
    MIN_FORM_PANEL_WIDTH,
    Math.min(MAX_FORM_PANEL_WIDTH, window.innerWidth - reservedForPreview),
  )

  return Math.min(
    viewportMax,
    Math.max(MIN_FORM_PANEL_WIDTH, Math.round(width)),
  )
}

const getPublicBaseUrl = () => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_WEB_PUBLIC_URL ?? process.env.NEXT_PUBLIC_WEB_URL

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:3000'
  }

  const currentUrl = new URL(window.location.href)
  currentUrl.port = currentUrl.port === '3001' ? '3000' : currentUrl.port
  currentUrl.pathname = ''
  currentUrl.search = ''
  currentUrl.hash = ''

  return currentUrl.toString().replace(/\/$/, '')
}

const getPagePath = (slugValue: unknown, titleValue: unknown) => {
  const rawValue =
    typeof slugValue === 'string' && slugValue.trim()
      ? slugValue
      : typeof titleValue === 'string'
        ? titleValue
        : 'vista-previa'
  const slug = formatPageSlug(rawValue)

  return slug === 'home' || slug === 'inicio' ? '/' : `/${slug || 'vista-previa'}`
}

const isVisualEditUpdate = (value: unknown): value is VisualEditUpdate =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'path' in value &&
      typeof (value as { path?: unknown }).path === 'string',
  )

export function PagePreviewPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const frameWrapRef = useRef<HTMLDivElement>(null)
  const lastFormPanelWidthRef = useRef(DEFAULT_FORM_PANEL_WIDTH)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFormCollapsed, setIsFormCollapsed] = useState(false)
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false)
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [hasLoadedFormPanelWidth, setHasLoadedFormPanelWidth] = useState(false)
  const [leftWidth, setLeftWidth] = useState(DEFAULT_FORM_PANEL_WIDTH)
  const [refreshKey, setRefreshKey] = useState(0)
  const [status, setStatus] = useState('Lista')
  const { setModified } = useForm()
  const dispatchField = useFormFields(([, dispatch]) => dispatch)
  const values = useFormFields(([fields]) =>
    reduceFieldsToValues(fields, true),
  ) as PageValues
  const [previewValues, setPreviewValues] = useState<PageValues>(values)
  const [previewPanelSize, setPreviewPanelSize] = useState({ height: 760, width: 1024 })
  const valuesSignature = useMemo(() => JSON.stringify(values), [values])
  const url = useMemo(() => {
    const previewUrl = new URL(
      getPagePath(previewValues.slug, previewValues.title),
      getPublicBaseUrl(),
    )
    previewUrl.searchParams.set('cmsPreview', 'page')
    return previewUrl.toString()
  }, [previewValues.slug, previewValues.title])
  const selectedViewportWidth = deviceWidths[device]
  const previewUsableWidth = Math.max(240, previewPanelSize.width - 32)
  const previewScale = Math.min(
    1,
    Math.max(0.24, previewUsableWidth / selectedViewportWidth),
  )
  const minimumScaledPreviewHeight = previewPanelSize.width < 520 ? 520 : 720
  const scaledPreviewHeight = Math.max(
    minimumScaledPreviewHeight,
    Math.floor(Math.max(320, previewPanelSize.height - 24) / previewScale),
  )

  useEffect(() => {
    const storedCollapsed = window.localStorage.getItem(FORM_COLLAPSED_STORAGE_KEY)
    const initialWidth = clampFormPanelWidth(DEFAULT_FORM_PANEL_WIDTH)

    setLeftWidth(initialWidth)
    lastFormPanelWidthRef.current = initialWidth
    window.localStorage.setItem(FORM_PANEL_WIDTH_STORAGE_KEY, String(initialWidth))
    window.localStorage.setItem(PREVIEW_COLLAPSED_STORAGE_KEY, 'false')

    if (storedCollapsed === 'true') {
      setLeftWidth(0)
      setIsFormCollapsed(true)
    }

    setHasLoadedFormPanelWidth(true)
  }, [])

  useEffect(() => {
    const element = frameWrapRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return
      }

      setPreviewPanelSize({
        height: Math.max(360, Math.floor(entry.contentRect.height)),
        width: Math.max(280, Math.floor(entry.contentRect.width)),
      })
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const layoutContainer = document.querySelector<HTMLElement>(
      '.collection-edit--pages:has(.app-page-preview) .document-fields',
    )
    const leftPanel = layoutContainer?.querySelector<HTMLElement>('.document-fields__edit')
    const rightPanel = layoutContainer?.querySelector<HTMLElement>('.document-fields__sidebar-wrap')

    layoutContainer?.classList.add('admin-layout-container')
    leftPanel?.classList.add('admin-left-panel')
    rightPanel?.classList.add('admin-right-shell')

    return () => {
      leftPanel?.style.removeProperty('display')
      leftPanel?.style.removeProperty('flex-basis')
      leftPanel?.style.removeProperty('width')
      layoutContainer?.classList.remove('admin-layout-container')
      leftPanel?.classList.remove('admin-left-panel')
      rightPanel?.classList.remove('admin-right-shell')
    }
  }, [])

  useEffect(() => {
    const updateAvailableHeight = () => {
      const layoutContainer = document.querySelector<HTMLElement>(
        '.collection-edit--pages:has(.app-page-preview) .document-fields',
      )

      if (!layoutContainer) {
        return
      }

      const { top } = layoutContainer.getBoundingClientRect()
      const minimumHeight = window.innerWidth < 768 ? 520 : 680
      const availableHeight = Math.max(
        minimumHeight,
        Math.floor(window.innerHeight - Math.max(top, 0) - 16),
      )

      layoutContainer.style.setProperty('--page-composer-available-height', `${availableHeight}px`)
      document.documentElement.style.setProperty(
        '--page-composer-available-height',
        `${availableHeight}px`,
      )
    }

    updateAvailableHeight()

    window.addEventListener('resize', updateAvailableHeight)
    window.addEventListener('orientationchange', updateAvailableHeight)

    return () => {
      window.removeEventListener('resize', updateAvailableHeight)
      window.removeEventListener('orientationchange', updateAvailableHeight)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('is-page-form-collapsed', isFormCollapsed)
    window.localStorage.setItem(FORM_COLLAPSED_STORAGE_KEY, String(isFormCollapsed))

    return () => {
      document.body.classList.remove('is-page-form-collapsed')
    }
  }, [isFormCollapsed])

  useEffect(() => {
    document.body.classList.toggle('is-page-preview-collapsed', isPreviewCollapsed)
    window.localStorage.setItem(PREVIEW_COLLAPSED_STORAGE_KEY, String(isPreviewCollapsed))

    return () => {
      document.body.classList.remove('is-page-preview-collapsed')
    }
  }, [isPreviewCollapsed])

  useEffect(() => {
    const leftPanel = document.querySelector<HTMLElement>(
      '.collection-edit--pages:has(.app-page-preview) .document-fields__edit',
    )
    const layoutContainer = document.querySelector<HTMLElement>(
      '.collection-edit--pages:has(.app-page-preview) .document-fields',
    )
    const isLeftPanelCollapsed = leftWidth === 0
    const nextWidth = isLeftPanelCollapsed
      ? '0px'
      : isPreviewCollapsed
        ? 'calc(100% - 24px)'
        : `${leftWidth}px`

    if (leftPanel) {
      leftPanel.style.display = isLeftPanelCollapsed ? 'none' : 'block'
      leftPanel.style.flexBasis = nextWidth
      leftPanel.style.width = nextWidth
    }

    layoutContainer?.style.setProperty('--left-panel-width', nextWidth)
    document.documentElement.style.setProperty(
      '--cms-profesional-page-form-width',
      nextWidth,
    )

    if (!isFormCollapsed && !isPreviewCollapsed) {
      lastFormPanelWidthRef.current = leftWidth
    }

    if (hasLoadedFormPanelWidth) {
      window.localStorage.setItem(FORM_PANEL_WIDTH_STORAGE_KEY, String(leftWidth))
    }
  }, [leftWidth, hasLoadedFormPanelWidth, isFormCollapsed, isPreviewCollapsed])

  useEffect(() => {
    setStatus((current) => (current === 'Actualizando...' ? current : 'Actualizando...'))
    const timeout = window.setTimeout(() => {
      setPreviewValues(JSON.parse(valuesSignature) as PageValues)
      setStatus((current) => (current === 'Actualizada' ? current : 'Actualizada'))
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [valuesSignature])

  useEffect(() => {
    setIsLoaded(false)
  }, [url, refreshKey])

  useEffect(() => {
    if (!isLoaded || !iframeRef.current?.contentWindow) {
      return
    }

    iframeRef.current.contentWindow.postMessage(
      {
        collectionSlug: 'pages',
        data: previewValues,
        type: 'payload-live-preview',
      },
      new URL(url).origin,
    )
  }, [isLoaded, previewValues, url])

  useEffect(() => {
    const expectedOrigin = new URL(url).origin

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) {
        return
      }

      const message = event.data as { type?: unknown; updates?: unknown } | null

      if (!message || message.type !== 'cms-visual-edit' || !Array.isArray(message.updates)) {
        return
      }

      message.updates.forEach((update) => {
        if (!isVisualEditUpdate(update)) {
          return
        }

        dispatchField({
          path: update.path,
          type: 'UPDATE',
          value: update.value,
        })
      })

      if (message.updates.length > 0) {
        setModified(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [dispatchField, setModified, url])

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startWidth = leftWidth === 0 ? 0 : leftWidth

    setIsFormCollapsed(false)
    setIsPreviewCollapsed(false)

    document.body.classList.add('is-resizing-page-composer-split')

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      setLeftWidth(clampFormPanelWidth(startWidth + moveEvent.clientX - startX))
    }

    const handlePointerUp = () => {
      document.body.classList.remove('is-resizing-page-composer-split')
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
  }

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setIsFormCollapsed(false)
      setIsPreviewCollapsed(false)
      setLeftWidth((current) => clampFormPanelWidth(current - 32))
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setIsFormCollapsed(false)
      setIsPreviewCollapsed(false)
      setLeftWidth((current) => clampFormPanelWidth(current + 32))
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setLeftWidth(MIN_FORM_PANEL_WIDTH)
    }

    if (event.key === 'End') {
      event.preventDefault()
      setLeftWidth(MAX_FORM_PANEL_WIDTH)
    }
  }

  const toggleFormPanel = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isFormCollapsed) {
      setLeftWidth(clampFormPanelWidth(lastFormPanelWidthRef.current))
      setIsFormCollapsed(false)
      return
    }

    lastFormPanelWidthRef.current = leftWidth
    setIsPreviewCollapsed(false)
    setLeftWidth(0)
    setIsFormCollapsed(true)
  }

  const togglePreviewPanel = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isPreviewCollapsed) {
      setLeftWidth(clampFormPanelWidth(lastFormPanelWidthRef.current))
      setIsPreviewCollapsed(false)
      return
    }

    lastFormPanelWidthRef.current = leftWidth
    setIsFormCollapsed(false)
    setIsPreviewCollapsed(true)
  }

  return (
    <>
      <div
        aria-label="Redimensionar formulario y vista previa"
        aria-valuemax={MAX_FORM_PANEL_WIDTH}
        aria-valuemin={0}
        aria-valuenow={leftWidth === 0 ? 0 : leftWidth}
        className="admin-splitter"
        onDoubleClick={() => setLeftWidth(DEFAULT_FORM_PANEL_WIDTH)}
        onKeyDown={handleResizeKeyDown}
        onPointerDown={handleResizeStart}
        role="slider"
        tabIndex={0}
        title="Arrastra para redimensionar el formulario. Doble clic para restablecer."
      >
        <div className="admin-splitter-line" />
        <div className="admin-splitter-grip">
          <button
            aria-label={isPreviewCollapsed ? 'Restaurar vista previa' : 'Ocultar vista previa'}
            className="admin-splitter-btn"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={togglePreviewPanel}
            title={isPreviewCollapsed ? 'Restaurar vista previa' : 'Ocultar vista previa'}
            type="button"
          >
            ◀
          </button>
          <button
            aria-label={isFormCollapsed ? 'Restaurar formulario' : 'Ocultar formulario'}
            className="admin-splitter-btn"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={toggleFormPanel}
            title={isFormCollapsed ? 'Restaurar formulario' : 'Ocultar formulario'}
            type="button"
          >
            ▶
          </button>
        </div>
      </div>
      <section className={`admin-right-panel app-page-preview${isExpanded ? ' is-expanded' : ''}`}>
      <div className="app-page-preview__header">
        <div>
          <p>VISTA PREVIA</p>
          <h2>Asi se vera la pagina</h2>
          <span>{status}</span>
        </div>
        <div>
          {(['desktop', 'laptop', 'tablet', 'mobile'] as PreviewDevice[]).map((item) => (
            <button
              aria-pressed={device === item}
              className={device === item ? 'is-active' : undefined}
              key={item}
              onClick={() => setDevice(item)}
              type="button"
            >
              {item === 'desktop'
                ? 'Desktop'
                : item === 'laptop'
                  ? 'Laptop'
                  : item === 'tablet'
                    ? 'Tablet'
                    : 'Mobile'}
            </button>
          ))}
          <button onClick={() => setRefreshKey((current) => current + 1)} type="button">
            Recargar
          </button>
          <button onClick={() => setIsExpanded((current) => !current)} type="button">
            {isExpanded ? 'Reducir' : 'Ampliar'}
          </button>
          <button
            onClick={() => {
              if (leftWidth === 0) {
                setLeftWidth(clampFormPanelWidth(lastFormPanelWidthRef.current))
                setIsFormCollapsed(false)
                return
              }

              lastFormPanelWidthRef.current = leftWidth
              setLeftWidth(0)
              setIsFormCollapsed(true)
            }}
            type="button"
          >
            {isFormCollapsed ? 'Mostrar campos' : 'Ocultar campos'}
          </button>
          <a href={url} rel="noreferrer" target="_blank">
            Abrir
          </a>
        </div>
      </div>
      <button
        aria-pressed={isFormCollapsed}
        className="app-page-preview__collapse-form-toggle"
        onClick={() => {
          if (leftWidth === 0) {
            setLeftWidth(clampFormPanelWidth(lastFormPanelWidthRef.current))
            setIsFormCollapsed(false)
            return
          }

          lastFormPanelWidthRef.current = leftWidth
          setLeftWidth(0)
          setIsFormCollapsed(true)
        }}
        title={isFormCollapsed ? 'Mostrar formulario' : 'Colapsar formulario'}
        type="button"
      >
        <span>{isFormCollapsed ? '>' : '<'}</span>
        <strong>{isFormCollapsed ? 'Campos' : 'Preview'}</strong>
      </button>
      <div
        className="app-page-preview__frame-wrap"
        data-device={device}
        ref={frameWrapRef}
        style={{
          '--preview-scale': previewScale,
          '--preview-viewport-width': `${selectedViewportWidth}px`,
          '--preview-scaled-height': `${scaledPreviewHeight}px`,
        } as CSSProperties}
      >
        <iframe
          className="app-page-preview__frame"
          key={`${url}-${refreshKey}`}
          onLoad={() => setIsLoaded(true)}
          ref={iframeRef}
          src={url}
          style={{
            height: scaledPreviewHeight,
            width: selectedViewportWidth,
          }}
          title="Vista previa de pagina"
        />
      </div>
      </section>
    </>
  )
}
