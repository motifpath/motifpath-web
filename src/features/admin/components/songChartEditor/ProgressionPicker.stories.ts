import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import type { components } from '@/api/generated/core-domain'

import ProgressionPicker from './ProgressionPicker.vue'

type Progression = components['schemas']['Progression']

const progression = (key: string, en: string, in_drills = true): Progression => ({
  progression_id: key,
  key,
  mode: 'major',
  bars: [],
  borrowed_bars: [],
  in_drills,
  confusable: [],
  names: { en, 'pt-BR': en },
  song_chart_count: 0,
  created_by: null,
  created_at: null,
})

const meta = {
  title: 'Song charts/ProgressionPicker',
  component: ProgressionPicker,
  args: {
    progressions: [progression('ii-V-I', 'ii–V–I'), progression('IV-V-I', 'IV–V–I'), progression('major/I-bVII-IV', 'I–♭VII–IV', false)],
    tagged: ['ii-V-I'],
  },
  decorators: [() => ({ template: '<div class="w-80 rounded-2xl border border-border bg-surface-raised p-2"><story /></div>' })],
} satisfies Meta<typeof ProgressionPicker>

export default meta
type Story = StoryObj<typeof meta>

/** 9a: a progression the drills don't use is marked. */
export const ChartOnlyMark: Story = {}

/** 9b: a search that finds nothing offers to create it, read as numerals. */
export const NothingFound: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('searchbox'), 'I bVII IV I')
    await expect(canvas.getByRole('button', { name: /I–♭VII–IV–I/ })).toBeInTheDocument()
  },
}

export const DarkPortuguese: Story = {
  ...NothingFound,
  globals: { theme: 'dark', locale: 'pt-BR' },
}
