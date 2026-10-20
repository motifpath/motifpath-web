import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC_ROOT = join(__dirname, '..', '..', '..')

/** Any JSON value a locale file may contain, recursively. */
type LocaleValue = string | number | boolean | null | LocaleTree
interface LocaleTree {
  [key: string]: LocaleValue
}

/** Finds every directory named `locales` under `src/`. */
function findLocaleDirs(dir: string): string[] {
  const found: string[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (!statSync(fullPath).isDirectory()) continue

    if (entry === 'locales') {
      found.push(fullPath)
      continue
    }

    if (entry === 'node_modules' || entry.startsWith('__')) continue

    found.push(...findLocaleDirs(fullPath))
  }

  return found
}

/** Flattens a nested locale object into dot-separated leaf key paths. */
function flattenKeys(tree: LocaleTree, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object') {
      keys.push(...flattenKeys(value, path))
    } else {
      keys.push(path)
    }
  }

  return keys
}

function readLocaleKeys(path: string): string[] {
  const raw = readFileSync(path, 'utf-8')
  return flattenKeys(JSON.parse(raw) as LocaleTree).sort()
}

describe('locale key parity', () => {
  const localeDirs = findLocaleDirs(SRC_ROOT)

  it('found at least one locales directory to check', () => {
    expect(localeDirs.length).toBeGreaterThan(0)
  })

  it.each(localeDirs)('en.json and pt-BR.json declare the same keys in %s', (dir) => {
    const enKeys = new Set(readLocaleKeys(join(dir, 'en.json')))
    const ptBrKeys = new Set(readLocaleKeys(join(dir, 'pt-BR.json')))

    const missingFromPtBr = [...enKeys].filter((key) => !ptBrKeys.has(key))
    const extraInPtBr = [...ptBrKeys].filter((key) => !enKeys.has(key))

    expect(
      missingFromPtBr,
      `pt-BR.json in ${dir} is missing keys present in en.json: ${missingFromPtBr.join(', ')}`,
    ).toEqual([])
    expect(
      extraInPtBr,
      `pt-BR.json in ${dir} has extra keys not present in en.json: ${extraInPtBr.join(', ')}`,
    ).toEqual([])
  })
})
