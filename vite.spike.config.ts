/**
 * Dev server for the commit-point phone prototypes: the app's own config, reachable from a phone
 * on the same network, plus the clips the listening items play and an endpoint that keeps each
 * run's results on this machine. `npx vite --config vite.spike.config.ts`, then open
 * /commit-point-spike.html on the phone.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, mergeConfig } from 'vite'
import type { Plugin } from 'vite'

import { clipTones } from './src/spikes/commit-point/clips'
import { encodeTonesWav } from './src/spikes/commit-point/wav'
import baseConfig from './vite.config'

const resultsDir = fileURLToPath(new URL('./src/spikes/commit-point/results', import.meta.url))

function commitPointSpike(): Plugin {
  return {
    name: 'commit-point-spike',
    configureServer(server) {
      server.middlewares.use('/__spike/audio', (request, response, next) => {
        const key = /^\/([\w-]+)\.wav/.exec(request.url ?? '')?.[1]
        const tones = key ? clipTones(key) : null
        if (!tones) return next()
        const body = encodeTonesWav(tones)
        response.setHeader('Content-Type', 'audio/wav')
        response.setHeader('Accept-Ranges', 'bytes')
        // Safari only plays media from a server that answers byte ranges.
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '')
        if (range) {
          const start = range[1] ? Number(range[1]) : 0
          const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1)
          response.statusCode = 206
          response.setHeader('Content-Range', `bytes ${start}-${end}/${body.length}`)
          response.setHeader('Content-Length', end - start + 1)
          response.end(Buffer.from(body.slice(start, end + 1)))
          return
        }
        response.setHeader('Content-Length', body.length)
        response.end(Buffer.from(body))
      })
      server.middlewares.use('/__spike/results', (request, response, next) => {
        if (request.method !== 'POST') return next()
        let body = ''
        request.on('data', (chunk) => (body += chunk))
        request.on('end', () => {
          mkdirSync(resultsDir, { recursive: true })
          writeFileSync(`${resultsDir}/run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, body)
          response.statusCode = 204
          response.end()
        })
      })
    },
  }
}

export default mergeConfig(baseConfig, defineConfig({ plugins: [commitPointSpike()], server: { host: true } }))
