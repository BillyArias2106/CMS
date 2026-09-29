'use client'

import { useEffect, useState } from 'react'

export type ResponsiveEditorMode = 'absolute' | 'flow' | 'hybrid'

export const getResponsiveEditorSnapshot = (width: number) => {
  const isMobile = width > 0 && width < 768
  const isTablet = width >= 768 && width < 1024
  const isDesktop = width >= 1024

  return {
    editorMode: isMobile ? 'flow' : isTablet ? 'hybrid' : 'absolute',
    isDesktop,
    isMobile,
    isTablet,
    viewportWidth: width,
  } as const
}

export function useResponsiveEditor() {
  const [viewportWidth, setViewportWidth] = useState(0)

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth)

    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    window.addEventListener('orientationchange', updateViewportWidth)

    return () => {
      window.removeEventListener('resize', updateViewportWidth)
      window.removeEventListener('orientationchange', updateViewportWidth)
    }
  }, [])

  return getResponsiveEditorSnapshot(viewportWidth)
}
