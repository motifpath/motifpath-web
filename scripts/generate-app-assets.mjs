// Draws the store apps' icon and launch screen sources in assets/ from the brand mark in
// motifpath-brand, then lets @capacitor/assets cut every size iOS and Android need.
// Run via `npm run generate:app-assets` after the mark or the surface colours change.
//
// The brand repo is expected as a sibling checkout; override with BRAND_DIR.
//
// - icon-only.png: iOS's single icon, the mark on the light surface, no transparency.
// - icon-foreground.png / icon-background.png: Android's adaptive icon. @capacitor/assets insets the
//   foreground by a sixth on each side, so the mark is drawn at 80% of the canvas to end up about
//   58 of 108 dp: inside the central 66 dp that every launcher mask keeps.
// - icon-monochrome.png: the mark's silhouette, for Android 13's themed icons. @capacitor/assets
//   doesn't place it, so this script adds it to each density and to the adaptive icon itself.
// - splash.png / splash-dark.png: the mark alone on the surface colour of each appearance (Android
//   12 and later draw only the icon on their launch screen, so iOS matches it).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const brandDir = resolve(repoRoot, process.env.BRAND_DIR ?? '../motifpath-brand')
const markSvg = resolve(brandDir, 'logo/svg/motif-path-mark.svg')
const outDir = resolve(repoRoot, 'assets')

// The surface colours of the light and dark appearances (motifpath-brand tokens.json).
const SURFACE_LIGHT = '#FBFAFF'
const SURFACE_DARK = '#0B0D2E'

const ICON = 1024
const ADAPTIVE_MARK = Math.round(ICON * 0.8)
const SPLASH = 2732

if (!existsSync(markSvg)) {
  console.error(`Brand mark not found at ${markSvg}. Set BRAND_DIR to a motifpath-brand checkout.`)
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

function mark(size) {
  return sharp(markSvg, { density: 600 }).resize(size, size).png().toBuffer()
}

async function onCanvas(file, canvas, background, markSize) {
  const input = await mark(markSize)
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background } })
    .composite([{ input, gravity: 'center' }])
    .flatten(background === 'transparent' ? false : { background })
    .png()
    .toFile(resolve(outDir, file))
}

const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

await onCanvas('icon-only.png', ICON, SURFACE_LIGHT, Math.round(ICON * 0.66))
await sharp({ create: { width: ICON, height: ICON, channels: 4, background: transparent } })
  .composite([{ input: await mark(ADAPTIVE_MARK), gravity: 'center' }])
  .png()
  .toFile(resolve(outDir, 'icon-foreground.png'))
await sharp({ create: { width: ICON, height: ICON, channels: 3, background: SURFACE_LIGHT } })
  .png()
  .toFile(resolve(outDir, 'icon-background.png'))

// The silhouette: the mark's own alpha, filled white.
const silhouetteAlpha = await sharp(await mark(ADAPTIVE_MARK)).extractChannel('alpha').toBuffer()
const silhouette = await sharp({ create: { width: ADAPTIVE_MARK, height: ADAPTIVE_MARK, channels: 3, background: '#FFFFFF' } })
  .joinChannel(silhouetteAlpha, { raw: undefined })
  .png()
  .toBuffer()
await sharp({ create: { width: ICON, height: ICON, channels: 4, background: transparent } })
  .composite([{ input: silhouette, gravity: 'center' }])
  .png()
  .toFile(resolve(outDir, 'icon-monochrome.png'))

await onCanvas('splash.png', SPLASH, SURFACE_LIGHT, 480)
await onCanvas('splash-dark.png', SPLASH, SURFACE_DARK, 480)

execFileSync(
  'npx',
  [
    'capacitor-assets',
    'generate',
    '--ios',
    '--android',
    '--iconBackgroundColor',
    SURFACE_LIGHT,
    '--iconBackgroundColorDark',
    SURFACE_DARK,
    '--splashBackgroundColor',
    SURFACE_LIGHT,
    '--splashBackgroundColorDark',
    SURFACE_DARK,
  ],
  { cwd: repoRoot, stdio: 'inherit' },
)

// The themed icon's layer: the silhouette at each launcher density (108 dp), and in the adaptive
// icon beside the background and foreground, with the same inset.
const res = resolve(repoRoot, 'android/app/src/main/res')
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [density, scale] of Object.entries(DENSITIES)) {
  const size = Math.round(108 * scale)
  await sharp(resolve(outDir, 'icon-monochrome.png'))
    .resize(size, size)
    .png()
    .toFile(resolve(res, `mipmap-${density}`, 'ic_launcher_monochrome.png'))
}
const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="16.7%" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
    <monochrome>
        <inset android:drawable="@mipmap/ic_launcher_monochrome" android:inset="16.7%" />
    </monochrome>
</adaptive-icon>
`
for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  writeFileSync(resolve(res, 'mipmap-anydpi-v26', name), adaptiveIcon)
}
