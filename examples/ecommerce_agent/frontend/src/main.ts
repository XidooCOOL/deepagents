import { createApp } from 'vue'
import './style.css'
import 'virtual:uno.css'
import App from './App.vue'
import router from './router'
import naive from 'naive-ui'

const app = createApp(App)

app.use(router)
app.use(naive)

app.mount('#app')
