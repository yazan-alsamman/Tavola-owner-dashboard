import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { en, type TranslationKeys } from '@/i18n/en'
import { ar } from '@/i18n/ar'

type Locale = 'en' | 'ar'

interface LocaleContextType {
  locale: Locale
  t: TranslationKeys
  toggleLocale: () => void
  setLocale: (locale: Locale) => void
  isRTL: boolean
}

const translations: Record<Locale, TranslationKeys> = { en, ar }

const LocaleContext = createContext<LocaleContextType | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('tavola-platform-locale') as Locale | null
    return stored === 'en' ? 'en' : 'ar'
  })

  const isRTL = locale === 'ar'

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    localStorage.setItem('tavola-platform-locale', locale)
  }, [locale, isRTL])

  const toggleLocale = () => setLocaleState((l) => (l === 'en' ? 'ar' : 'en'))
  const setLocale = (l: Locale) => setLocaleState(l)

  return (
    <LocaleContext.Provider
      value={{ locale, t: translations[locale], toggleLocale, setLocale, isRTL }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
