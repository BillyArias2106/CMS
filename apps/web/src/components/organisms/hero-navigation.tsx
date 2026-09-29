import { LanguageSwitcher } from '@/components/molecules/language-switcher'
import { NavLinkList } from '@/components/molecules/nav-link-list'
import type { CompanySettingsContent, NavigationItem } from '@/lib/cms'
import { getUIText, type Locale } from '@/lib/i18n'

type HeroNavigationProps = {
  companySettings: CompanySettingsContent
  locale: Locale
  navigationItems: NavigationItem[]
}

export function HeroNavigation({
  companySettings,
  locale,
  navigationItems
}: HeroNavigationProps) {
  const logo = companySettings.logoPrimary ?? companySettings.logoSecondary
  const text = getUIText(locale)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-cyan-200/15 bg-deep-950/78 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <a href="/" className="flex min-w-0 items-center gap-3 text-silver-50">
          <span className="relative grid h-11 w-11 place-items-center border border-cyan-200/60 bg-cyan-200/10 text-cyan-200 shadow-cyan">
            {logo?.url ? (
              <img
                src={logo.url}
                alt={logo.alt ?? companySettings.commercialName}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <>
                <span className="absolute inset-1 rounded-full border border-cyan-200/40" />
                <span className="font-heading text-2xl font-bold leading-none">
                  Z
                </span>
              </>
            )}
          </span>
          <span className="min-w-0 max-w-[9rem] truncate font-heading text-base font-bold uppercase tracking-[0] sm:max-w-[14rem] sm:text-lg">
            {companySettings.commercialName}
          </span>
          <span className="hidden h-8 w-px bg-cyan-200/35 sm:block" />
          <span className="hidden min-w-0 max-w-[22rem] truncate font-heading text-sm font-semibold uppercase text-silver-200 lg:block">
            {companySettings.shortDescription}
          </span>
        </a>
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <NavLinkList items={navigationItems} labels={text.navigation} />
          <LanguageSwitcher labels={text.language} locale={locale} />
        </div>
      </div>
    </header>
  )
}
