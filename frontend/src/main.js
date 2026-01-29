import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 导入路由
import router from './router/index'

// 导入Pinia
import pinia from './stores/index'

// 导入Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 导入Element Plus图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 导入语言文件
import enLocale from './locales/en.json'
import zhLocale from './locales/zh.json'

// 使用CAD查看器内置的i18n并合并应用自有文案
import { i18n } from '@mlightcad/cad-viewer'
i18n.global.mergeLocaleMessage('en', enLocale)
i18n.global.mergeLocaleMessage('zh', zhLocale)
// 设置默认语言为中文
if (i18n.global.locale && 'value' in i18n.global.locale) {
  i18n.global.locale.value = 'zh'
}

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件
app.use(i18n)
app.use(router)
app.use(pinia)
app.use(ElementPlus)

app.mount('#app')
