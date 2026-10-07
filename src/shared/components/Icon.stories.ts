import type { Meta, StoryObj } from '@storybook/vue3-vite'

import Icon from './Icon.vue'

const names = [
  'completed', 'current', 'locked', 'todo', 'menu', 'chevron-right', 'sun', 'moon', 'play', 'pause', 'stop',
  'loading', 'volume', 'volume-off', 'fullscreen', 'grip', 'reset',
] as const

const meta = {
  title: 'Icons/Icon',
  component: Icon,
  args: { name: 'completed', size: 24 },
  argTypes: { name: { control: 'select', options: names } },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {}
export const Badge: Story = { args: { badge: true } }
export const AllIcons: Story = {
  render: () => ({
    components: { Icon },
    setup: () => ({ names }),
    template:
      '<div class="grid grid-cols-4 gap-4"><div v-for="n in names" :key="n" class="flex flex-col items-center gap-1 text-xs text-ink-muted"><Icon :name="n" :size="24" />{{ n }}</div></div>',
  }),
}
