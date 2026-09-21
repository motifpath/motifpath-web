import { fileURLToPath, URL } from 'node:url'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      // The video player ships as web components (`<media-player>`, `<media-provider>`,
      // the control elements); Vue must treat them as native elements, not try to
      // resolve them as components.
      template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('media-') } },
    }),
    VueI18nPlugin({
      include: [fileURLToPath(new URL('./src/**/locales/*.json', import.meta.url))],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
