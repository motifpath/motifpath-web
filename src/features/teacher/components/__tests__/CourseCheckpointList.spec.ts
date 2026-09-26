import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CourseCheckpointList from '@/features/teacher/components/CourseCheckpointList.vue'
import type { CheckpointDraft } from '@/features/teacher/composables/useCourseForm'

const checkpoints: CheckpointDraft[] = [
  { key: 'k-1', learningPathId: 'lp-1', pathTitle: 'Open chords', override: '' },
  { key: 'k-2', learningPathId: 'lp-2', pathTitle: 'Travis picking', override: 'Stage 2' },
  { key: 'k-3', learningPathId: 'lp-3', pathTitle: null, override: 'Stage 3' },
]

function mountList(props: { disabled?: boolean } = {}) {
  return mount(CourseCheckpointList, { props: { checkpoints, ...props } })
}

describe('CourseCheckpointList', () => {
  it('says when there are no checkpoints yet', () => {
    const wrapper = mount(CourseCheckpointList, { props: { checkpoints: [] } })

    expect(wrapper.find('[data-test="checkpoints-empty"]').exists()).toBe(true)
  })

  it("shows each checkpoint's position, path title and override", () => {
    const wrapper = mountList()

    const rows = wrapper.findAll('[data-test="checkpoint-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.get('[data-test="checkpoint-position"]').text()).toBe('1')
    expect(rows[0]!.get('[data-test="checkpoint-path-title"]').text()).toBe('Open chords')
    expect(rows[1]!.get<HTMLInputElement>('[data-test="checkpoint-override"]').element.value).toBe('Stage 2')
  })

  it("uses the path's title as the override's placeholder", () => {
    const wrapper = mountList()

    const input = wrapper.findAll('[data-test="checkpoint-override"]')[0]!
    expect(input.attributes('placeholder')).toBe('Open chords')
  })

  it("marks a path title that hasn't loaded yet", () => {
    const wrapper = mountList()

    expect(wrapper.findAll('[data-test="checkpoint-path-title"]')[2]!.text()).toBe('…')
  })

  it('emits a typed override', async () => {
    const wrapper = mountList()

    await wrapper.findAll('[data-test="checkpoint-override"]')[0]!.setValue('Stage 1: Open chords')

    expect(wrapper.emitted('updateOverride')).toEqual([[0, 'Stage 1: Open chords']])
  })

  it('moves a checkpoint up or down, never past either end', async () => {
    const wrapper = mountList()
    const ups = wrapper.findAll('[data-test="checkpoint-move-up"]')
    const downs = wrapper.findAll('[data-test="checkpoint-move-down"]')

    expect(ups[0]!.attributes('disabled')).toBeDefined()
    expect(downs[2]!.attributes('disabled')).toBeDefined()

    await ups[1]!.trigger('click')
    await downs[1]!.trigger('click')

    expect(wrapper.emitted('move')).toEqual([
      [1, 0],
      [1, 2],
    ])
  })

  it('moves a checkpoint dragged by its handle onto another row', async () => {
    const wrapper = mountList()
    const rows = wrapper.findAll('[data-test="checkpoint-row"]')

    expect(rows[0]!.attributes('draggable')).toBe('false')
    await rows[0]!.get('[data-test="checkpoint-drag-handle"]').trigger('pointerdown')
    expect(rows[0]!.attributes('draggable')).toBe('true')
    await rows[0]!.trigger('dragstart')
    await rows[2]!.trigger('dragover')
    await rows[2]!.trigger('drop')

    expect(wrapper.emitted('move')).toEqual([[0, 2]])
  })

  it('ignores a drop onto the dragged row itself', async () => {
    const wrapper = mountList()
    const rows = wrapper.findAll('[data-test="checkpoint-row"]')

    await rows[1]!.get('[data-test="checkpoint-drag-handle"]').trigger('pointerdown')
    await rows[1]!.trigger('dragstart')
    await rows[1]!.trigger('drop')

    expect(wrapper.emitted('move')).toBeUndefined()
  })

  it('never drags a row from anywhere but its handle, so its title can be selected', async () => {
    const wrapper = mountList()
    const rows = wrapper.findAll('[data-test="checkpoint-row"]')

    await rows[0]!.trigger('dragstart')
    await rows[2]!.trigger('drop')

    expect(wrapper.emitted('move')).toBeUndefined()
  })

  it('removes a checkpoint', async () => {
    const wrapper = mountList()

    await wrapper.findAll('[data-test="checkpoint-remove"]')[1]!.trigger('click')

    expect(wrapper.emitted('remove')).toEqual([[1]])
  })

  it('shows the checkpoints read-only while disabled', () => {
    const wrapper = mountList({ disabled: true })

    expect(wrapper.find('[data-test="checkpoint-remove"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="checkpoint-move-up"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="checkpoint-override"]')[0]!.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('[data-test="checkpoint-row"]')[0]!.attributes('draggable')).toBe('false')
  })
})
