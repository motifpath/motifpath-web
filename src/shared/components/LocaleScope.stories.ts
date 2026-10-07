import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LocaleScope from './LocaleScope.vue'
import StateLoading from './StateLoading.vue'

const meta = {
  title: 'Utilities/LocaleScope',
  component: LocaleScope,
  args: { locale: 'pt-BR' },
  render: (args) => ({
    components: { LocaleScope, StateLoading },
    setup: () => ({ args }),
    template: '<LocaleScope v-bind="args"><StateLoading noun="cursos" /></LocaleScope>',
  }),
} satisfies Meta<typeof LocaleScope>

export default meta
type Story = StoryObj<typeof meta>

export const PortugueseInside: Story = {}
export const EnglishInside: Story = { args: { locale: 'en' } }
