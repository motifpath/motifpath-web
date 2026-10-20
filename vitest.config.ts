import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: fileURLToPath(new URL('./', import.meta.url)),
      // Node 25+ ships a global Web Storage `localStorage` that is undefined
      // without --localstorage-file and shadows jsdom's; turn it off so the
      // unit tests get jsdom's implementation.
      poolOptions: {
        forks: { execArgv: ['--no-experimental-webstorage'] },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/__tests__/**', 'src/api/generated/**', 'src/main.ts'],
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./src/shared/testUtils/setupI18n.ts'],
            exclude: [...configDefaults.exclude, 'e2e/**'],
          },
        },
        {
          // Every story renders in a real browser as a test: a story that
          // throws, fails its play function or breaks an accessibility rule
          // fails here.
          extends: true,
          plugins: [storybookTest({ configDir: fileURLToPath(new URL('./.storybook', import.meta.url)) })],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: 'playwright',
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
