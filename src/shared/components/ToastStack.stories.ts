import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { useToast } from '@/shared/composables/useToast'

import ToastStack from './ToastStack.vue'

const meta = {
  title: 'Overlays/ToastStack',
  component: ToastStack,
  decorators: [
    (story) => {
      const toast = useToast()
      toast.clear()
      toast.error('Upload failed: the file is larger than 50 MB.')
      toast.success('Exercise saved.')
      return { components: { story }, template: '<story />' }
    },
  ],
} satisfies Meta<typeof ToastStack>

export default meta
type Story = StoryObj<typeof meta>

export const SuccessAndError: Story = {}
