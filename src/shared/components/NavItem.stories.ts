import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Compass, Route } from 'lucide-vue-next'

import NavItem from './NavItem.vue'

const meta = {
  title: 'Navigation/NavItem',
  component: NavItem,
  args: { label: 'My path', icon: Route, to: { name: 'path' }, current: false, layout: 'stacked' },
  render: (args) => ({
    components: { NavItem },
    setup: () => ({ args }),
    template: '<div class="flex w-64 bg-surface-raised p-2"><NavItem v-bind="args" /></div>',
  }),
} satisfies Meta<typeof NavItem>

export default meta
type Story = StoryObj<typeof meta>

/** Bottom bar and rail: icon over label. */
export const Stacked: Story = {}
export const StackedCurrent: Story = { args: { current: true } }
/** Sidebar: icon beside label. */
export const Row: Story = { args: { layout: 'row' } }
export const RowCurrent: Story = { args: { layout: 'row', current: true } }
export const LongPortuguese: Story = { args: { label: 'Explorar', icon: Compass, current: true } }
