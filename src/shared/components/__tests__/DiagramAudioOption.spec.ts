import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const sound = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }))

vi.mock('@/shared/composables/useDiagramSound', () => ({
  useDiagramSound: () => sound.current,
}))

import DiagramAudioOption from '@/shared/components/DiagramAudioOption.vue'
import { makeDiagramRef } from '@/shared/testUtils/diagram'

const SOUND = makeDiagramRef({ diagram_id: 'a-minor', playback: { playback_id: 'strum', direction: 'as_authored', loop: false } })

function fakeSound() {
  return {
    state: ref<'idle' | 'loading' | 'playing' | 'error'>('idle'),
    missing: ref<'failed_to_load' | 'unavailable' | null>(null),
    toggle: vi.fn(),
  }
}

let fake: ReturnType<typeof fakeSound>

beforeEach(() => {
  fake = fakeSound()
  sound.current = fake
})

const mountOption = (props: Record<string, unknown> = {}) => mount(DiagramAudioOption, { props: { label: 'Sound 3', sound: SOUND, ...props } })

describe('DiagramAudioOption', () => {
  it('shows only its neutral label, never the diagram', () => {
    expect(mountOption().text()).toBe('Sound 3')
  })

  it('plays its diagram from the play button, without choosing it', async () => {
    const wrapper = mountOption()
    await wrapper.get('[data-test="option-play"]').trigger('click')

    expect(fake.toggle).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('is chosen by tapping the row', async () => {
    const wrapper = mountOption()
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('shows Stop while it sounds, and says when it starts and stops', async () => {
    const wrapper = mountOption()
    fake.state.value = 'playing'
    await flushPromises()
    expect(wrapper.get('[data-test="option-play"]').attributes('aria-label')).toBe('Stop Sound 3')

    fake.state.value = 'idle'
    await flushPromises()
    expect(wrapper.emitted('playing')).toEqual([[true], [false]])
  })

  it('says when its sound can’t be heard', async () => {
    const wrapper = mountOption()
    fake.missing.value = 'failed_to_load'
    await flushPromises()
    expect(wrapper.emitted('missing')).toEqual([['failed_to_load']])
  })
})
