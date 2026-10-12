import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const sound = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }))
vi.mock('@/shared/composables/useDiagramSound', () => ({ useDiagramSound: () => sound.current }))

import SoundSource from '@/features/teacher/components/SoundSource.vue'
import type { SoundValue } from '@/features/teacher/components/SoundSource.vue'
import { makeFrettedDiagram, makePlayback } from '@/shared/testUtils/diagram'

// One whole note at 72 BPM in 4/4: 3.33 s.
const strum = makePlayback({ playback_id: 'strum', names: { en: 'Strum down' }, tempo_bpm: 72, steps: [{ position_ids: ['p0'], value: { num: 1, den: 1 }, strum: 'down' }] })
const aMinor = makeFrettedDiagram({ diagram_id: 'a-minor', names: { en: 'A minor triad' }, playbacks: [strum], default_playback_id: 'strum' })

const fromDiagram: SoundValue = {
  kind: 'diagram',
  ref: { diagram_id: 'a-minor', layers: { intervals: true }, playback: { playback_id: 'strum', direction: 'as_authored', loop: false } },
}
const fromFile: SoundValue = { kind: 'file', url: 'https://cdn.example.com/fifth.mp3' }

let toggle = vi.fn()

beforeEach(() => {
  document.body.innerHTML = ''
  toggle = vi.fn()
  sound.current = {
    state: ref('idle'),
    diagram: ref(aMinor),
    played: computed(() => strum),
    soundTempo: computed(() => 72),
    toggle,
  }
})

function mountSource(value: SoundValue | null) {
  return mount(SoundSource, { props: { sound: value, title: 'Sound' }, attachTo: document.body })
}

const menuItems = () => [...document.querySelectorAll('[data-test="sound-source-menu-item"]')].map((item) => item.textContent?.trim())
const menuItem = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-test="sound-source-menu-item"]')].find((item) => item.textContent?.trim() === label)!

describe('SoundSource', () => {
  describe('with no sound yet', () => {
    it('offers Upload audio and From a diagram', async () => {
      const wrapper = mountSource(null)
      expect(wrapper.get('[data-test="sound-source-title"]').text()).toBe('Choose the sound')

      await wrapper.get('[data-test="sound-source-choose"]').trigger('click')

      expect(menuItems()).toEqual(['Upload audio', 'From a diagram'])
      wrapper.unmount()
    })

    it('hands back an uploaded file', async () => {
      const wrapper = mountSource(null)
      await wrapper.get('[data-test="sound-source-choose"]').trigger('click')
      const input = document.querySelector<HTMLInputElement>('[data-test="sound-source-file-input"]')!
      const file = new File(['x'], 'fifth.mp3', { type: 'audio/mpeg' })
      Object.defineProperty(input, 'files', { value: [file] })
      input.dispatchEvent(new Event('change'))

      expect(wrapper.emitted('file')).toEqual([[file]])
      wrapper.unmount()
    })

    it('asks for a diagram from From a diagram', async () => {
      const wrapper = mountSource(null)
      await wrapper.get('[data-test="sound-source-choose"]').trigger('click')
      menuItem('From a diagram').click()

      expect(wrapper.emitted('diagram')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  describe('played from a diagram', () => {
    it('says where the sound comes from, how fast and how long it is', async () => {
      const wrapper = mountSource(fromDiagram)
      await flushPromises()

      expect(wrapper.get('[data-test="sound-source-title"]').text()).toBe('A minor triad — Strum down')
      expect(wrapper.get('[data-test="sound-source-meta"]').text()).toBe('From a diagram · 72 BPM · 0:03')
      expect(wrapper.get('[data-test="sound-source-hidden"]').text()).toBe('Hidden from students until they answer.')
      wrapper.unmount()
    })

    it('plays it from ▶', async () => {
      const wrapper = mountSource(fromDiagram)
      await wrapper.get('[data-test="sound-source-play"]').trigger('click')
      expect(toggle).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('offers Change sound, Edit settings and Remove from ⋮', async () => {
      const wrapper = mountSource(fromDiagram)
      await wrapper.get('[data-test="sound-source-menu"]').trigger('click')
      expect(menuItems()).toEqual(['Change sound', 'Edit settings', 'Remove'])

      menuItem('Edit settings').click()
      expect(wrapper.emitted('edit')).toHaveLength(1)
      wrapper.unmount()
    })

    it('changes the sound from the same choice as a new one', async () => {
      const wrapper = mountSource(fromDiagram)
      await wrapper.get('[data-test="sound-source-menu"]').trigger('click')
      menuItem('Change sound').click()
      await flushPromises()

      expect(menuItems()).toEqual(['Upload audio', 'From a diagram'])
      wrapper.unmount()
    })

    it('removes it from ⋮', async () => {
      const wrapper = mountSource(fromDiagram)
      await wrapper.get('[data-test="sound-source-menu"]').trigger('click')
      menuItem('Remove').click()
      expect(wrapper.emitted('remove')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  describe('an uploaded file', () => {
    it('says it is an uploaded file, with no settings to edit', async () => {
      const wrapper = mountSource(fromFile)
      expect(wrapper.get('[data-test="sound-source-title"]').text()).toBe('Uploaded audio')
      expect(wrapper.find('[data-test="sound-source-hidden"]').exists()).toBe(false)

      await wrapper.get('[data-test="sound-source-menu"]').trigger('click')
      expect(menuItems()).toEqual(['Change sound', 'Remove'])
      wrapper.unmount()
    })
  })
})
