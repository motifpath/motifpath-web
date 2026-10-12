import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeDiagramRef } from '@/shared/testUtils/diagram'

import WhatYouHeard from './WhatYouHeard.vue'

const meta = {
  title: 'Practice/WhatYouHeard',
  component: WhatYouHeard,
  args: { sound: makeDiagramRef({ playback: { playback_id: 'playback-riff', direction: 'as_authored', loop: false } }) },
  parameters: {
    docs: {
      description: {
        component:
          'After a listening exercise is answered, the diagram its sound was played from: named, drawn, and played again, each position lighting up while it sounds.',
      },
    },
  },
} satisfies Meta<typeof WhatYouHeard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
