/**
 * Answers the voice list locally, so the spike plays diagrams without the
 * backend: the same public sample set the platform's voices are built from.
 * Must be imported before anything that creates the API clients, since they
 * capture `fetch` when created.
 */
const SAMPLE_BASE = 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic'
const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

function sampleUrl(midi: number): string {
  return `${SAMPLE_BASE}/${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}.mp3`
}

const voices = [
  {
    voice_id: 'acoustic-guitar',
    names: { en: 'Acoustic guitar' },
    languages: ['en'],
    family: 'fretted',
    // Fully chromatic E2–D5 exists; every third semitone is enough, as the platform does.
    samples: Array.from({ length: 12 }, (_, i) => 40 + i * 3).map((pitch) => ({ pitch, url: sampleUrl(pitch) })),
    attribution: 'Acoustic guitar samples from tonejs-instruments by Nicholaus Brosowsky, CC BY 3.0',
  },
]

const realFetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input)
  if (new URL(url, window.location.href).pathname.endsWith('/voices')) {
    return Promise.resolve(new Response(JSON.stringify(voices), { headers: { 'Content-Type': 'application/json' } }))
  }
  return realFetch(input, init)
}
