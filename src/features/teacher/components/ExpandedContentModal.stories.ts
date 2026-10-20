import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { plainTextPrompt } from '@/shared/testUtils/promptDocument'

import ExpandedContentModal from './ExpandedContentModal.vue'

const meta = {
  title: 'Teach/ExpandedContentModal',
  component: ExpandedContentModal,
  args: {
    open: true,
    timing: 'seconds',
    saving: false,
    item: {
      expanded_content_id: 'popup-1',
      content_node_id: 'lesson-1',
      content_type: 'rich_text',
      rich_content: plainTextPrompt('Keep your thumb behind the neck.'),
      trigger_at_seconds: 12,
      hide_at_seconds: 20,
      created_at: '2026-10-01T10:00:00Z',
    },
  },
} satisfies Meta<typeof ExpandedContentModal>

export default meta
type Story = StoryObj<typeof meta>

/** A rich-text pop-up: on a phone, the docked bar and its sheets work inside the modal. */
export const RichTextOnPhone: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } }
export const RichText: Story = {}
