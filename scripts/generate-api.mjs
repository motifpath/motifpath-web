// Regenerates the typed API client in src/api/generated/ from the OpenAPI specs
// in motifpath-specs. Run via `npm run generate:api` after a spec change.
//
// The specs repo is expected as a sibling checkout; override with SPECS_DIR.
// openapi-typescript resolves external $refs (e.g. events.yaml) on its own,
// so no separate bundle step is needed.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const specsDir = resolve(repoRoot, process.env.SPECS_DIR ?? '../motifpath-specs')
const outDir = resolve(repoRoot, 'src/api/generated')

const specs = [
  { spec: 'openapi/core-domain-service.yaml', out: 'core-domain.ts' },
  { spec: 'openapi/event-ingestion-service.yaml', out: 'event-ingestion.ts' },
]

if (!existsSync(specsDir)) {
  console.error(
    `motifpath-specs not found at ${specsDir}\n` +
      `Check out the specs repo as a sibling directory, or set SPECS_DIR.`,
  )
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

for (const { spec, out } of specs) {
  const specPath = resolve(specsDir, spec)
  const outPath = resolve(outDir, out)

  if (!existsSync(specPath)) {
    console.error(`Spec not found: ${specPath}`)
    process.exit(1)
  }

  console.log(`${spec} -> src/api/generated/${out}`)
  execFileSync(
    'npx',
    ['openapi-typescript', specPath, '--output', outPath, '--root-types'],
    { stdio: 'inherit', cwd: repoRoot },
  )
}
