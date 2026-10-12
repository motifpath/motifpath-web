import type { Meta, StoryObj } from '@storybook/vue3-vite'

import EditorBody from './EditorBody.vue'
import StatusPanel from './StatusPanel.vue'

const meta = {
  title: 'Teach/EditorBody',
  component: EditorBody,
  args: { twoColumns: false },
  render: (args) => ({
    components: { EditorBody, StatusPanel },
    setup: () => ({ args }),
    template: `
      <EditorBody v-bind="args">
        <template #side>
          <StatusPanel :status="{ label: 'Draft', tone: 'accent' }" message="Not published yet — learners can't find it." primary="Publish" />
        </template>
        <section class="rounded-2xl border border-border bg-surface-raised p-4 text-ink">Details</section>
        <section class="rounded-2xl border border-border bg-surface-raised p-4 text-ink">Checkpoints</section>
      </EditorBody>`,
  }),
} satisfies Meta<typeof EditorBody>

export default meta
type Story = StoryObj<typeof meta>

export const OneColumn: Story = {}
export const TwoColumns: Story = { args: { twoColumns: true } }
