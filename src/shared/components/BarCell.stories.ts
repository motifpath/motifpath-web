import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BarCell from './BarCell.vue'

const meta = {
  title: 'Practice/BarCell',
  component: BarCell,
  args: { label: 'IV', position: 2, phase: 'upcoming' },
  render: (args) => ({
    components: { BarCell },
    setup: () => ({ args }),
    template: '<ol class="flex w-[64px]"><BarCell v-bind="args" /></ol>',
  }),
} satisfies Meta<typeof BarCell>

export default meta
type Story = StoryObj<typeof meta>

/** A given bar still to come. */
export const Upcoming: Story = {}

/** A given bar already heard. */
export const Played: Story = { args: { phase: 'played' } }

/** The bar sounding now. */
export const Current: Story = { args: { phase: 'current' } }

/** The chord asked: only "?". */
export const Asked: Story = { args: { label: null, position: 5 } }

/** The chord asked, sounding now: still only "?". */
export const AskedSounding: Story = { args: { label: null, position: 5, phase: 'current' } }
