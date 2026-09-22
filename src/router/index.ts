import { createRouter, createWebHistory } from 'vue-router'
import { i18n } from '../i18n'
import ArchivePage from '../pages/ArchivePage.vue'
import GamePage from '../pages/GamePage.vue'
import MenuPage from '../pages/MenuPage.vue'

function currentLang(): string {
  const loc = i18n.global.locale
  if (typeof loc === 'string') {
    return loc
  }
  return loc.value
}

function upsertMetaName(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (el === null) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertMetaProperty(property: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (el === null) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'menu',
      component: MenuPage,
      meta: { titleKey: 'menu.title', descKey: 'menu.description' },
    },
    {
      path: '/game',
      name: 'game',
      component: GamePage,
      meta: { titleKey: 'game.title', descKey: 'game.description' },
    },
    {
      path: '/archive',
      name: 'archive',
      component: ArchivePage,
      meta: { titleKey: 'archive.title', descKey: 'archive.description' },
    },
  ],
})

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

export default router
