import type { Router } from 'vue-router'
import { watch } from 'vue'
import { i18n } from '@i18n/index'

function currentLang(): string {
  const loc = i18n.global.locale
  if (typeof loc === 'string') {
    return loc
  }
  return loc.value
}

function localeTag(): string {
  const lang = currentLang()
  if (lang === 'zh-TW') {
    return 'zh_TW'
  }
  if (lang === 'zh-CN') {
    return 'zh_CN'
  }
  return 'en_US'
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

export function upsertLinkRel(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (el === null) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** HOF: bind SEO side-effects to a router instance. */
export function setupSeoGuard(router: Router): void {
  function applySeo(): void {
    const to = router.currentRoute.value
    const t = i18n.global.t
    const titleKey = to.meta['titleKey']
    const descKey = to.meta['descKey']
    const title = typeof titleKey === 'string' ? (t(titleKey) as string) : ''
    const desc = typeof descKey === 'string' ? (t(descKey) as string) : ''
    if (title !== '') {
      document.title = title
      upsertMetaProperty('og:title', title)
      upsertMetaName('twitter:title', title)
    }
    if (desc !== '') {
      upsertMetaName('description', desc)
      upsertMetaProperty('og:description', desc)
      upsertMetaName('twitter:description', desc)
    }
    const url = new URL(to.fullPath, window.location.origin).href
    upsertMetaProperty('og:url', url)
    upsertLinkRel('canonical', url)
    upsertMetaProperty('og:locale', localeTag())
    document.documentElement.lang = currentLang()
  }
  router.afterEach(() => {
    applySeo()
  })
  const loc = i18n.global.locale
  if (typeof loc !== 'string') {
    watch(loc, () => {
      applySeo()
    })
  }
}
