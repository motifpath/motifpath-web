import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import ProgressionRemoveDialog from './ProgressionRemoveDialog.vue'

const meta = {
  title: 'Admin/ProgressionRemoveDialog',
  component: ProgressionRemoveDialog,
  args: {
    open: true,
    name: 'I–♭VII–IV–I',
    step: 'confirm',
    uses: [],
    deleting: false,
    deleteFailed: false,
    onClose: fn(),
    onRemove: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof ProgressionRemoveDialog>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const NoChartUsesIt: Story = {
  play: async ({ args }) => {
    await expect(await body.findByRole('dialog', { name: 'Remove I–♭VII–IV–I?' })).toBeVisible()
    await userEvent.click(body.getByRole('button', { name: 'Remove' }))
    await expect(args.onRemove).toHaveBeenCalledOnce()
  },
}

export const ChartsStillUseIt: Story = {
  args: {
    step: 'in_use',
    uses: [
      { song_chart_id: 'c1', title: 'Amazing Grace', revision: 'draft', section_index: 0, section_label: 'Verse 1' },
      { song_chart_id: 'c2', title: 'Home on the Range', revision: 'published', section_index: 2, section_label: 'Chorus' },
    ],
  },
  play: async ({ args }) => {
    await expect(await body.findByRole('button', { name: 'Remove' })).toBeDisabled()
    await expect(body.getByText(/Amazing Grace · Verse 1/)).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await expect(args.onClose).toHaveBeenCalled()
  },
}

export const Checking: Story = { args: { step: 'checking' } }

export const ReachedTheDrills: Story = { args: { step: 'in_drills' } }

export const CouldNotCheck: Story = {
  args: { step: 'check_failed' },
  play: async ({ args }) => {
    await userEvent.click(await body.findByRole('button', { name: 'Try again' }))
    await expect(args.onRetry).toHaveBeenCalledOnce()
    await expect(args.onRemove).not.toHaveBeenCalled()
  },
}

export const DeleteFailed: Story = { args: { deleteFailed: true } }

export const Deleting: Story = { args: { deleting: true } }
