import { fileURLToPath, URL } from 'node:url'

import type { StorybookConfig } from '@storybook/vue3-vite'
import type { Alias } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y'],
  // The mock API's service worker; kept out of `public/` so the app never ships it.
  staticDirs: ['./public'],
  framework: { name: '@storybook/vue3-vite', options: {} },
  async viteFinal(viteConfig) {
    // Stories render without a Clerk session: swap the app's auth wrapper for a
    // signed-in stub. It goes first so it wins over the general `@` alias.
    const authStub: Alias = {
      find: '@/features/auth/composables/useAuth',
      replacement: fileURLToPath(new URL('./mocks/useAuth.ts', import.meta.url)),
    }
    const existing = viteConfig.resolve?.alias ?? []
    const aliases: Alias[] = Array.isArray(existing)
      ? existing
      : Object.entries(existing).map(([find, replacement]) => ({ find, replacement }))
    return {
      ...viteConfig,
      resolve: { ...viteConfig.resolve, alias: [authStub, ...aliases] },
    }
  },
}

export default config
