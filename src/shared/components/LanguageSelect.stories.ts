import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LanguageSelect from './LanguageSelect.vue'

const meta = {
  title: 'Selection/LanguageSelect',
  component: LanguageSelect,
  args: { modelValue: 'en' },
} satisfies Meta<typeof LanguageSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithEmptyChoice: Story = { args: { modelValue: null, emptyLabel: 'Any language' } }
