'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { twMerge } from 'tailwind-merge'

import {
  getVisualContentStyle,
  VisualEditWrapper,
} from '@/components/page-composer/VisualEditWrapper'
import { normalizeLayerOverride } from '@/components/page-composer/visual-edit-store'

import type { HeroSliceSection, SliceComponentProps } from './types'
import { getMediaAlt, getMediaUrl, getSafeActions, isVideoMedia } from './types'

type HeroSliceProps = SliceComponentProps<HeroSliceSection>

export function HeroSlice({
  isPreview = false,
  section,
  sectionIndex,
  siteProfile,
  visualOverrides,
}: HeroSliceProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const actions = getSafeActions(section.actions)
  const backgroundMediaUrl = getMediaUrl(section.backgroundMedia)
  const backgroundMediaAlt = getMediaAlt(section.backgroundMedia, '')
  const isBackgroundVideo = isVideoMedia(section.backgroundMedia)
  const mediaUrl = getMediaUrl(section.media)
  const mediaAlt = getMediaAlt(section.media, section.title ?? '')
  const isGovernment = siteProfile === 'government'
  const isSaas = siteProfile === 'saas-apple'
  const hasBackgroundMedia = Boolean(backgroundMediaUrl)
  const eyebrowStyle = getVisualContentStyle(visualOverrides, 'eyebrow')
  const titleStyle = getVisualContentStyle(visualOverrides, 'title')
  const descriptionStyle = getVisualContentStyle(visualOverrides, 'description')
  const buttonsStyle = getVisualContentStyle(visualOverrides, 'buttons')
  const buttonsOverride = normalizeLayerOverride(visualOverrides?.buttons)
  const shouldFillButtonsBox = Boolean(buttonsOverride.width || buttonsOverride.height)
  const hasCustomTitleColor = Boolean(titleStyle.color)

  return (
    <section
      className={twMerge(
        'relative isolate min-h-[640px] overflow-hidden px-4 py-20 sm:min-h-[680px] sm:px-8 sm:py-32',
        hasBackgroundMedia
          ? 'text-white'
          : isGovernment
            ? 'bg-white text-[#07164b]'
            : 'bg-[radial-gradient(circle_at_80%_10%,rgba(141,225,232,0.18),transparent_34%),#02080c] text-silver-50',
      )}
      data-visual-slice-root
      ref={sectionRef}
    >
      {backgroundMediaUrl ? (
        <>
          {isBackgroundVideo ? (
            <video
              aria-label={backgroundMediaAlt || undefined}
              autoPlay
              className="absolute inset-0 -z-10 h-full w-full object-cover"
              loop
              muted
              playsInline
              src={backgroundMediaUrl}
            />
          ) : (
            <Image
              alt={backgroundMediaAlt}
              className="absolute inset-0 -z-10 object-cover"
              fill
              priority
              sizes="100vw"
              src={backgroundMediaUrl}
            />
          )}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_24%,rgba(141,225,232,0.2),transparent_28%),linear-gradient(180deg,rgba(2,8,12,0.1)_0%,rgba(2,8,12,0.42)_45%,rgba(2,8,12,0.94)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/76 via-black/40 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-black/88 to-transparent" />
        </>
      ) : null}

      {!isGovernment ? (
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />
      ) : null}

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 sm:gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="min-w-0">
          {isPreview && typeof sectionIndex === 'number' ? (
            <div className="mb-5 w-fit max-w-full rounded-full border border-cyan-100/18 bg-white/8 px-4 py-2 font-heading text-xs font-black uppercase tracking-[0] text-cyan-100 shadow-[0_0_30px_rgba(141,225,232,0.12)] backdrop-blur-xl">
              Modo visual activo: selecciona una capa para moverla, escalarla o alinearla
            </div>
          ) : null}

          {section.eyebrow ? (
            <VisualEditWrapper
              displayBlock={false}
              fieldPath="eyebrow"
              isPreview={isPreview}
              label="Etiqueta"
              maxWidth="32rem"
              sectionIndex={sectionIndex}
              visualOverrides={visualOverrides}
            >
              <p
                className={twMerge(
                  'w-fit max-w-full rounded-full border px-4 py-2 font-heading text-xs font-black uppercase tracking-[0] backdrop-blur-md',
                  hasBackgroundMedia ? 'text-white/80' : isGovernment ? 'text-blue-900' : 'text-cyan-200',
                  hasBackgroundMedia
                    ? 'border-white/15 bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.06)]'
                    : isGovernment
                      ? 'border-blue-900 bg-blue-50'
                      : 'border-cyan-200/20 bg-cyan-200/10',
                )}
                style={eyebrowStyle}
              >
                {section.eyebrow}
              </p>
            </VisualEditWrapper>
          ) : null}

          {section.title ? (
            <VisualEditWrapper
              className="mt-5 max-w-full sm:mt-6 sm:max-w-4xl"
              fieldPath="title"
              isPreview={isPreview}
              label="Titulo"
              maxWidth="58rem"
              sectionIndex={sectionIndex}
              visualOverrides={visualOverrides}
            >
              <h1
                className={twMerge(
                  'text-[clamp(2.15rem,10vw,4.5rem)] font-black leading-[1.02] tracking-[0] sm:leading-[0.98]',
                  !isGovernment && !hasCustomTitleColor
                    ? 'bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_20px_50px_rgba(0,0,0,0.45)]'
                    : '',
                )}
                style={titleStyle}
              >
                {section.title}
              </h1>
            </VisualEditWrapper>
          ) : null}

          {section.description ? (
            <VisualEditWrapper
              className="mt-6 max-w-full sm:mt-7 sm:max-w-2xl"
              fieldPath="description"
              isPreview={isPreview}
              label="Descripcion"
              maxWidth="42rem"
              sectionIndex={sectionIndex}
              visualOverrides={visualOverrides}
            >
              <p
                className={twMerge(
                  'text-base font-medium leading-7 sm:text-lg sm:leading-8',
                  hasBackgroundMedia ? 'text-white/82' : isGovernment ? 'text-[#1f2f52]' : 'text-silver-300',
                )}
                style={descriptionStyle}
              >
                {section.description}
              </p>
            </VisualEditWrapper>
          ) : null}

          {actions.length > 0 ? (
            <VisualEditWrapper
              className="mt-8 max-w-full sm:mt-9 sm:max-w-2xl"
              displayBlock={false}
              fieldPath="buttons"
              isPreview={isPreview}
              label="Botones"
              maxWidth="44rem"
              sectionIndex={sectionIndex}
              visualOverrides={visualOverrides}
            >
              <div
                className="flex min-w-0 max-w-full flex-wrap gap-3"
                style={{
                  ...buttonsStyle,
                  height: shouldFillButtonsBox ? '100%' : buttonsStyle.height,
                  width: shouldFillButtonsBox ? '100%' : buttonsStyle.width,
                }}
              >
                {actions.map((action, index) => (
                  <a
                    className={twMerge(
                      'inline-flex min-h-12 min-w-0 max-w-full items-center justify-center px-6 text-center font-heading text-sm font-black uppercase leading-tight tracking-[0] transition',
                      hasBackgroundMedia
                        ? index === 0
                          ? 'rounded-full border border-white/60 bg-white text-slate-950 shadow-[0_0_36px_rgba(255,255,255,0.24)] hover:-translate-y-1 hover:shadow-[0_0_52px_rgba(141,225,232,0.35)]'
                          : 'rounded-full border border-white/30 bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md hover:-translate-y-1 hover:border-white/60 hover:bg-white/12'
                        : isGovernment
                          ? index === 0
                            ? 'rounded-none bg-blue-900 text-white hover:bg-blue-800'
                            : 'rounded-none border-2 border-blue-900 text-blue-900 hover:bg-blue-50'
                          : isSaas
                            ? 'rounded-full border border-white/60 bg-white px-7 text-slate-950 shadow-[0_0_42px_rgba(255,255,255,0.22)] hover:-translate-y-1 hover:shadow-[0_0_64px_rgba(141,225,232,0.32)]'
                            : 'rounded-full border border-cyan-200/70 bg-cyan-200 text-deep-950 shadow-[0_0_40px_rgba(141,225,232,0.22)] hover:-translate-y-1 hover:bg-white',
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
        </div>

        {mediaUrl ? (
          <VisualEditWrapper
            className="overflow-hidden"
            fieldPath="media"
            isPreview={isPreview}
            label="Imagen"
            maxWidth="44rem"
            sectionIndex={sectionIndex}
            visualOverrides={visualOverrides}
          >
            <div
              className={twMerge(
                'overflow-hidden',
                hasBackgroundMedia
                  ? 'rounded-[2rem] border border-white/40 bg-white/10 p-2 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur'
                  : isGovernment
                    ? 'border-4 border-blue-900'
                    : isSaas
                      ? 'rounded-[2rem] border border-white/50 bg-white/10 p-2 shadow-[0_40px_120px_rgba(0,0,0,0.28)] backdrop-blur'
                      : 'border border-cyan-200/20',
              )}
            >
              <Image
                alt={mediaAlt}
                className="h-full min-h-[clamp(18rem,58vw,22.5rem)] w-full object-cover"
                height={720}
                src={mediaUrl}
                width={960}
              />
            </div>
          </VisualEditWrapper>
        ) : null}
      </div>
    </section>
  )
}
