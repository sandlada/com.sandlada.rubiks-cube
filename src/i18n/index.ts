import { createI18n } from 'vue-i18n'
import { en, zhCN, zhTW } from './locales'

export const SUPPORTED_LOCALES = ['en', 'zh-TW', 'zh-CN'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-TW': zhTW,
    'zh-CN': zhCN,
  },
})

export default i18n
