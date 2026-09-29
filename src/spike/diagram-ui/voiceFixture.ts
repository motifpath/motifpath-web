import type { components } from '@/api/generated/core-domain'
import { coreApi } from '@/api'

/** Only the auth-free study entry installs this catalogue. Audio still uses the real sample adapter. */
export function installStudyVoiceFixture() {
  const voice: components['schemas']['Voice'] = {
    voice_id: 'acoustic-guitar', names: { en: 'Acoustic guitar', pt_BR: 'Violão' },
    languages: ['en', 'pt_BR'], family: 'fretted',
    attribution: 'Acoustic guitar samples from tonejs-instruments by Nicholaus Brosowsky, CC BY 3.0',
    samples: Array.from({ length: 17 }, (_, i) => ({ pitch: 40 + i * 3, url: `http://localhost:9000/motifpath-content-media/audio/voices/acoustic-guitar/${40 + i * 3}.mp3` })),
  }
  coreApi.use({ onRequest({ schemaPath }) {
    if (schemaPath === '/voices') return Response.json([voice])
  } })
}
