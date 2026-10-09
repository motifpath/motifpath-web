import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LanguageSelect from './LanguageSelect.vue'

const meta = {
  title: 'Selection/LanguageSelect',
  component: LanguageSelect,
  args: { modelValue: 'en' },
  // Callers wrap it in a label; on its own a select has no name.
  render: (args) => ({
    components: { LanguageSelect },
    setup: () => ({ args }),
    template: '<label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">Language<LanguageSelect v-bind="args" /></label>',
  }),
} satisfies Meta<typeof LanguageSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithEmptyChoice: Story = { args: { modelValue: null, emptyLabel: 'Any language' } }
