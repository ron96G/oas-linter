import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import { defineCustomElements } from '@telekom/scale-components/loader';
import '@telekom/scale-components/dist/scale-components/scale-components.css';

import * as log from '@/libs/log'

(window as any).setLogLevel = log.setLogLevel;

defineCustomElements();

const app = createApp(App)
app.mount('#app')
