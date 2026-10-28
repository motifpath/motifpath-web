import { describe, expect, it } from 'vitest'

import { playThroughSilentSwitch } from '@/shared/platform/audioSession'

describe('playThroughSilentSwitch', () => {
  it('asks the engine to treat the page’s sound as playback, which the silent switch does not mute', () => {
    const browser = { audioSession: { type: 'auto' } }

    playThroughSilentSwitch(browser)

    expect(browser.audioSession.type).toBe('playback')
  })

  it('leaves an engine without audio session control as it is', () => {
    const browser = {}

    expect(() => playThroughSilentSwitch(browser)).not.toThrow()
    expect(browser).toEqual({})
  })
})
