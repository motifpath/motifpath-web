import { existsSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const componentsDir = resolve(process.cwd(), 'src/shared/components')

function vueFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

/**
 * Storybook is the executable catalog of the shared component library, so
 * every shared component ships with a story beside it. A new
 * component without one fails here instead of silently missing the catalog.
 */
describe('Storybook catalog', () => {
  const components = vueFiles(componentsDir)

  it('found the shared components', () => {
    expect(components.length).toBeGreaterThan(0)
  })

  it.each(components.map((path) => relative(componentsDir, path)))('%s has a story beside it', (file) => {
    const story = join(componentsDir, file.replace(/\.vue$/, '.stories.ts'))
    expect(existsSync(story), `missing ${relative(process.cwd(), story)}`).toBe(true)
  })
})
