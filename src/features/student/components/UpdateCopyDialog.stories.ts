import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeEnrollment, makeStandalonePath } from '@/features/student/testing/learning'
import { buildLearning } from '@/features/student/utils/learning'

import UpdateCopyDialog from './UpdateCopyDialog.vue'

const meta = {
  title: 'Learning/UpdateCopyDialog',
  component: UpdateCopyDialog,
  args: {
    item: buildLearning([makeEnrollment({ course_title: 'Guitar foundations', update_available: true })], [], null).inProgress[0] ?? null,
  },
} satisfies Meta<typeof UpdateCopyDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Course: Story = {}

export const Path: Story = {
  args: {
    item: buildLearning([], [makeStandalonePath({ title: 'Fingerstyle warm-ups', update_available: true })], null).inProgress[0] ?? null,
  },
}
