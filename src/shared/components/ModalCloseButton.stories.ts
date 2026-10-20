import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ModalCloseButton from './ModalCloseButton.vue'

const meta = {
  title: 'Actions/ModalCloseButton',
  component: ModalCloseButton,
} satisfies Meta<typeof ModalCloseButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
