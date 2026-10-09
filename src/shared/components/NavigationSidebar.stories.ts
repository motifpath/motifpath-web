import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { CircleUserRound } from 'lucide-vue-next'

import MenuRow from './MenuRow.vue'
import NavigationSidebar from './NavigationSidebar.vue'

const meta = {
  title: 'Navigation/NavigationSidebar',
  component: NavigationSidebar,
  args: { current: 'home', showTeach: false },
  globals: { viewport: { value: 'expanded' } },
  render: (args) => ({
    components: { NavigationSidebar, MenuRow },
    setup: () => ({ args, CircleUserRound }),
    template: `
      <div class="h-[40rem]">
        <NavigationSidebar v-bind="args">
          <template #account><MenuRow label="Account" :icon="CircleUserRound" /></template>
        </NavigationSidebar>
      </div>`,
  }),
} satisfies Meta<typeof NavigationSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Student: Story = {}
export const MyPath: Story = { args: { current: 'myPath' } }
/** Teachers and admins: Teach under a divider, apart from the learner destinations. */
export const Author: Story = { args: { showTeach: true }, globals: { role: 'teacher' } }
export const NoneCurrent: Story = { args: { current: null } }
export const LongPortuguese: Story = { args: { current: 'discover', showTeach: true }, globals: { locale: 'pt-BR' } }
