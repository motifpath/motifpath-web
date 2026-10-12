import type { Meta, StoryObj } from '@storybook/vue3-vite'

import CourseDetailContent from './CourseDetailContent.vue'
import PrimaryButton from './PrimaryButton.vue'

const meta = {
  title: 'Learning/CourseDetailContent',
  component: CourseDetailContent,
  args: {
    course: {
      course_id: 'c-1',
      title: 'Guitar foundations',
      summary: 'Your first chords, strumming and changes — in four short parts.',
      level: 'beginner',
      language: 'en',
      status: 'published',
      instrument_ids: [],
      created_by: { user_id: 't-1', display_name: 'Gilson Yamada' },
      lesson_count: 22,
      checkpoint_count: 4,
      checkpoints: [
        { position: 1, title: 'First chords', items: [{ title: 'E minor' }, { title: 'A minor' }] },
        { position: 2, title: 'Strumming', items: [{ title: 'Down strums' }] },
      ],
    },
  },
  render: (args) => ({
    components: { CourseDetailContent, PrimaryButton },
    setup: () => ({ args }),
    template: '<CourseDetailContent v-bind="args"><template #action><PrimaryButton>Enroll</PrimaryButton></template></CourseDetailContent>',
  }),
} satisfies Meta<typeof CourseDetailContent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
