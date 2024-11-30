import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('scale-'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    include: [
      "@/assets/swagger-ui/swagger-ui-es-bundle.js",
      "@/assets/swagger-ui/swagger-ui-standalone-preset.js"
    ]
  },
  build: {
    commonjsOptions: {
      include: [
        /assets\/swagger-ui\/swagger-ui-es-bundle.js$/,
        /assets\/swagger-ui\/swagger-ui-standalone-preset.js$/,
        /node_modules\/.*/,
      ],
    },
  }
})
