import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AuthoringRow from './AuthoringRow.vue'

const meta = {
  title: 'Teach/AuthoringRow',
  component: AuthoringRow,
  args: { title: 'Amazing Grace', meta: 'John Newton · English · Revision 2 · updated by Ana, today', status: { label: 'Unpublished changes', tone: 'warning' }, to: '/' },
} satisfies Meta<typeof AuthoringRow>

export default meta
type Story = StoryObj<typeof meta>

export const UnpublishedChanges: Story = {}
export const Published: Story = { args: { meta: 'John Newton · English · Revision 1', status: { label: 'Published', tone: 'success' } } }
export const Draft: Story = { args: { title: 'Ciranda, Cirandinha', meta: 'Tradicional · Portuguese · never published', status: { label: 'Draft', tone: 'accent' } } }
export const NoPublishState: Story = { args: { title: 'Name the note', meta: 'Guitar · English', status: null } }
