import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type { components } from '@/api/generated/core-domain'

import ProgressionCreateForm from './ProgressionCreateForm.vue'

const POP: components['schemas']['Progression'] = {
  progression_id: 'p1',
  key: 'I-V-vi-IV',
  mode: 'major',
  bars: ['I', 'V', 'vi', 'IV'],
  borrowed_bars: [],
  in_drills: true,
  confusable: [],
  names: { en: 'I–V–vi–IV (pop)', 'pt-BR': 'I–V–vi–IV (pop)' },
  song_chart_count: 0,
  created_by: null,
  created_at: null,
}

const meta = {
  title: 'Song charts/ProgressionCreateForm',
  component: ProgressionCreateForm,
  args: { open: true, progressions: [POP], chartKey: 'G', sectionName: 'Verse 1', numerals: 'I bVII IV I' },
} satisfies Meta<typeof ProgressionCreateForm>

export default meta
type Story = StoryObj<typeof meta>

const body = () => within(document.body)

/** The first element matching, once there is one. */
const found = (selector: string) =>
  waitFor(() => {
    const element = document.querySelector(selector)
    if (!(element instanceof HTMLElement)) throw new Error(`No ${selector} yet`)
    return element
  })

/** 9c: chart only, with the borrowed chord marked. */
export const ChartOnly: Story = {}

/** 9d: the switch on asks for the skills and concepts; each picker's tree opens over the form, and Escape closes only the tree. */
export const UseInDrills: Story = {
  play: async () => {
    const submit = body().getByRole('button', { name: 'Create and tag Verse 1' })
    await userEvent.click(body().getByRole('switch'))
    await expect(body().getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    await expect(submit).toBeDisabled()

    await userEvent.click(await found('[data-test="tree-open-picker"]'))
    await userEvent.click(await found('[data-test="tree-node-checkbox"]'))
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(document.querySelector('[data-test="tree-node-checkbox"]')).toBeNull())
    await expect(body().getByText('New progression')).toBeInTheDocument()
    await expect(document.querySelector('[data-test="tree-selected-chip"]')).not.toBeNull()
    await expect(submit).toBeEnabled()
  },
}

/** 9e: a typo is an error, and a minor progression can't use the drills. */
export const BorrowedAndError: Story = {
  args: { numerals: 'i bVI bII Vx' },
  play: async () => {
    await userEvent.click(body().getByRole('button', { name: 'Minor' }))
    await expect(body().getByRole('switch')).toBeDisabled()
  },
}

/** A key with sharps: its chords are spelled from it, G#m and C#m rather than Abm and Dbm. */
export const SharpKey: Story = { args: { chartKey: 'E', numerals: 'I iii vi V' } }

/** 9f: the same numerals offer to tag the one that exists. */
export const AlreadyExists: Story = { args: { numerals: 'I V vi IV' } }

export const NoChartKey: Story = { args: { chartKey: null, numerals: 'I bVII bIII I' } }

/** 9m: the same form fills the phone, its action at the bottom. */
export const Phone: Story = { globals: { viewport: { value: 'compact' } } }

export const DarkPortuguese: Story = { globals: { theme: 'dark', locale: 'pt-BR' } }
