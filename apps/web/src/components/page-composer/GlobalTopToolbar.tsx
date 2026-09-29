'use client'

import { useEffect, useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Layers,
  List,
  ListOrdered,
  Minus,
  Move,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'

import {
  clamp,
  resetVisualEditOverride,
  round,
  subscribeToVisualEdit,
  type TextAlign,
  updateVisualEditOverride,
  type VisualAnimation,
  type VisualEditSnapshot,
} from './visual-edit-store'
import { useResponsiveEditor } from './useResponsiveEditor'

type MenuId = 'animate' | 'background' | 'font' | 'opacity' | 'position' | 'spacing' | null

const fontOptions = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Lato',
  'Oswald',
  'Raleway',
  'Nunito',
  'Space Grotesk',
  'Plus Jakarta Sans',
  'Merriweather',
  'Source Sans 3',
  'Work Sans',
  'DM Sans',
  'Manrope',
  'Urbanist',
  'Bebas Neue',
  'Cormorant Garamond',
  'Libre Baskerville',
  'Fira Sans',
  'Rubik',
  'Archivo',
  'Georgia',
  'Mono',
].map((font) => ({
  label: font,
  value:
    font === 'Georgia'
      ? 'Georgia, Cambria, "Times New Roman", Times, serif'
      : font === 'Mono'
        ? '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
        : `"${font}", Inter, ui-sans-serif, system-ui, sans-serif`,
}))

const animations: Array<{ group: 'Continuas' | 'Entrada'; label: string; value: VisualAnimation }> = [
  { group: 'Entrada', label: 'Fundir', value: 'visual-animate-fade-in' },
  { group: 'Entrada', label: 'Ascender', value: 'visual-animate-slide-up' },
  { group: 'Entrada', label: 'Deslizar', value: 'visual-animate-slide-in' },
  { group: 'Entrada', label: 'Teclear', value: 'visual-animate-typewriter' },
  { group: 'Entrada', label: 'Explosion', value: 'visual-animate-zoom-in' },
  { group: 'Entrada', label: 'Rebotar', value: 'visual-animate-bounce-in' },
  { group: 'Entrada', label: 'Bloque', value: 'visual-animate-wipe-in' },
  { group: 'Continuas', label: 'Rotacion', value: 'visual-animate-spin' },
  { group: 'Continuas', label: 'Latido', value: 'visual-animate-pulse' },
  { group: 'Continuas', label: 'Parpadeo', value: 'visual-animate-blink' },
  { group: 'Continuas', label: 'Temblor', value: 'visual-animate-shake' },
]

const textAlignCycle: TextAlign[] = ['left', 'center', 'right', 'justify']

const toolButtonClassName =
  'flex h-9 w-9 cursor-pointer items-center justify-center rounded text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700 hover:text-white'

const activeToolButtonClassName = 'bg-gray-700 text-blue-300'

const dividerClassName = 'mx-1 h-6 w-[1px] bg-gray-700'

const leftPopoverClassName =
  'fixed bottom-[5.25rem] left-3 right-3 z-[120] flex max-h-[min(70dvh,30rem)] w-auto cursor-default flex-col gap-4 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-4 text-white shadow-2xl md:absolute md:bottom-auto md:left-0 md:right-auto md:top-full md:mt-3 md:w-[min(16rem,calc(100vw-1.5rem))] md:origin-top-left'

const rightPopoverClassName =
  'fixed bottom-[5.25rem] left-3 right-3 z-[120] flex max-h-[min(70dvh,30rem)] w-auto cursor-default flex-col gap-4 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-4 text-white shadow-2xl md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-3 md:w-[min(16rem,calc(100vw-1.5rem))] md:origin-top-right'

const popoverLabelClassName = 'text-xs font-semibold uppercase tracking-[0] text-gray-400'

const darkInputClassName =
  'rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-blue-500'

const getNextAlign = (align: TextAlign | undefined) => {
  const index = textAlignCycle.indexOf(align ?? 'left')

  return textAlignCycle[(index + 1) % textAlignCycle.length]
}

const AlignIcon = ({ align }: { align?: TextAlign }) => {
  if (align === 'center') {
    return <AlignCenter size={17} strokeWidth={2.2} />
  }

  if (align === 'right') {
    return <AlignRight size={17} strokeWidth={2.2} />
  }

  if (align === 'justify') {
    return <AlignJustify size={17} strokeWidth={2.2} />
  }

  return <AlignLeft size={17} strokeWidth={2.2} />
}

