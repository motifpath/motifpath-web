import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeCurrentPath, makeEnrollment, makeStandalonePath } from '@/features/student/testing/learning'
import { buildLearning, type LearningItem } from '@/features/student/utils/learning'

import LearningCard from './LearningCard.vue'

function first(groups: ReturnType<typeof buildLearning>): LearningItem {
  const item = [...groups.inProgress, ...groups.finished, ...groups.left][0]
  if (!item) throw new Error('no item')
  return item
}

const thumbnail =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g"><stop offset="0" stop-color="#6d5bd0"/><stop offset="1" stop-color="#e0a458"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>',
  )

const meta = {
  title: 'Learning/LearningCard',
  component: LearningCard,
  args: { item: first(buildLearning([makeEnrollment({ course_thumbnail_url: thumbnail })], [], makeCurrentPath())) },
  render: (args) => ({
    components: { LearningCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[35rem]"><LearningCard v-bind="args" /></div>',
  }),
} satisfies Meta<typeof LearningCard>

export default meta
type Story = StoryObj<typeof meta>

export const Current: Story = {}

export const InProgress: Story = {
  args: { item: first(buildLearning([makeEnrollment({ course_title: 'Reading rhythm', course_thumbnail_url: thumbnail })], [], null)) },
}

export const AssignedPath: Story = {
  args: {
    item: first(
      buildLearning([], [makeStandalonePath({ assigned_by: { user_id: 't-1', display_name: 'Ana' }, thumbnail_url: thumbnail })], null),
    ),
  },
}

export const NewVersion: Story = {
  args: {
    item: first(buildLearning([makeEnrollment({ course_thumbnail_url: thumbnail, update_available: true })], [], makeCurrentPath())),
  },
}

export const NoThumbnail: Story = {
  args: { item: first(buildLearning([], [makeStandalonePath()], null)) },
}

export const Finished: Story = {
  args: { item: first(buildLearning([makeEnrollment({ status: 'completed', course_title: 'First songs' })], [], null)) },
}

export const Left: Story = {
  args: { item: first(buildLearning([makeEnrollment({ status: 'abandoned', course_title: 'Blues basics' })], [], null)) },
}

export const LongTitle: Story = {
  args: {
    item: first(
      buildLearning(
        [makeEnrollment({ course_title: 'Fingerstyle arrangements of Brazilian popular songs, from bossa nova to choro' })],
        [],
        null,
      ),
    ),
  },
}
