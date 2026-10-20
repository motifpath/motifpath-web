import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'

import { makeEnrollment } from '@/features/student/testing/learning'
import { failing } from '@/shared/testUtils/msw/handlers'

import CourseCompletedCard from './CourseCompletedCard.vue'

const thumbnail =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g"><stop offset="0" stop-color="#6d5bd0"/><stop offset="1" stop-color="#e0a458"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>',
  )

const finished = makeEnrollment({
  status: 'completed',
  active_checkpoint_position: null,
  active_checkpoint_student_path_id: null,
  course_thumbnail_url: thumbnail,
})

const meta = {
  title: 'Learning/CourseCompletedCard',
  component: CourseCompletedCard,
  args: { enrollment: finished },
  render: (args) => ({
    components: { CourseCompletedCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[560px]"><CourseCompletedCard v-bind="args" /></div>',
  }),
} satisfies Meta<typeof CourseCompletedCard>

export default meta
type Story = StoryObj<typeof meta>

export const Finished: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'You finished Guitar foundations' })).toBeVisible()
    await expect(await canvas.findByText('4 parts · 44 lessons')).toBeVisible()
  },
}

export const WithoutThumbnail: Story = {
  args: { enrollment: { ...finished, course_thumbnail_url: undefined } },
}

/** The published course cannot be read: the parts alone, and no retry. */
export const PartsOnly: Story = {
  parameters: { msw: { handlers: { publishedCourse: failing('publishedCourse') } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('4 parts')).toBeVisible()
  },
}
