import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const update = vi.fn()
vi.mock('@/features/student/composables/useUpdateLearningItem', () => ({
  useUpdateLearningItem: () => ({ update }),
}))

import UpdateCopyDialog from '@/features/student/components/UpdateCopyDialog.vue'
import { makeEnrollment, makeStandalonePath } from '@/features/student/testing/learning'
import { buildLearning, type LearningItem } from '@/features/student/utils/learning'
import { mockViewport } from '@/shared/testUtils/viewport'

const course = buildLearning([makeEnrollment({ course_title: 'Guitar foundations', update_available: true })], [], null)
  .inProgress[0] as LearningItem
const path = buildLearning([], [makeStandalonePath({ title: 'Fingerstyle warm-ups', update_available: true })], null)
  .inProgress[0] as LearningItem

let wrappers: ReturnType<typeof mount>[] = []
function mountDialog(item: LearningItem | null) {
  mockViewport(390)
  const wrapper = mount(UpdateCopyDialog, { props: { item }, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
const confirmButton = (w: ReturnType<typeof mount>) => w.get('[data-test="confirm-dialog-confirm"]')

describe('UpdateCopyDialog', () => {
  beforeEach(() => update.mockReset())
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers = []
  })

  it('asks to update a course, saying what happens to the student’s place', () => {
    const dialog = mountDialog(course)

    expect(dialog.get('[role="alertdialog"]').text()).toContain('Update Guitar foundations?')
    expect(dialog.text()).toContain('Lessons you finished stay finished.')
    expect(dialog.text()).toContain("This can't be undone.")
    expect(confirmButton(dialog).text()).toBe('Update course')
    expect(confirmButton(dialog).classes()).not.toContain('bg-danger')
    expect(dialog.get('[data-test="confirm-dialog-cancel"]').text()).toBe('Not now')
  })

  it('uses the path wording for a path', () => {
    const dialog = mountDialog(path)

    expect(dialog.text()).toContain('Update Fingerstyle warm-ups?')
    expect(confirmButton(dialog).text()).toBe('Update path')
  })

  it('is closed with no item', () => {
    const dialog = mountDialog(null)

    expect(dialog.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('updates on confirm and answers with what changed', async () => {
    const result = { enrollment: makeEnrollment({ course_version_number: 2 }) }
    update.mockResolvedValueOnce(result)
    const dialog = mountDialog(course)

    await confirmButton(dialog).trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledWith(course)
    expect(dialog.emitted('updated')).toEqual([[result, course]])
  })

  it('stays open after a failure, saying nothing changed, and offers to try again', async () => {
    update.mockRejectedValueOnce(new Error('offline'))
    const dialog = mountDialog(course)

    await confirmButton(dialog).trigger('click')
    await flushPromises()

    expect(dialog.emitted('updated')).toBeUndefined()
    expect(dialog.get('[data-test="inline-notice"]').text()).toContain('Nothing changed.')
    expect(confirmButton(dialog).text()).toBe('Try again')
  })

  it('closes on Not now', async () => {
    const dialog = mountDialog(course)

    await dialog.get('[data-test="confirm-dialog-cancel"]').trigger('click')

    expect(dialog.emitted('cancel')).toHaveLength(1)
  })
})
