import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import DiscoverSwitch from './DiscoverSwitch.vue'

/** Shows the switch with the story router on `routeName`. */
const on = (routeName: string) => () => ({
  components: { DiscoverSwitch },
  setup() {
    const router = useRouter()
    const ready = ref(false)
    onMounted(async () => {
      await router.replace({ name: routeName })
      ready.value = true
    })
    return { ready }
  },
  template: '<div class="max-w-xs"><DiscoverSwitch v-if="ready" /></div>',
})

const meta = {
  title: 'Selection/DiscoverSwitch',
  component: DiscoverSwitch,
  render: on('course-catalog'),
} satisfies Meta<typeof DiscoverSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Courses: Story = {}
export const Paths: Story = { render: on('path-catalog') }
export const LongPortuguese: Story = { globals: { locale: 'pt-BR' } }
