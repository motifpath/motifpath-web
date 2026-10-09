import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SheetHeader from './SheetHeader.vue'

const meta = {
  title: 'Overlays/SheetHeader',
  component: SheetHeader,
  args: { title: 'Report a problem', titleId: 'sheet-title', kind: 'sheet' },
} satisfies Meta<typeof SheetHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Sheet: Story = {}
export const Dialog: Story = { args: { kind: 'dialog' } }
export const SubStep: Story = { args: { title: 'Language', back: true } }
export const NotClosable: Story = { args: { closable: false } }
export const LongPortuguese: Story = { args: { title: 'Relatar um problema com este exercício' } }
