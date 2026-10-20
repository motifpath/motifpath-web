import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ReviewWayOn from './ReviewWayOn.vue'

const meta = {
  title: 'Lesson/ReviewWayOn',
  component: ReviewWayOn,
  args: {
    next: {
      eyebrow: 'Up next · Part 1 · Lesson 3 of 5',
      title: 'Bass clef',
      kind: 'article',
      kindLabel: 'Article',
      to: '#',
    },
    ownerTitle: 'Music reading 101',
    back: { to: '#', label: 'Back to Music reading 101' },
  },
  render: (args) => ({
    components: { ReviewWayOn },
    setup: () => ({ args }),
    template: '<div class="max-w-[35rem]"><ReviewWayOn v-bind="args" /></div>',
  }),
} satisfies Meta<typeof ReviewWayOn>

export default meta
type Story = StoryObj<typeof meta>

/** A lesson reviewed mid-course: the next lesson, and a quiet way back to the course. */
export const NextLesson: Story = {}

/** The last lesson of the course: Learning is the way on, where the next course or path is. */
export const LastLesson: Story = { args: { next: null } }
