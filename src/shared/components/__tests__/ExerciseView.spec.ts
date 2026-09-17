import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import type { components } from '@/api/generated/core-domain'

type Option = components['schemas']['Option']

const textOptions: Option[] = [
  { option_id: 'o1', label: 'Alternate picking', is_correct: true },
  { option_id: 'o2', label: 'Legato', is_correct: false },
]

const imageOptions: Option[] = [
  { option_id: 'i1', label: 'Open G chord', image_url: 'https://x/g.png', is_correct: true },
  { option_id: 'i2', label: 'Open C chord', image_url: 'https://x/c.png', is_correct: false },
]

const audioOptions: Option[] = [
  { option_id: 'a1', audio_url: 'https://x/lick1.mp3', label: 'Lick A', is_correct: true },
  { option_id: 'a2', audio_url: 'https://x/lick2.mp3', label: 'Lick B', is_correct: false },
]

const regionOptions: Option[] = [
  {
    option_id: 'r1',
    is_correct: true,
    region: { x: 0.2, y: 0.3, width: 0.1, height: 0.1, shape: 'circle' },
  },
]

describe('ExerciseView', () => {
  it('renders the prompt', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'Name this technique', options: textOptions },
    })

    expect(wrapper.text()).toContain('Name this technique')
  })

  it('renders text_response options as selectable rows', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Alternate picking')
  })

  it('renders image_choice options as an image grid', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: 'p', options: imageOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Open G chord')
  })

  it("shows the option image uncropped (object-contain), bounded so mixed aspect ratios don't produce a ragged grid", () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: 'p', options: imageOptions },
    })

    const img = wrapper.get('[data-test="exercise-option"] img')
    expect(img.classes()).not.toContain('object-cover')
    expect(img.classes()).toContain('object-contain')
  })

  it('marks the image_choice option image non-draggable, so an accidental drag gesture cannot swallow the click', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_choice', prompt: 'p', options: imageOptions },
    })

    expect(wrapper.get('[data-test="exercise-option"] img').attributes('draggable')).toBe('false')
  })

  describe('audio_selection', () => {
    // jsdom has no real media pipeline — every click pauses/plays the shared
    // element, so both are stubbed for every test here, not just the ones
    // that assert on them.
    beforeEach(() => {
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renders equally sized labeled buttons, with no visible native player', () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: 'p', options: audioOptions },
      })

      const rows = wrapper.findAll('[data-test="exercise-option"]')
      expect(rows).toHaveLength(2)
      expect(rows[0]?.text()).toContain('Lick A')
      expect(rows[1]?.text()).toContain('Lick B')
      // A single shared, hidden player drives playback — not one <audio> per
      // option — so there is nothing resembling a native scrubber per button.
      expect(wrapper.findAll('audio')).toHaveLength(1)
      expect(wrapper.get('audio').attributes('controls')).toBeUndefined()
    })

    it('selects an audio_selection option on click', async () => {
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: 'p', options: audioOptions },
      })

      await wrapper.findAll('[data-test="exercise-option"]')[0]!.trigger('click')

      expect(wrapper.findAll('[data-test="exercise-option"]')[0]!.attributes('data-selected')).toBe('true')
    })

    it("plays the clicked option's clip through the shared player", async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: 'p', options: audioOptions },
      })

      await wrapper.findAll('[data-test="exercise-option"]')[0]!.trigger('click')

      const audioEl = wrapper.get('audio').element as HTMLAudioElement
      expect(audioEl.src).toBe('https://x/lick1.mp3')
      expect(playSpy).toHaveBeenCalledTimes(1)
    })

    it('stops the previously playing clip before playing a newly clicked option, so playback never overlaps', async () => {
      const pauseSpy = vi.mocked(HTMLMediaElement.prototype.pause)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: 'p', options: audioOptions },
      })

      await wrapper.findAll('[data-test="exercise-option"]')[0]!.trigger('click')
      await wrapper.findAll('[data-test="exercise-option"]')[1]!.trigger('click')

      expect(pauseSpy).toHaveBeenCalled()
      const audioEl = wrapper.get('audio').element as HTMLAudioElement
      expect(audioEl.src).toBe('https://x/lick2.mp3')
    })

    it('stops (does not restart) and unselects an option when it is clicked again while playing', async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const pauseSpy = vi.mocked(HTMLMediaElement.prototype.pause)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: 'p', options: audioOptions },
      })
      const firstOption = wrapper.findAll('[data-test="exercise-option"]')[0]!

      await firstOption.trigger('click')
      expect(playSpy).toHaveBeenCalledTimes(1)

      await firstOption.trigger('click')

      expect(playSpy).toHaveBeenCalledTimes(1)
      expect(pauseSpy).toHaveBeenCalled()
      // The second click is both a stop and an unanswer, same as every other
      // exercise type's click-to-deselect behavior.
      expect(firstOption.attributes('data-selected')).toBe('false')
    })

    it('selects and plays again on a third click, after the second click stopped and unselected it', async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: 'p', options: audioOptions },
      })
      const firstOption = wrapper.findAll('[data-test="exercise-option"]')[0]!

      await firstOption.trigger('click')
      await firstOption.trigger('click')
      await firstOption.trigger('click')

      expect(firstOption.attributes('data-selected')).toBe('true')
      expect(playSpy).toHaveBeenCalledTimes(2)
    })

    it('plays again from the start after a clicked clip finished naturally', async () => {
      const playSpy = vi.mocked(HTMLMediaElement.prototype.play)
      const wrapper = mount(ExerciseView, {
        props: { exerciseType: 'audio_selection', prompt: 'p', options: audioOptions },
      })
      const firstOption = wrapper.findAll('[data-test="exercise-option"]')[0]!

      await firstOption.trigger('click')
      await wrapper.get('audio').trigger('ended')
      await firstOption.trigger('click')

      expect(playSpy).toHaveBeenCalledTimes(2)
    })
  })

  it('renders image_recognition options as click regions over the real stimulus image', () => {
    const wrapper = mount(ExerciseView, {
      props: {
        exerciseType: 'image_recognition',
        prompt: 'p',
        options: regionOptions,
        imageUrl: 'https://x/fretboard.png',
      },
    })

    expect(wrapper.findAll('[data-test="exercise-region"]')).toHaveLength(1)
    const img = wrapper.get('[data-test="exercise-stimulus-image"]')
    expect(img.attributes('src')).toBe('https://x/fretboard.png')
  })

  it('shows a placeholder instead of a region canvas when image_recognition has no stimulus image yet', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: 'p', options: regionOptions },
    })

    expect(wrapper.find('[data-test="exercise-stimulus-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="no-stimulus-image"]').exists()).toBe(true)
  })

  it('shows no visible marker over an unselected region, so the image underneath is never obscured', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: 'p', options: regionOptions, imageUrl: 'https://x/fretboard.png' },
    })

    expect(wrapper.find('[data-test="exercise-region-marker"]').exists()).toBe(false)
  })

  it('shows a small marker at the region, not a filled overlay across the whole region, once selected', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'image_recognition', prompt: 'p', options: regionOptions, imageUrl: 'https://x/fretboard.png' },
    })

    await wrapper.get('[data-test="exercise-region"]').trigger('click')

    const region = wrapper.get('[data-test="exercise-region"]')
    expect(region.attributes('data-selected')).toBe('true')
    expect(region.classes()).not.toContain('bg-accent-muted')
    expect(wrapper.find('[data-test="exercise-region-marker"]').exists()).toBe(true)
  })

  it('renders audio_recognition with a real, playable audio element sourced from audioUrl', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'audio_recognition', prompt: 'p', options: textOptions, audioUrl: 'https://x/clip.mp3' },
    })

    const audio = wrapper.get('[data-test="exercise-audio-play"]')
    expect(audio.element.tagName).toBe('AUDIO')
    expect(audio.attributes('src')).toBe('https://x/clip.mp3')
    expect(audio.attributes('controls')).toBeDefined()
    expect(wrapper.findAll('[data-test="exercise-option"]')).toHaveLength(2)
  })

  it('marks an option selected on click without ever exposing is_correct', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[1]?.trigger('click')

    expect(rows[1]?.attributes('data-selected')).toBe('true')
    expect(rows[0]?.attributes('data-selected')).toBe('false')
    expect(wrapper.html()).not.toContain('is_correct')
    expect(wrapper.html()).not.toContain('is-correct')
  })

  it('defaults to single-select: clicking a different option replaces the prior selection', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[1]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('false')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })

  it('allows selecting more than one option at once when allowMultiple is true', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions, allowMultiple: true },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[1]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('true')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })

  it('deselects an option when it is clicked again, regardless of allowMultiple', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[0]?.trigger('click')
    await rows[0]?.trigger('click')

    expect(rows[0]?.attributes('data-selected')).toBe('false')
  })

  it('renders a checkbox-shaped indicator when allowMultiple is true and a radio-shaped one otherwise', () => {
    const single = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })
    const multi = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions, allowMultiple: true },
    })

    expect(single.get('[data-test="exercise-option-indicator"]').classes()).toContain('rounded-full')
    expect(multi.get('[data-test="exercise-option-indicator"]').classes()).not.toContain('rounded-full')
  })

  it('lays out the prompt beside the content in landscape direction', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions, direction: 'row' },
    })

    expect(wrapper.classes()).toContain('flex-row')
  })

  it('lays out the prompt above the content in portrait (default) direction', () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions },
    })

    expect(wrapper.classes()).toContain('flex-col')
  })

  it('emits update:selectedOptionIds with the full selected set on each click', async () => {
    const wrapper = mount(ExerciseView, {
      props: { exerciseType: 'text_response', prompt: 'p', options: textOptions, allowMultiple: true },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[1]?.trigger('click')
    await rows[0]?.trigger('click')

    expect(wrapper.emitted('update:selectedOptionIds')).toEqual([[['o2']], [['o2', 'o1']]])
  })

  it('renders caller-supplied selectedOptionIds as already selected', () => {
    const wrapper = mount(ExerciseView, {
      props: {
        exerciseType: 'text_response',
        prompt: 'p',
        options: textOptions,
        allowMultiple: true,
        selectedOptionIds: ['o1', 'o2'],
      },
    })

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    expect(rows[0]?.attributes('data-selected')).toBe('true')
    expect(rows[1]?.attributes('data-selected')).toBe('true')
  })
})
