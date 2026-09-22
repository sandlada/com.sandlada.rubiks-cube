import en from './en.json'
import zhCN from './zh-CN.json'
import zhTW from './zh-TW.json'

export const locales = {
  en,
  'zh-TW': zhTW,
  'zh-CN': zhCN,
} as const

export { en, zhCN, zhTW }
export default locales
