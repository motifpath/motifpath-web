import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import ProgressionRow from './ProgressionRow.vue'

const meta = {
  title: 'Admin/ProgressionRow',
  globals: { viewport: { value: 'expanded' } },
  component: ProgressionRow,
  args: {
    name: 'I–♭VII–IV–I',
    meta: 'Major · 4 bars · created by Ana Souza, today · tagged in 2 charts',
    inDrills: false,
    onRemove: fn(),
    onAddToDrills: fn(),
  },
} satisfies Meta<typeof ProgressionRow>

export default meta
type Story = StoryObj<typeof meta>

export const ChartOnly: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Add to drills' }))
    await expect(args.onAddToDrills).toHaveBeenCalledOnce()
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'More for I–♭VII–IV–I' }))
    await userEvent.click(await within(document.body).findByRole('button', { name: 'Remove' }))
    await expect(args.onRemove).toHaveBeenCalledOnce()
  },
}

/** On a phone, Add to drills sits in the ⋮ sheet, above Remove. */
export const ChartOnlyPhone: Story = {
  args: { meta: 'Major · 4 bars · 2 charts' },
  globals: { viewport: { value: 'compact' } },
  play: async ({ args, canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Add to drills' })).toBeNull()
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'More for I–♭VII–IV–I' }))
    await userEvent.click(await within(document.body).findByRole('button', { name: 'Add to drills' }))
    await expect(args.onAddToDrills).toHaveBeenCalledOnce()
  },
}

export const InDrills: Story = {
  args: { name: 'I–V–vi–IV (pop)', meta: 'Major · 4 bars · catalog · tagged in 3 charts', inDrills: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull()
  },
}

export const LongName: Story = {
  args: { name: 'I–V–vi–iii–IV–I–IV–V–I–V–vi–iii–IV–I–IV–V', meta: 'Major · 16 bars · created by Ana Souza, 1 Nov · tagged in 1 chart' },
}
