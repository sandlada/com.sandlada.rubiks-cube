import en from './en.json'
import zhCN from './zh-CN.json'

export const locales = {
  'zh-CN': zhCN,
  en,
} as const

export { en, zhCN }
export default locales
