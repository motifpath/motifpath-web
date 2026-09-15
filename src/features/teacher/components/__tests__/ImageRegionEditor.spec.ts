import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ImageRegionEditor from '@/features/teacher/components/ImageRegionEditor.vue'
import type { Region } from '@/features/teacher/composables/useExerciseForm'

const regions: Region[] = [
  { id: 'r1', x: 20, y: 30, width: 30, height: 30, shape: 'circle', correct: true },
  { id: 'r2', x: 60, y: 40, width: 70, height: 38, shape: 'rectangle', correct: false },
]

function mountEditor() {
  return mount(ImageRegionEditor, {
    props: { imageUrl: 'https://cdn.example.com/fret.png', regions, newRegionShape: 'circle' },
  })
}

describe('ImageRegionEditor', () => {
  it('emits add-region with the click position as a percentage of the container', async () => {
    const wrapper = mountEditor()
    const canvas = wrapper.get('[data-test="region-canvas"]')
    vi.spyOn(canvas.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => '',
    })
    await wrapper.get('img').trigger('load')

    await canvas.trigger('click', { clientX: 100, clientY: 50 })

    expect(wrapper.emitted('add-region')).toEqual([[50, 50]])
  })

  it('does not add a region from a click before the stimulus image has finished loading', async () => {
    const wrapper = mountEditor()
    const canvas = wrapper.get('[data-test="region-canvas"]')
    vi.spyOn(canvas.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => '',
    })

    // Image chosen, but its `load` event hasn't fired yet — the container's
    // rendered height is not yet the real one, so a click here would place a
    // region against a layout that's about to change size once it loads.
    await canvas.trigger('click', { clientX: 100, clientY: 50 })

    expect(wrapper.emitted('add-region')).toBeUndefined()
  })

  it('renders one badge per region and lets a region be toggled and removed', async () => {
    const wrapper = mountEditor()

    const toggles = wrapper.findAll('[data-test="region-toggle"]')
    expect(toggles).toHaveLength(2)

    await toggles[1]!.trigger('click')
    expect(wrapper.emitted('toggle-region')).toEqual([['r2']])

    await wrapper.findAll('[data-test="region-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('remove-region')).toEqual([['r1']])
  })

  it('emits resize-region from the size controls, circle vs rectangle', async () => {
    const wrapper = mountEditor()

    const groups = wrapper.findAll('[data-test="region-controls"]')
    // r1 is a circle: single grow/shrink pair
    await groups[0]!.get('[data-test="grow"]').trigger('click')
    expect(wrapper.emitted('resize-region')).toEqual([['r1', 8, 8]])

    // r2 is a rectangle: separate width/height controls
    await groups[1]!.get('[data-test="grow-width"]').trigger('click')
    await groups[1]!.get('[data-test="grow-height"]').trigger('click')
    expect(wrapper.emitted('resize-region')).toEqual([
      ['r1', 8, 8],
      ['r2', 8, 0],
      ['r2', 0, 8],
    ])
  })

  it('emits update:newRegionShape from the shape picker', async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-test="shape-rectangle"]').trigger('click')

    expect(wrapper.emitted('update:newRegionShape')).toEqual([['rectangle']])
  })

  it('shows a placeholder instead of a broken image when no image is chosen yet', () => {
    const wrapper = mount(ImageRegionEditor, {
      props: { imageUrl: '', regions: [], newRegionShape: 'circle' },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-test="no-image-placeholder"]').exists()).toBe(true)
  })

  it('does not add a region from a click when no image is chosen yet', async () => {
    const wrapper = mount(ImageRegionEditor, {
      props: { imageUrl: '', regions: [], newRegionShape: 'circle' },
    })

    await wrapper.get('[data-test="region-canvas"]').trigger('click', { clientX: 10, clientY: 10 })

    expect(wrapper.emitted('add-region')).toBeUndefined()
  })

  it('does not emit a stimulus size before the image has finished loading', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 240,
      right: 640,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: () => '',
    })

    const wrapper = mountEditor()

    expect(wrapper.emitted('update:stimulus-size')).toBeUndefined()
  })

  it('never emits a stimulus size when no image is chosen', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 240,
      right: 640,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: () => '',
    })

    const wrapper = mount(ImageRegionEditor, {
      props: { imageUrl: '', regions: [], newRegionShape: 'circle' },
    })

    expect(wrapper.emitted('update:stimulus-size')).toBeUndefined()
  })

  it('emits the image element\'s own rendered size once it finishes loading', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 480,
      right: 640,
      bottom: 480,
      x: 0,
      y: 0,
      toJSON: () => '',
    })

    const wrapper = mountEditor()
    await wrapper.get('img').trigger('load')

    expect(wrapper.emitted('update:stimulus-size')).toEqual([[640, 480]])
  })

  it('re-measures and emits stimulus size on window resize, once loaded', async () => {
    const rect = {
      left: 0,
      top: 0,
      width: 640,
      height: 240,
      right: 640,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: () => '',
    }
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect)

    const wrapper = mountEditor()
    await wrapper.get('img').trigger('load')
    rect.width = 320

    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:stimulus-size')).toEqual([
      [640, 240],
      [320, 240],
    ])
  })

  it('does not re-measure on window resize before the image has finished loading', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 240,
      right: 640,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: () => '',
    })
    const wrapper = mountEditor()

    window.dispatchEvent(new Event('resize'))

    expect(wrapper.emitted('update:stimulus-size')).toBeUndefined()
  })
})
