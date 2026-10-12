import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { OutlinePart } from '@/features/student/utils/courseOutline'

import PartRow from './PartRow.vue'

const triads = [
  'Root-position triads',
  'Triads on strings 1–3',
  'Triads on strings 2–4',
  'Triads on strings 3–5',
  'Triads on strings 4–6',
  'Major triads up the neck',
  'Minor triads up the neck',
  'Inversions on the top strings',
  'Connecting inversions',
  'Triads in a I–IV–V',
  'Triads in a ii–V–I',
  'Strumming triads',
  'Arpeggiating triads',
  'Triads in a song',
]

const current: OutlinePart = {
  position: 2,
  title: 'Major triads',
  state: 'current',
  lessonCount: 14,
  lessonsDone: 7,
  lessons: triads.map((title, index) => ({ title, done: index < 7 })),
}

const meta = {
  title: 'Learning/PartRow',
  component: PartRow,
  args: { part: current, expanded: false },
  render: (args) => ({
    components: { PartRow },
    setup: () => ({ args }),
    template: `<div class="max-w-[35rem]"><PartRow v-bind="args">
      <a href="#" class="text-sm font-semibold text-accent-text">Open in My path</a>
    </PartRow></div>`,
  }),
} satisfies Meta<typeof PartRow>

export default meta
type Story = StoryObj<typeof meta>

export const Done: Story = {
  args: {
    part: {
      position: 1,
      title: 'Open chords',
      state: 'done',
      lessonCount: 12,
      lessonsDone: null,
      lessons: [{ title: 'E major' }, { title: 'A minor' }],
    },
  },
}

export const Current: Story = {}

export const CurrentUnfolded: Story = { args: { expanded: true } }

/** Another course is current, so the part's lesson progress is unknown. */
export const CurrentWithoutCount: Story = {
  args: {
    expanded: true,
    part: { ...current, lessonsDone: null, lessons: triads.slice(0, 5).map((title) => ({ title })) },
  },
}

export const Upcoming: Story = {
  args: {
    part: {
      position: 3,
      title: 'Seventh chords',
      state: 'upcoming',
      lessonCount: 10,
      lessonsDone: null,
      lessons: [{ title: 'Dominant sevenths' }],
    },
  },
}

export const LongPortuguese: Story = {
  args: {
    part: { ...current, title: 'Tríades maiores e menores em todas as regiões do braço' },
  },
}
