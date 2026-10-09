import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

const srcDir = resolve(process.cwd(), 'src')
const componentsDir = join(srcDir, 'shared/components')
const featuresDir = join(srcDir, 'features')

function files(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return files(path, keep)
    return keep(entry.name) ? [path] : []
  })
}

const vueFiles = (dir: string) => files(dir, (name) => name.endsWith('.vue'))

/** The feature a file belongs to (`student`), or its top-level folder under `src` (`shared`, `router`). */
function areaOf(path: string): string {
  const [top, feature] = relative(srcDir, path).split(sep)
  return top === 'features' ? `features/${feature}` : top
}

/**
 * Every `.vue` file under `src/features` mapped to the areas that import it,
 * from the import specifiers in app code (tests and stories don't count).
 */
function featureComponentImporters(): Map<string, Set<string>> {
  const importers = new Map<string, Set<string>>()
  const appFiles = files(
    srcDir,
    (name) => (name.endsWith('.vue') || name.endsWith('.ts')) && !name.endsWith('.stories.ts') && !name.endsWith('.spec.ts'),
  )
  for (const importer of appFiles) {
    const source = readFileSync(importer, 'utf8')
    for (const [, specifier] of source.matchAll(/from\s+'([^']+\.vue)'/g)) {
      const target = specifier.startsWith('@/')
        ? join(srcDir, specifier.slice(2))
        : resolve(dirname(importer), specifier)
      if (!target.startsWith(featuresDir + sep)) continue
      const areas = importers.get(target) ?? new Set<string>()
      areas.add(areaOf(importer))
      importers.set(target, areas)
    }
  }
  return importers
}

function storyBeside(component: string): string {
  return component.replace(/\.vue$/, '.stories.ts')
}

/**
 * Storybook is the executable catalog of every component more than one place
 * relies on, so each ships with a story beside it. A new one without a story
 * fails here instead of silently missing the catalog.
 */
describe('Storybook catalog', () => {
  const components = vueFiles(componentsDir)

  it('found the shared components', () => {
    expect(components.length).toBeGreaterThan(0)
  })

  it.each(components.map((path) => relative(componentsDir, path)))('%s has a story beside it', (file) => {
    const story = storyBeside(join(componentsDir, file))
    expect(existsSync(story), `missing ${relative(process.cwd(), story)}`).toBe(true)
  })

  // A feature component another feature imports is shared in all but location.
  const sharedFeatureComponents = [...featureComponentImporters()]
    .filter(([, areas]) => areas.size > 1)
    .map(([path]) => relative(featuresDir, path))
    .sort()

  it.each(sharedFeatureComponents)('feature component %s, imported by more than one feature, has a story beside it', (file) => {
    const story = storyBeside(join(featuresDir, file))
    expect(existsSync(story), `missing ${relative(process.cwd(), story)}`).toBe(true)
  })
})
