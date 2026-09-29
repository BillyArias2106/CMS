'use client'

import { twMerge } from 'tailwind-merge'

import {
  getVisualContentStyle,
  VisualEditWrapper,
} from '@/components/page-composer/VisualEditWrapper'
import { normalizeLayerOverride } from '@/components/page-composer/visual-edit-store'

import type { CTASliceSection, SliceComponentProps } from './types'
import { getSafeActions } from './types'

type CTASliceProps = SliceComponentProps<CTASliceSection>

export function CTASlice({
  isPreview = false,
  section,
  sectionIndex,
  siteProfile,
  visualOverrides,
}: CTASliceProps) {
  const actions = getSafeActions(section.actions)
  const isGovernment = siteProfile === 'government'
  const isSaas = siteProfile === 'saas-apple'
  const buttonsStyle = getVisualContentStyle(visualOverrides, 'buttons')
  const buttonsOverride = normalizeLayerOverride(visualOverrides?.buttons)
  const shouldFillButtonsBox = Boolean(buttonsOverride.width || buttonsOverride.height)

  return (
    <section
      className={twMerge(
        'relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-8',
        isGovernment ? 'bg-blue-900 text-white' : 'bg-deep-950 text-silver-50',
      )}
      data-visual-slice-root
    >
      <div
        className={twMerge(
          'mx-auto max-w-6xl px-4 py-10 text-center sm:px-8 sm:py-14 lg:px-10 lg:py-16',
          isGovernment
            ? 'border-4 border-white'
            : isSaas
              ? 'rounded-[2rem] border border-white/15 bg-white/10 shadow-[0_28px_100px_rgba(141,225,232,0.12)] backdrop-blur-xl'
              : 'app-hud-frame border border-cyan-200/16 bg-white/[0.045]',
        )}
      >
        {section.eyebrow ? (
          <p className="font-heading text-sm font-black uppercase tracking-[0] opacity-75">
            {section.eyebrow}
          </p>
        ) : null}
        {section.title ? (
          <VisualEditWrapper
            className="mx-auto mt-5 max-w-full sm:max-w-4xl"
            fieldPath="title"
            isPreview={isPreview}
            label="Titulo"
            maxWidth="58rem"
            sectionIndex={sectionIndex}
            visualOverrides={visualOverrides}
          >
            <h2 className="text-[clamp(2rem,9vw,3.75rem)] font-black leading-[1.08] tracking-[0] sm:leading-[1.05]">
              {section.title}
            </h2>
          </VisualEditWrapper>
        ) : null}
        {section.description ? (
          <VisualEditWrapper
            className="mx-auto mt-5 max-w-full sm:mt-6 sm:max-w-2xl"
            fieldPath="description"
            isPreview={isPreview}
            label="Descripcion"
            maxWidth="42rem"
            sectionIndex={sectionIndex}
            visualOverrides={visualOverrides}
          >
            <p className="text-base font-medium leading-8 opacity-80">
              {section.description}
            </p>
          </VisualEditWrapper>
        ) : null}
        {actions.length > 0 ? (
          <VisualEditWrapper
            className="mx-auto mt-9 max-w-full sm:max-w-3xl"
            displayBlock={false}
            fieldPath="buttons"
            isPreview={isPreview}
            label="Botones"
            maxWidth="48rem"
            sectionIndex={sectionIndex}
            visualOverrides={visualOverrides}
          >
            <div
              className="flex min-w-0 max-w-full flex-col justify-center gap-3 sm:flex-row sm:flex-wrap"
              style={{
                ...buttonsStyle,
                height: shouldFillButtonsBox ? '100%' : buttonsStyle.height,
                width: shouldFillButtonsBox ? '100%' : buttonsStyle.width,
              }}
            >
              {actions.map((action, index) => (
                <a
                  className={twMerge(
                    'inline-flex min-h-12 min-w-0 max-w-full items-center justify-center px-6 text-center font-heading text-sm font-black uppercase leading-tight tracking-[0] transition sm:w-auto',
                    isGovernment
                      ? index === 0
                        ? 'rounded-none bg-white text-blue-900 hover:bg-blue-50'
                        : 'rounded-none border-2 border-white text-white hover:bg-white/10'
                      : isSaas
                        ? 'rounded-full bg-white px-7 text-slate-950 hover:-translate-y-0.5'
                        : 'bg-cyan-200 text-deep-950 hover:bg-white',
                  )}
                  href={action.url}
                  key={action.id ?? action.url}
                  rel={action.openInNewTab ? 'noreferrer' : undefined}
                  style={
                    shouldFillButtonsBox
                      ? {
                          height: '100%',
                          justifyContent: 'center',
                          width: actions.length === 1 ? '100%' : undefined,
                        }
                      : undefined
                  }
                  target={action.openInNewTab ? '_blank' : undefined}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </VisualEditWrapper>
        ) : null}
        {section.finePrint ? (
          <VisualEditWrapper
            className="mx-auto mt-7 max-w-xl"
            fieldPath="finePrint"
            isPreview={isPreview}
            label="Nota"
            maxWidth="38rem"
            sectionIndex={sectionIndex}
            visualOverrides={visualOverrides}
          >
            <p className="text-xs font-semibold uppercase tracking-[0] opacity-60">
              {section.finePrint}
            </p>
          </VisualEditWrapper>
        ) : null}
      </div>
    </section>
  )
}
