import type { Router } from 'vue-router'
import { i18n } from '@i18n/index'

function currentLang(): string {
  const loc = i18n.global.locale
  if (typeof loc === 'string') {
    return loc
  }
  return loc.value
}

export function upsertMetaName(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (el === null) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function upsertMetaProperty(property: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (el === null) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** HOF: bind SEO side-effects to a router instance. */
export function setupSeoGuard(router: Router): void {
  router.afterEach((to) => {
    const t = i18n.global.t
    const titleKey = to.meta['titleKey']
    const descKey = to.meta['descKey']
    const title = typeof titleKey === 'string' ? (t(titleKey) as string) : ''
    const desc = typeof descKey === 'string' ? (t(descKey) as string) : ''
    if (title !== '') {
      document.title = title
      upsertMetaProperty('og:title', title)
    }
    if (desc !== '') {
      upsertMetaName('description', desc)
      upsertMetaProperty('og:description', desc)
    }
    document.documentElement.lang = currentLang()
  })
}
