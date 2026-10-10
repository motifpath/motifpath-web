import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LevelBar from './LevelBar.vue'

const meta = {
  title: 'Cards & progress/LevelBar',
  component: LevelBar,
  decorators: [() => ({ template: '<div class="max-w-[22rem]"><story /></div>' })],
  args: { counts: { learning: 5, accurate: 7, fluent: 4, retained: 2 } },
} satisfies Meta<typeof LevelBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: { theme: 'dark' } }
export const SomeLevelsEmpty: Story = { args: { counts: { learning: 3, accurate: 0, fluent: 1, retained: 0 } } }
export const NothingYet: Story = { args: { counts: { learning: 0, accurate: 0, fluent: 0, retained: 0 } } }
export const Portuguese: Story = { globals: { locale: 'pt-BR', theme: 'dark' } }
