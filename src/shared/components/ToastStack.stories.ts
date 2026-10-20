import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { useToast, type ToastKind, type ToastOptions } from '@/shared/composables/useToast'

import ToastStack from './ToastStack.vue'

/** Shows exactly one toast, as the app does: the decorator replaces whatever the last story left. */
function showing(kind: ToastKind, message: string, options?: ToastOptions): Meta['decorators'] {
  return [
    (story) => {
      const toast = useToast()
      toast.clear()
      toast[kind](message, options)
      return { components: { story }, template: '<story />' }
    },
  ]
}

const undo = { action: { label: 'Undo', run: () => {} } }

const meta = {
  title: 'Overlays/ToastStack',
  component: ToastStack,
} satisfies Meta<typeof ToastStack>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = { decorators: showing('neutral', 'Saved for later.') }

export const Success: Story = { decorators: showing('success', 'Exercise saved.') }

export const WithUndo: Story = {
  decorators: showing('neutral', 'Major triads is now your current course.', undo),
}

export const ErrorWithRetry: Story = {
  decorators: showing('error', "Couldn't switch your course. Nothing changed.", {
    action: { label: 'Retry', run: () => {} },
  }),
}

export const ErrorStaysUntilDismissed: Story = { decorators: showing('error', 'Upload failed: the file is larger than 50 MB.') }

export const LongPortuguese: Story = {
  decorators: showing('neutral', 'Tríades maiores agora é o seu curso atual. Você pode voltar ao anterior.', {
    action: { label: 'Desfazer', run: () => {} },
  }),
}
