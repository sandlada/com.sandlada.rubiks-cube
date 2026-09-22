import type { RouteRecordRaw } from 'vue-router'
import ArchivePage from '@pages/ArchivePage.vue'
import GamePage from '@pages/GamePage.vue'
import MenuPage from '@pages/MenuPage.vue'

export const routes: RouteRecordRaw[] = [
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
]
