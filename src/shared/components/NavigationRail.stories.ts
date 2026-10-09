import type { Meta, StoryObj } from '@storybook/vue3-vite'

import UserAvatar from './UserAvatar.vue'
import NavigationRail from './NavigationRail.vue'

const meta = {
  title: 'Navigation/NavigationRail',
  component: NavigationRail,
  args: { current: 'home' },
  globals: { viewport: { value: 'medium' } },
  render: (args) => ({
    components: { NavigationRail, UserAvatar },
    setup: () => ({ args }),
    template: `
      <div class="flex h-[40rem]">
        <NavigationRail v-bind="args">
          <template #account><UserAvatar initial="A" /></template>
        </NavigationRail>
      </div>`,
  }),
} satisfies Meta<typeof NavigationRail>

export default meta
type Story = StoryObj<typeof meta>

export const Home: Story = {}
export const MyPath: Story = { args: { current: 'myPath' } }
export const Discover: Story = { args: { current: 'discover' } }
export const NoneCurrent: Story = { args: { current: null } }
export const LongPortuguese: Story = { args: { current: 'learning' }, globals: { locale: 'pt-BR' } }
