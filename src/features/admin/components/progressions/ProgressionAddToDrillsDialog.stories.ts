import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import ProgressionAddToDrillsDialog from './ProgressionAddToDrillsDialog.vue'

const meta = {
  title: 'Admin/ProgressionAddToDrillsDialog',
  globals: { viewport: { value: 'expanded' } },
  component: ProgressionAddToDrillsDialog,
  args: {
    open: true,
    name: 'I–♭VII–IV–I',
    meta: 'Major · 4 bars · tagged in 2 charts',
    blocked: null,
    reasons: [],
    picked: false,
    adding: false,
    failed: false,
    skillIds: [],
    conceptIds: [],
    onClose: fn(),
    onAdd: fn(),
  },
} satisfies Meta<typeof ProgressionAddToDrillsDialog>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** Nothing picked yet, so there is nothing to add. */
export const NothingPicked: Story = {
  play: async () => {
    await expect(await body.findByRole('dialog', { name: 'Add I–♭VII–IV–I to the drills' })).toBeVisible()
    await expect(body.getByRole('button', { name: 'Add to drills' })).toBeDisabled()
  },
}

/** 9k: a concept picked, ready to add. */
export const Ready: Story = {
  args: { picked: true, conceptIds: ['concept-pentatonic'] },
  play: async ({ args }) => {
    await userEvent.click(await body.findByRole('button', { name: 'Add to drills' }))
    await expect(args.onAdd).toHaveBeenCalledOnce()
  },
}

/** As in 9e: the drills can't take a minor progression yet, so Add stays disabled and says why. */
export const Minor: Story = {
  args: { name: 'i–♭VI–♭III–♭VII', meta: 'Minor · 4 bars · tagged in 1 chart', blocked: 'minor', picked: true, conceptIds: ['concept-pentatonic'] },
  play: async () => {
    await expect(await body.findByText('Drills don’t use minor keys yet.')).toBeVisible()
    await expect(body.getByRole('button', { name: 'Add to drills' })).toBeDisabled()
  },
}

export const BarsTheDrillsDontAsk: Story = {
  args: { name: 'I–V–vi–iii–IV–I–IV–V', meta: 'Major · 8 bars · tagged in 1 chart', blocked: 'bars' },
}

export const Refused: Story = { args: { picked: true, conceptIds: ['concept-pentatonic'], reasons: ['no_other_drill_progression'] } }

export const Failed: Story = { args: { picked: true, conceptIds: ['concept-pentatonic'], failed: true } }

export const Adding: Story = { args: { picked: true, conceptIds: ['concept-pentatonic'], adding: true } }

/** A sheet on a phone, its actions stacked. */
export const Phone: Story = { args: { picked: true, conceptIds: ['concept-pentatonic'] }, globals: { viewport: { value: 'compact' } } }

export const DarkPortuguese: Story = { args: { picked: true, conceptIds: ['concept-pentatonic'] }, globals: { theme: 'dark', locale: 'pt-BR' } }
