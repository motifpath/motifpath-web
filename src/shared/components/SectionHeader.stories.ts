import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SectionHeader from './SectionHeader.vue'

const meta = {
  title: 'Cards & progress/SectionHeader',
  component: SectionHeader,
  decorators: [() => ({ template: '<div class="max-w-[35rem]"><story /></div>' })],
  args: { label: 'Triad shapes', count: '2 of 5' },
} satisfies Meta<typeof SectionHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}
export const Folded: Story = { args: { label: 'Open chords', count: '5 of 5', foldable: true, expanded: false } }
export const Unfolded: Story = { args: { label: 'Open chords', count: '5 of 5', foldable: true, expanded: true } }
export const LongPortuguese: Story = {
  args: { label: 'Acordes abertos e pestanas no braço inteiro', count: '5 de 5', foldable: true },
}
