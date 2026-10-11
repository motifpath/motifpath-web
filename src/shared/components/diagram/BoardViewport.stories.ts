import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BoardViewport from './BoardViewport.vue'

const meta = {
  title: 'Diagrams/BoardViewport',
  component: BoardViewport,
  args: { contentWidth: 1200, viewWidth: 320, label: 'A minor pentatonic — full neck' },
  render: (args) => ({
    components: { BoardViewport },
    setup: () => ({ args }),
    template: `<div class="w-80"><BoardViewport v-bind="args">
      <svg :width="args.contentWidth" height="160" :viewBox="'0 0 ' + args.contentWidth + ' 160'" class="block max-w-none">
        <rect :width="args.contentWidth" height="160" class="fill-fretboard-inlay" />
      </svg>
      <template #overview>
        <svg :viewBox="'0 0 ' + args.contentWidth + ' 160'" class="block w-full"><rect :width="args.contentWidth" height="160" class="fill-fretboard-inlay" /></svg>
      </template>
    </BoardViewport></div>`,
  }),
} satisfies Meta<typeof BoardViewport>

export default meta
type Story = StoryObj<typeof meta>

/** Too wide for a phone: it scrolls at readable size, with the overview strip under it. */
export const TooWide: Story = {}

/** A board that fits shows as it is: no strip, no fades. */
export const Fits: Story = { args: { contentWidth: 300 } }