const Divider = () => <div className={dividerClassName} />

export function GlobalTopToolbar() {
  const [snapshot, setSnapshot] = useState<VisualEditSnapshot>({ activeElement: null })
  const [activeMenu, setActiveMenu] = useState<MenuId>(null)
  const { isMobile } = useResponsiveEditor()
  const activeElement = snapshot.activeElement
  const override = activeElement?.override ?? {}
  const fontSize = Math.round(override.fontSize ?? 18)
  const selectedFont = fontOptions.find((font) => font.value === override.fontFamily)

  useEffect(() => subscribeToVisualEdit(setSnapshot), [])

  if (!activeElement) {
    return null
  }

  const updateFontSize = (value: number) => {
    updateVisualEditOverride({ fontSize: round(clamp(value, 10, 160)) }, true)
  }

  const toggleMenu = (menu: Exclude<MenuId, null>) => {
    setActiveMenu((current) => (current === menu ? null : menu))
  }

  return (
    <div
      className={twMerge(
        'fixed z-[100] flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto overflow-y-visible border border-gray-700/50 bg-gray-900 px-2 text-white shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-[calc(100vw-2rem)] sm:px-4',
        isMobile
          ? 'bottom-4 left-2 right-2 h-14 rounded-2xl'
          : 'left-1/2 top-4 h-14 -translate-x-1/2 rounded-full',
      )}
      data-visual-edit-control
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="relative">
        <button
          aria-label="Fuente"
          className={twMerge(
            'flex h-9 max-w-[120px] cursor-pointer items-center rounded border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-800',
            activeMenu === 'font' ? 'border-blue-500 bg-gray-800 text-blue-200' : '',
          )}
          onClick={() => toggleMenu('font')}
          title="Fuente"
          type="button"
        >
          <span className="truncate">{selectedFont?.label ?? 'Fuente'}</span>
        </button>
        {activeMenu === 'font' ? (
          <div className={twMerge(leftPopoverClassName, 'max-h-80 overflow-y-auto')}>
            <div>
              <p className={popoverLabelClassName}>Fuente</p>
              <p className="mt-1 text-xs text-gray-500">Elige una tipografia para esta capa.</p>
            </div>
            <button
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              onClick={() => updateVisualEditOverride({ fontFamily: undefined }, true)}
              type="button"
            >
              Fuente del tema
            </button>
            <div className="grid gap-1">
              {fontOptions.map((font) => (
                <button
                  className={twMerge(
                    'truncate rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white',
                    override.fontFamily === font.value ? 'bg-blue-500/20 text-blue-200' : '',
                  )}
                  key={font.value}
                  onClick={() => updateVisualEditOverride({ fontFamily: font.value }, true)}
                  style={{ fontFamily: font.value }}
                  type="button"
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex h-9 items-center overflow-hidden rounded border border-gray-700 bg-gray-900">
        <button
          aria-label="Reducir tamano"
          className={twMerge(toolButtonClassName, 'h-9 w-8 rounded-none')}
          onClick={() => updateFontSize(fontSize - 2)}
          title="Reducir tamano"
          type="button"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <input
          aria-label="Tamano de fuente"
          className="h-9 w-16 flex-none border-x border-gray-700 bg-gray-900 px-2 text-center text-sm font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          max={160}
          min={10}
          onChange={(event) => updateFontSize(Number(event.target.value))}
          title="Tamano de fuente"
          type="number"
          value={fontSize}
        />
        <button
          aria-label="Aumentar tamano"
          className={twMerge(toolButtonClassName, 'h-9 w-8 rounded-none')}
          onClick={() => updateFontSize(fontSize + 2)}
          title="Aumentar tamano"
          type="button"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      {!isMobile ? <Divider /> : null}

      <label
        className={toolButtonClassName}
        title="Color de texto"
      >
        <Palette size={17} strokeWidth={2.2} />
        <input
          aria-label="Color de texto"
          className="sr-only"
          onChange={(event) => updateVisualEditOverride({ color: event.target.value }, true)}
          type="color"
          value={override.color ?? '#ffffff'}
        />
      </label>
      <div className="relative">
        <button
          aria-label="Color de fondo"
          className={twMerge(
            toolButtonClassName,
            'text-[10px] font-black',
            activeMenu === 'background' ? activeToolButtonClassName : '',
          )}
          onClick={() => toggleMenu('background')}
          title="Color de fondo"
          type="button"
        >
          BG
        </button>
        {activeMenu === 'background' ? (
          <div className={leftPopoverClassName}>
            <div>
              <p className={popoverLabelClassName}>Fondo</p>
              <p className="mt-1 text-xs text-gray-500">Color de fondo o sin relleno.</p>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-300">
              Color
              <input
                aria-label="Color de fondo"
                className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                onChange={(event) =>
                  updateVisualEditOverride({ backgroundColor: event.target.value }, true)
                }
                type="color"
                value={
                  override.backgroundColor && override.backgroundColor !== 'transparent'
                    ? override.backgroundColor
                    : '#111827'
                }
              />
            </label>
            <button
              className="rounded-lg border border-dashed border-gray-600 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-blue-500 hover:bg-gray-700 hover:text-white"
              onClick={() => updateVisualEditOverride({ backgroundColor: 'transparent' }, true)}
              type="button"
            >
              Sin fondo
            </button>
          </div>
        ) : null}
      </div>
      <button
        aria-label="Negrita"
        className={twMerge(
          toolButtonClassName,
          override.fontWeight === 'bold' ? activeToolButtonClassName : '',
        )}
        onClick={() =>
          updateVisualEditOverride(
            { fontWeight: override.fontWeight === 'bold' ? 'normal' : 'bold' },
            true,
          )
        }
        title="Negrita"
        type="button"
      >
        B
      </button>
      {isMobile ? (
        <button
          aria-label="Resetear"
          className={toolButtonClassName}
          onClick={() => resetVisualEditOverride()}
          title="Resetear"
          type="button"
        >
          <RotateCcw size={16} strokeWidth={2.3} />
        </button>
      ) : null}
      {!isMobile ? (
        <>
      <button
        aria-label="Cursiva"
        className={twMerge(
          toolButtonClassName,
          override.fontStyle === 'italic' ? activeToolButtonClassName : '',
        )}
        onClick={() =>
          updateVisualEditOverride(
            { fontStyle: override.fontStyle === 'italic' ? 'normal' : 'italic' },
            true,
          )
        }
        title="Cursiva"
        type="button"
      >
        <span className="font-serif italic">I</span>
      </button>
      <button
        aria-label="Subrayado"
        className={twMerge(
          toolButtonClassName,
          override.textDecoration === 'underline' ? activeToolButtonClassName : '',
        )}
        onClick={() =>
          updateVisualEditOverride(
            {
              textDecoration: override.textDecoration === 'underline' ? 'none' : 'underline',
            },
            true,
          )
        }
        title="Subrayado"
        type="button"
      >
        <span className="underline">U</span>
      </button>
      <button
        aria-label="Mayusculas o minusculas"
        className={twMerge(
          toolButtonClassName,
          override.textTransform && override.textTransform !== 'none'
            ? activeToolButtonClassName
            : '',
        )}
        onClick={() => {
          const next =
            override.textTransform === 'uppercase'
              ? 'lowercase'
              : override.textTransform === 'lowercase'
                ? 'none'
                : 'uppercase'

          updateVisualEditOverride({ textTransform: next }, true)
        }}
        title="Mayusculas / minusculas"
        type="button"
      >
        Aa
      </button>

      <Divider />

      <button
        aria-label="Alineacion"
        className={toolButtonClassName}
        onClick={() => updateVisualEditOverride({ textAlign: getNextAlign(override.textAlign) }, true)}
        title="Alineacion"
        type="button"
      >
        <AlignIcon align={override.textAlign} />
      </button>
      <button
        aria-label="Vinetas"
        className={twMerge(
          toolButtonClassName,
          override.listStyle === 'disc' ? activeToolButtonClassName : '',
        )}
        onClick={() =>
          updateVisualEditOverride(
            { listStyle: override.listStyle === 'disc' ? 'none' : 'disc' },
            true,
          )
        }
        title="Vinetas"
        type="button"
      >
        <List size={17} strokeWidth={2.2} />
      </button>
      <button
        aria-label="Numeracion"
        className={twMerge(
          toolButtonClassName,
          override.listStyle === 'decimal' ? activeToolButtonClassName : '',
        )}
        onClick={() =>
          updateVisualEditOverride(
            { listStyle: override.listStyle === 'decimal' ? 'none' : 'decimal' },
            true,
          )
        }
        title="Numeracion"
        type="button"
      >
        <ListOrdered size={17} strokeWidth={2.2} />
      </button>

      <Divider />

      <div className="relative">
        <button
          aria-label="Espaciado"
          className={twMerge(
            toolButtonClassName,
            activeMenu === 'spacing' ? activeToolButtonClassName : '',
          )}
          onClick={() => toggleMenu('spacing')}
          title="Espaciado"
          type="button"
        >
          <SlidersHorizontal size={17} strokeWidth={2.2} />
        </button>
        {activeMenu === 'spacing' ? (
          <div className={leftPopoverClassName}>
            <div>
              <p className={popoverLabelClassName}>Espaciado</p>
              <p className="mt-1 text-xs text-gray-500">Ajusta ritmo y lectura del texto.</p>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">
                Interletrado: {override.letterSpacing ?? 0}px
              </span>
              <input
                className="accent-blue-500"
                max={30}
                min={-10}
                onChange={(event) =>
                  updateVisualEditOverride({ letterSpacing: Number(event.target.value) }, true)
                }
                step={0.5}
                type="range"
                value={override.letterSpacing ?? 0}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">
                Interlineado: {override.lineHeight ?? 1.1}
              </span>
              <input
                className="accent-blue-500"
                max={3}
                min={0.75}
                onChange={(event) =>
                  updateVisualEditOverride({ lineHeight: Number(event.target.value) }, true)
                }
                step={0.05}
                type="range"
                value={override.lineHeight ?? 1.1}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          aria-label="Transparencia"
          className={twMerge(
            toolButtonClassName,
            activeMenu === 'opacity' ? activeToolButtonClassName : '',
          )}
          onClick={() => toggleMenu('opacity')}
          title="Transparencia"
          type="button"
        >
          {Math.round(override.opacity ?? 100)}%
        </button>
        {activeMenu === 'opacity' ? (
          <div className={rightPopoverClassName}>
            <div>
              <p className={popoverLabelClassName}>Transparencia</p>
              <p className="mt-1 text-xs text-gray-500">Controla la opacidad del elemento.</p>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">
                Opacidad: {Math.round(override.opacity ?? 100)}%
              </span>
              <input
                className="accent-blue-500"
                max={100}
                min={0}
                onChange={(event) =>
                  updateVisualEditOverride({ opacity: Number(event.target.value) }, true)
                }
                type="range"
                value={override.opacity ?? 100}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          aria-label="Animar"
          className={twMerge(
            toolButtonClassName,
            activeMenu === 'animate' || (override.animation && override.animation !== 'none')
              ? activeToolButtonClassName
              : '',
          )}
          onClick={() => toggleMenu('animate')}
          title="Animar"
          type="button"
        >
          <Sparkles size={17} strokeWidth={2.2} />
        </button>
        {activeMenu === 'animate' ? (
          <div className={rightPopoverClassName}>
            <div>
              <p className={popoverLabelClassName}>Animar</p>
              <p className="mt-1 text-xs text-gray-500">Elige una entrada sutil.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {animations.map((animation) => (
                <button
                  className={twMerge(
                    'rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white',
                    override.animation === animation.value ? 'border-blue-500 bg-blue-500/20 text-blue-200' : '',
                  )}
                  key={animation.value}
                  onClick={() =>
                    updateVisualEditOverride(
                      {
                        animation: animation.value,
                        animationLoop:
                          animation.group === 'Continuas' ? true : override.animationLoop,
                      },
                      true,
                    )
                  }
                  title={animation.group}
                  type="button"
                >
                  {animation.label}
                </button>
              ))}
              <button
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                onClick={() => updateVisualEditOverride({ animation: 'none' }, true)}
                type="button"
              >
                Ninguna
              </button>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">
                Tiempo del efecto (Ej: {override.animationDuration ?? 1}s en entrar)
              </span>
              <input
                className="accent-blue-500"
                max={10}
                min={0.5}
                onChange={(event) =>
                  updateVisualEditOverride(
                    { animationDuration: round(Number(event.target.value)) },
                    true,
                  )
                }
                step={0.1}
                type="range"
                value={override.animationDuration ?? 1}
              />
            </label>
            <button
              aria-pressed={override.animationLoop === true}
              className={twMerge(
                'flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white',
                override.animationLoop ? 'border-blue-500 bg-blue-500/20 text-blue-200' : '',
              )}
              onClick={() =>
                updateVisualEditOverride({ animationLoop: !override.animationLoop }, true)
              }
              type="button"
            >
              <span>Repetir</span>
              <span className="text-xs text-gray-500">{override.animationLoop ? 'On' : 'Off'}</span>
            </button>
            <button
              aria-pressed={override.triggerOnClick === true}
              className={twMerge(
                'flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white',
                override.triggerOnClick ? 'border-blue-500 bg-blue-500/20 text-blue-200' : '',
              )}
              onClick={() =>
                updateVisualEditOverride({ triggerOnClick: !override.triggerOnClick }, true)
              }
              type="button"
            >
              <span>Repetir al hacer clic</span>
              <span className="text-xs text-gray-500">
                {override.triggerOnClick ? 'On' : 'Off'}
              </span>
            </button>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">
                Tiempo de espera para repetir: {override.animationDelay ?? 0}s
              </span>
              <input
                className="accent-blue-500"
                max={10}
                min={0}
                onChange={(event) =>
                  updateVisualEditOverride(
                    { animationDelay: round(Number(event.target.value)) },
                    true,
                  )
                }
                step={0.1}
                type="range"
                value={override.animationDelay ?? 0}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          aria-label="Posicion"
          className={twMerge(
            toolButtonClassName,
            activeMenu === 'position' ? activeToolButtonClassName : '',
          )}
          onClick={() => toggleMenu('position')}
          title="Posicion"
          type="button"
        >
          <Move size={17} strokeWidth={2.2} />
        </button>
        {activeMenu === 'position' ? (
          <div className={twMerge(rightPopoverClassName, 'md:w-[min(18rem,calc(100vw-1.5rem))]')}>
            <div>
              <p className={popoverLabelClassName}>Posicion</p>
              <p className="mt-1 text-xs text-gray-500">Ajuste exacto de capa y geometria.</p>
            </div>
            <div className="flex gap-2">
              <button
                className={twMerge(toolButtonClassName, 'w-full gap-2 rounded-lg border-gray-700 bg-gray-900')}
                onClick={() =>
                  updateVisualEditOverride({ zIndex: (override.zIndex ?? 0) + 1 }, true)
                }
                title="Adelante"
                type="button"
              >
                <ArrowUp size={16} />
                Adelante
              </button>
              <button
                className={twMerge(toolButtonClassName, 'w-full gap-2 rounded-lg border-gray-700 bg-gray-900')}
                onClick={() =>
                  updateVisualEditOverride({ zIndex: (override.zIndex ?? 0) - 1 }, true)
                }
                title="Atras"
                type="button"
              >
                <ArrowDown size={16} />
                Atras
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['X', 'x', override.x ?? 0],
                ['Y', 'y', override.y ?? 0],
                ['W', 'width', override.width ?? 0],
                ['H', 'height', override.height ?? 0],
                ['Rot', 'rotation', override.rotation ?? 0],
                ['Z', 'zIndex', override.zIndex ?? 0],
              ].map(([label, key, value]) => (
                <label className="flex flex-col gap-1" key={key}>
                  <span className="text-xs text-gray-400">{label}</span>
                  <input
                    className={darkInputClassName}
                    onChange={(event) =>
                      updateVisualEditOverride({ [key]: Number(event.target.value) }, true)
                    }
                    type="number"
                    value={Number(value)}
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Layers size={14} />
              Los cambios se guardan en visualOverrides.
            </div>
          </div>
        ) : null}
      </div>

      <Divider />

      <button
        aria-label="Resetear"
        className={toolButtonClassName}
        onClick={() => resetVisualEditOverride()}
        title="Resetear"
        type="button"
      >
        <RotateCcw size={16} strokeWidth={2.3} />
      </button>
        </>
      ) : null}
    </div>
  )
}
