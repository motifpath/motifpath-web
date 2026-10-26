import { effectScope } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const audio = vi.hoisted(() => ({
  now: 0,
  played: [] as { voiceId: string; midi: number; time: number; duration: number; cancelled: boolean }[],
}))
vi.mock('@/shared/audio/audioContext', () => ({
  unlockAudioContext: () => ({
    get currentTime() {
      return audio.now
    },
  }),
  audibleTime: () => audio.now,
}))
vi.mock('@/shared/audio/voiceSampler', () => ({
  loadVoiceSampler: async (_context: unknown, voice: { voice_id: string }) => ({
    play(note: { midi: number; time: number; duration: number }) {
      const entry = { voiceId: voice.voice_id, ...note, cancelled: false }
      audio.played.push(entry)
      return () => {
        entry.cancelled = true
      }
    },
    stopAll: () => {},
  }),
}))
const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useChordSound } from '@/shared/composables/useChordSound'
import { clearVoiceCache } from '@/shared/composables/useListVoices'

const VOICES = ['acoustic-guitar', 'electric-bass'].map((voice_id) => ({
  voice_id,
  names: { en: voice_id },
  languages: ['en'],
  family: 'fretted',
  samples: [],
  attribution: '',
}))

const sounding = (voiceId: string) => audio.played.filter((note) => !note.cancelled && note.voiceId === voiceId)

function setup() {
  const scope = effectScope()
  const sound = scope.run(() => useChordSound())!
  return { scope, sound }
}

beforeEach(() => {
  audio.now = 100
  audio.played = []
  clearVoiceCache()
  GET.mockReset()
  GET.mockResolvedValue({ data: VOICES, error: undefined, response: { status: 200 } })
})

describe('useChordSound', () => {
  it("strums a voicing's notes, low to high, in its instrument's voice", async () => {
    const { sound } = setup()

    sound.strum(drillVoicings.C.diagram, drillGuitar)

    await vi.waitFor(() => expect(sounding('acoustic-guitar')).toHaveLength(5))
    const notes = sounding('acoustic-guitar')
    expect(notes.map((n) => n.midi)).toEqual([...notes.map((n) => n.midi)].sort((a, b) => a - b))
    expect(notes[1]!.time).toBeGreaterThan(notes[0]!.time)
  })

  it('plays a root once, at the bottom of the bass', async () => {
    const { sound } = setup()

    sound.playRoot('C', drillBass)

    // C above the open E1: C2.
    await vi.waitFor(() => expect(sounding('electric-bass').map((n) => n.midi)).toEqual([36]))
  })

  it('stops what was sounding when another chord is tapped, and when its screen goes', async () => {
    const { scope, sound } = setup()
    sound.strum(drillVoicings.C.diagram, drillGuitar)
    await vi.waitFor(() => expect(sounding('acoustic-guitar')).toHaveLength(5))

    sound.strum(drillVoicings.G.diagram, drillGuitar)
    await vi.waitFor(() => expect(sounding('acoustic-guitar')).toHaveLength(6))
    scope.stop()

    expect(sounding('acoustic-guitar')).toHaveLength(0)
  })

  it('stays silent when the voice is missing', async () => {
    GET.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } })
    const { sound } = setup()

    sound.playRoot('C', drillBass)
    await vi.waitFor(() => expect(GET).toHaveBeenCalled())

    expect(audio.played).toEqual([])
  })
})
