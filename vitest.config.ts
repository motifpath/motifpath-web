import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

import { HISTORY_STORIES, OTHER_STORIES } from './.storybook/historyStories'
import viteConfig from './vite.config'

/**
 * In the story tests that share a page, overlays leave the browser history alone (see the mock):
 * a closing layer's Back would step back another story file's frame.
 */
const overlayHistoryInPage = {
  name: 'overlay-history-in-page',
  enforce: 'pre' as const,
  resolveId(id: string) {
    // By then the `@` alias has made the import an absolute path.
    return /\/src\/shared\/composables\/useOverlayHistory(\.ts)?$/.test(id)
      ? fileURLToPath(new URL('./.storybook/mocks/overlayHistoryInPage.ts', import.meta.url))
      : null
  },
}

/** Stories render in headless Chromium, each project in a browser instance named after it. */
const storyBrowser = (name: string) => ({
  enabled: true,
  headless: true,
  provider: 'playwright',
  instances: [{ browser: 'chromium' as const, name: `${name} (chromium)` }],
})

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
          plugins: [overlayHistoryInPage, storybookTest({ configDir: fileURLToPath(new URL('./.storybook', import.meta.url)) })],
          test: {
            name: 'storybook',
            exclude: [...configDefaults.exclude, HISTORY_STORIES],
            browser: storyBrowser('storybook'),
          },
        },
        {
          // Stories that drive the real browser history, in a page of their
          // own: story files sharing a page share its history, so one file's
          // Back could step back another's. `test:storybook` runs this project
          // on its own, one file at a time.
          extends: true,
          plugins: [storybookTest({ configDir: fileURLToPath(new URL('./.storybook', import.meta.url)) })],
          test: {
            name: 'storybook-history',
            exclude: [...configDefaults.exclude, ...OTHER_STORIES],
            browser: storyBrowser('storybook-history'),
          },
        },
      ],
    },
  }),
)
