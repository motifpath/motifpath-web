import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { MyPathStep } from '@/features/student/utils/myPath'

import LessonSectionSteps from './LessonSectionSteps.vue'

function stepAt(position: number, title: string, state: MyPathStep['state'], kind: MyPathStep['kind'] = 'video'): MyPathStep {
  return { position, title, contentNodeId: `node-${position}`, kind, state, availableLanguages: state === 'language' ? ['en'] : [] }
}

const current = stepAt(8, 'Inversions on the top strings', 'current')

const meta = {
  title: 'Cards & progress/LessonSectionSteps',
  component: LessonSectionSteps,
  // The lesson's side column is 304 px wide.
  decorators: [() => ({ template: '<div class="w-[19rem]"><story /></div>' })],
  args: {
    section: {
      label: 'Triad shapes',
      done: 2,
      total: 5,
      finished: false,
      steps: [stepAt(7, 'Triads on strings 1–3', 'done', 'article'), current, stepAt(9, 'Connecting inversions', 'locked')],
    },
    viewingNodeId: 'node-8',
    next: current,
  },
} satisfies Meta<typeof LessonSectionSteps>

export default meta
type Story = StoryObj<typeof meta>

/** The lesson on screen is the step the student is on. */
export const Now: Story = {}

/** The video ended: the lesson on screen is done and the step it opened is up next. */
export const AfterTheLesson: Story = {
  args: {
    viewingNodeId: 'node-7',
    section: {
      label: 'Triad shapes',
      done: 2,
      total: 5,
      finished: false,
      steps: [stepAt(7, 'Triads on strings 1–3', 'done', 'article'), current],
    },
  },
}

/** Reopened once done: the step the student is on now is a later one. */
export const Review: Story = {
  args: {
    viewingNodeId: 'node-6',
    section: {
      label: 'Triad shapes',
      done: 2,
      total: 5,
      finished: false,
      steps: [stepAt(6, 'Root-position triads', 'done'), stepAt(7, 'Triads on strings 1–3', 'done', 'article'), current],
    },
  },
}

/** The next step is only in another language. */
export const NextInAnotherLanguage: Story = {
  args: {
    section: {
      label: 'Triad shapes',
      done: 2,
      total: 5,
      finished: false,
      steps: [stepAt(7, 'Triads on strings 1–3', 'done', 'article'), current, stepAt(9, 'Connecting inversions', 'language')],
    },
  },
}

/** A path without section labels: no heading, the region keeps its name. */
export const NoSections: Story = {
  args: {
    section: { label: null, done: 2, total: 5, finished: false, steps: [stepAt(7, 'Triads on strings 1–3', 'done', 'article'), current] },
  },
}

export const LongPortuguese: Story = {
  args: {
    section: {
      label: 'Tríades em todas as regiões do braço',
      done: 2,
      total: 5,
      finished: false,
      steps: [
        stepAt(7, 'Tríades nas cordas 1–3', 'done', 'article'),
        stepAt(8, 'Inversões de tríades maiores e menores nas três cordas mais agudas', 'current'),
        stepAt(9, 'Ligando as inversões ao longo do braço', 'locked'),
      ],
    },
  },
}
