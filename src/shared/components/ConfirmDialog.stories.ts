import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ConfirmDialog from './ConfirmDialog.vue'

const meta = {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    title: 'Delete this exercise?',
    message: 'It is removed from every challenge that uses it. This can’t be undone.',
    confirmLabel: 'Delete',
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Busy: Story = { args: { busy: true } }
export const LongPortuguese: Story = {
  args: {
    title: 'Excluir este exercício definitivamente?',
    message: 'Ele será removido de todos os desafios que o usam. Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir exercício',
  },
}
