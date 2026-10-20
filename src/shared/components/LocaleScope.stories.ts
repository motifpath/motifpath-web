import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LocaleScope from './LocaleScope.vue'
import LoadFailed from './LoadFailed.vue'

const meta = {
  title: 'Utilities/LocaleScope',
  component: LocaleScope,
  args: { locale: 'pt-BR' },
  render: (args) => ({
    components: { LocaleScope, LoadFailed },
    setup: () => ({ args }),
    template: '<LocaleScope v-bind="args"><LoadFailed message="Text passed in stays as it is; the Try again label follows the scope." /></LocaleScope>',
  }),
} satisfies Meta<typeof LocaleScope>

export default meta
type Story = StoryObj<typeof meta>

export const PortugueseInside: Story = {}
export const EnglishInside: Story = { args: { locale: 'en' } }
