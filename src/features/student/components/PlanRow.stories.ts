import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PlanRow from './PlanRow.vue'

const meta = {
  title: 'Practice/PlanRow',
  component: PlanRow,
  args: { position: 3, name: 'Name the note · 8 notes', reason: 'weak', kind: 'fretboard_cell' },
  render: (args) => ({
    components: { PlanRow },
    setup: () => ({ args }),
    template: '<ol class="max-w-[35rem] rounded-lg border border-border bg-surface-raised"><PlanRow v-bind="args" /></ol>',
  }),
} satisfies Meta<typeof PlanRow>

export default meta
type Story = StoryObj<typeof meta>

export const FretboardDrill: Story = {}
export const PlayAlong: Story = { args: { position: 1, name: 'Warm-up: Am pentatonic, box 1', reason: 'warm_up', kind: 'play_along' } }
export const Exercise: Story = { args: { position: 2, name: 'Hear the third', reason: 'due', kind: 'exercise' } }
