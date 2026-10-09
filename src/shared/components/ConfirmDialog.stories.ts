import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ConfirmDialog from './ConfirmDialog.vue'

const meta = {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    title: 'Leave Fingerstyle basics?',
    message: 'You’ll lose your place in this course. If you enrol again, it starts from checkpoint 1.',
    confirmLabel: 'Leave course',
    cancelLabel: 'Keep learning',
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Busy: Story = { args: { busy: true } }
export const DefaultCancel: Story = { args: { cancelLabel: undefined } }
export const LongPortuguese: Story = {
  args: {
    title: 'Sair de Fundamentos do fingerstyle?',
    message: 'Você perderá seu lugar neste curso. Se se inscrever de novo, ele recomeça do checkpoint 1.',
    confirmLabel: 'Sair do curso',
    cancelLabel: 'Continuar aprendendo',
  },
}
