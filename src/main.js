import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import LoginView from './views/LoginView.vue'
import DailyView from './views/DailyView.vue'
import ManageView from './views/ManageView.vue'
import TaskFormView from './views/TaskFormView.vue'
import TaskHistoryView from './views/TaskHistoryView.vue'
import { state } from './data/store.js'
import { restoreSession } from './data/session.js'
import { startTheme } from './lib/theme.js'
import SettingsView from './views/SettingsView.vue'
import './styles.css'

// Hash routing works on a GitHub Pages subpath without server config.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/', component: DailyView },
    { path: '/manage', component: ManageView },
    { path: '/manage/new', component: TaskFormView },
    { path: '/manage/:id', component: TaskFormView, props: true },
    { path: '/task/:id', component: TaskHistoryView, props: true },
    { path: '/settings', component: SettingsView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// Nothing but the login screen until data is loaded (signed in, or demo mode).
router.beforeEach((to) => {
  if (!state.ready && to.path !== '/login') return '/login'
  if (state.ready && to.path === '/login') return '/'
})

startTheme()

restoreSession()
  .catch((error) => {
    console.error(error)
    state.error = `Couldn't load your data: ${error.message}`
  })
  .finally(() => createApp(App).use(router).mount('#app'))
