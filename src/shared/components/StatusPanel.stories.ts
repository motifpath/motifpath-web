import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StatusPanel from './StatusPanel.vue'

const meta = {
  title: 'Teach/StatusPanel',
  component: StatusPanel,
  args: { status: { label: 'Draft', tone: 'accent' }, message: "Not published yet — learners can't find it.", primary: 'Publish' },
} satisfies Meta<typeof StatusPanel>

export default meta
type Story = StoryObj<typeof meta>

export const DraftMissing: Story = { args: { missing: ['A summary', 'A language'] } }
export const DraftReady: Story = {}
export const Published: Story = {
  args: { status: { label: 'Published · v3', tone: 'success' }, message: 'Learners get version 3.', primary: undefined, secondary: 'Unpublish' },
}
export const UnpublishedChanges: Story = {
  args: { status: { label: 'Unpublished changes', tone: 'warning' }, message: 'Learners still get version 3. Publish to give them your changes.', primary: 'Publish changes' },
}
export const Retired: Story = {
  args: { status: { label: 'Retired', tone: 'neutral' }, message: "Retired — it can't be changed. An admin can reactivate it.", primary: undefined },
}
export const TeacherOnACourse: Story = {
  args: {
    status: { label: 'Unpublished changes', tone: 'warning' },
    message: 'Learners still get version 3. An admin publishes courses — your saved changes reach learners when they do.',
    primary: undefined,
  },
}
export const Busy: Story = { args: { busy: true } }
