import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ChallengeReview from './ChallengeReview.vue'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { ReviewEntry } from '@/features/student/composables/usePracticeSession'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

function exercise(id: string, prompt: string, options: Exercise['options'], extra: Partial<Exercise> = {}): Exercise {
  return {
    exercise_id: id,
    title: 'Inversions of C major',
    prompt: plainTextPrompt(prompt),
    exercise_type: 'text_response',
    skills: [],
    concepts: [],
    options,
    challenge_ids: [],
    content_node_ids: [],
    remediation_targets: [],
    languages: [],
    instrument_ids: [],
    created_at: '2026-09-01T00:00:00Z',
    ...extra,
  }
}

const root = { option_id: 'o1', is_correct: false, label: 'Root position' }
const first = { option_id: 'o2', is_correct: true, label: 'First inversion' }
const second = { option_id: 'o3', is_correct: false, label: 'Second inversion' }

const entries: ReviewEntry[] = [
  {
    exercise: exercise('ex-1', 'Which inversion has the root in the bass?', [root, first, second]),
    number: 1,
    chosen: [{ option: root, key: 1, right: true }],
    missed: [],
  },
  {
    exercise: exercise('ex-3', 'Which inversion is shown?', [root, first, second]),
    number: 3,
    chosen: [{ option: second, key: 3, right: false }],
    missed: [{ option: first, key: 2 }],
  },
]

const meta = {
  title: 'Practice/ChallengeReview',
  component: ChallengeReview,
  args: { entries },
} satisfies Meta<typeof ChallengeReview>

export default meta
type Story = StoryObj<typeof meta>

/** A right answer listed once; a wrong one with the right one under it. */
export const RightAndWrong: Story = {}
