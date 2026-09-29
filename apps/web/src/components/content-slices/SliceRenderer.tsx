'use client'

import dynamic from 'next/dynamic'

import { CustomCanvasEditor, PageRenderer } from '@/components/page-composer/PageRenderer'
import type { PageSection, SitePage, SiteProfile } from '@/lib/cms'

import type { SliceComponentProps } from './types'

type SliceRendererProps = {
  isPreview?: boolean
  page: SitePage
  siteProfile: SiteProfile
}

type SectionEntry = {
  index: number
  section: PageSection
}

const HeroSlice = dynamic<SliceComponentProps>(() =>
  import('./HeroSlice').then((module) => module.HeroSlice),
)

const FeatureGrid = dynamic<SliceComponentProps>(() =>
  import('./FeatureGrid').then((module) => module.FeatureGrid),
)

const CTASlice = dynamic<SliceComponentProps>(() =>
  import('./CTASlice').then((module) => module.CTASlice),
)

const sliceComponents = {
  ctaSlice: CTASlice,
  featureGridSlice: FeatureGrid,
  heroSlice: HeroSlice,
} as const

const isContentSlice = (
  blockType: string,
): blockType is keyof typeof sliceComponents => blockType in sliceComponents

const isCanvasSlice = (blockType: string) => blockType === 'canvasSlice'

const getSectionKey = (section: PageSection, index: number) =>
  section.id ?? `${section.blockType}-${index}`

const getVisualOverrides = (section: PageSection) =>
  section.visualOverrides && typeof section.visualOverrides === 'object' && !Array.isArray(section.visualOverrides)
    ? (section.visualOverrides as Record<string, unknown>)
    : null

const getSafeSections = (sections: unknown): PageSection[] =>
  Array.isArray(sections)
    ? sections.filter(
        (section): section is PageSection =>
          Boolean(section && typeof section === 'object' && typeof section.blockType === 'string'),
      )
    : []

export function SliceRenderer({ isPreview = false, page, siteProfile }: SliceRendererProps) {
  const safePage = {
    ...page,
    sections: getSafeSections(page?.sections),
  }
  const sectionEntries: SectionEntry[] = safePage.sections
    .map((section, index) => ({ index, section }))
    .filter(({ section }) => section.enabled !== false)
  const hasOnlyLegacySections =
    sectionEntries.length > 0 &&
    sectionEntries.every(
      ({ section }) => !isContentSlice(section.blockType) && !isCanvasSlice(section.blockType),
    )

  if (hasOnlyLegacySections) {
    return <PageRenderer isPreview={isPreview} page={safePage} />
  }

  return (
    <main
      className="max-w-[100vw] overflow-x-clip"
      data-page-preview={isPreview ? 'true' : undefined}
      data-site-profile={siteProfile}
    >
      {sectionEntries.length > 0 ? (
        sectionEntries.map(({ index, section }) => {
          const pageAnchor = typeof section.pageAnchor === 'string' ? section.pageAnchor : undefined

          if (!isContentSlice(section.blockType)) {
            if (isCanvasSlice(section.blockType)) {
              return (
                <div id={pageAnchor} key={getSectionKey(section, index)}>
                  <CustomCanvasEditor
                    isPreview={isPreview}
                    section={section}
                    sectionIndex={index}
                    templateKey="canvasSlice"
                  />
                </div>
              )
            }

            return (
              <section
                className="bg-deep-950 px-5 py-10 text-silver-300 sm:px-8"
                id={pageAnchor}
                key={getSectionKey(section, index)}
              >
                <div className="mx-auto max-w-7xl border border-cyan-200/16 bg-white/[0.035] p-6">
                  <p className="font-heading text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">
                    Seccion legacy no convertida
                  </p>
                  <p className="mt-3 text-sm">
                    Este bloque usa <code>{section.blockType}</code>. Migrarlo a Content Slices lo
                    habilitara en el nuevo renderer.
                  </p>
                </div>
              </section>
            )
          }

          const Component = sliceComponents[section.blockType]

          return (
            <div id={pageAnchor} key={getSectionKey(section, index)}>
              <Component
                isPreview={isPreview}
                section={section}
                sectionIndex={index}
                siteProfile={siteProfile}
                visualOverrides={getVisualOverrides(section)}
              />
            </div>
          )
        })
      ) : (
        <section className="bg-deep-950 px-5 py-28 text-silver-50 sm:px-8">
          <div className="mx-auto max-w-4xl border border-cyan-200/16 bg-white/[0.045] p-8">
            <p className="font-heading text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
              Pagina en preparacion
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.04em]">{page.title}</h1>
            <p className="mt-4 text-silver-300">
              Agrega slices desde el administrador para construir la pagina.
            </p>
          </div>
        </section>
      )}
    </main>
  )
}
