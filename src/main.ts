import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { i18n } from '@i18n/index'
import { router } from '@router/index'
import { useThemeStore } from '@stores/theme'
import App from './App.vue'
import './style.css'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)

useThemeStore().initTheme()

app.mount('#app')
