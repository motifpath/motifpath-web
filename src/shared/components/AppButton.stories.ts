import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppButton from './AppButton.vue'

const meta = {
  title: 'Actions/AppButton',
  component: AppButton,
  args: { variant: 'primary' },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Start practice</AppButton>',
  }),
} satisfies Meta<typeof AppButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Tertiary: Story = { args: { variant: 'tertiary' } }
export const Destructive: Story = { args: { variant: 'destructive' } }
export const Disabled: Story = { args: { disabled: true } }

export const Busy: Story = {
  args: { busy: true },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Starting…</AppButton>',
  }),
}

/** The ring shows for keyboard focus only, never for a tap. */
export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab()
    canvas.getByRole('button')
  },
}

export const Block: Story = { args: { block: true } }

export const LongPortuguese: Story = {
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Começar a prática de hoje</AppButton>',
  }),
}
