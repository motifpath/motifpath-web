import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSongTempo } from '@/shared/composables/useSongTempo'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useSongTempo', () => {
  it("starts at the song's tempo, which is the target", () => {
    const { tempo, target } = useSongTempo('chart-amazing-grace', 72)

    expect(tempo.value).toBe(72)
    expect(target).toBe(72)
  })

  it('starts at 80 BPM with no target for a song without a tempo', () => {
    const { tempo, target } = useSongTempo('chart-amazing-grace', null)

    expect(tempo.value).toBe(80)
    expect(target).toBeNull()
  })

  it('remembers the tempo chosen for a song on this device', () => {
    useSongTempo('chart-amazing-grace', 72).setTempo(56)

    expect(useSongTempo('chart-amazing-grace', 72).tempo.value).toBe(56)
  })

  it("doesn't change another song's tempo", () => {
    useSongTempo('chart-amazing-grace', 72).setTempo(56)

    expect(useSongTempo('chart-oh-susanna', 96).tempo.value).toBe(96)
  })

  it('still works when the device keeps nothing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    const { tempo, setTempo } = useSongTempo('chart-amazing-grace', 72)
    setTempo(56)

    expect(tempo.value).toBe(56)
  })
})
