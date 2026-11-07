import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type { components } from '@/api/generated/core-domain'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { endpoints } from '@/shared/testUtils/msw/handlers'

import ProgressionListView from './ProgressionListView.vue'

type Progression = components['schemas']['Progression']

const ANA = { user_id: 'u1', display_name: 'Ana Souza' }
const row = (key: string, name: string, over: Partial<Progression> = {}): Progression => ({
  progression_id: key,
  key,
  mode: 'major',
  bars: ['I', 'V', 'vi', 'IV'],
  borrowed_bars: [],
  in_drills: false,
  confusable: [],
  names: { en: name, 'pt-BR': name },
  song_chart_count: 0,
  created_by: ANA,
  created_at: new Date().toISOString(),
  ...over,
})

const POP = row('I-V-vi-IV', 'I–V–vi–IV (pop)', { in_drills: true, created_by: null, created_at: null, song_chart_count: 3 })
const BLUES = row('12-bar-quick', '12-bar blues, quick change', { in_drills: true, created_by: null, created_at: null, bars: Array.from({ length: 12 }, () => 'I') })
const TAGGED = row('major-tagged', 'I–♭VII–IV–I', { song_chart_count: 2 })
const MINOR = row('minor-tagged', 'i–♭VI–♭III–♭VII', { mode: 'minor', song_chart_count: 1, created_at: '2026-11-02T12:00:00Z' })
const UNUSED = row('major-unused', 'I–IV–I–V')

const USES = [
  { song_chart_id: 'c1', title: 'Amazing Grace', revision: 'draft', section_index: 0, section_label: 'Verse 1' },
  { song_chart_id: 'c2', title: 'Home on the Range', revision: 'published', section_index: 2, section_label: 'Chorus' },
]

let listed: Progression[] = []
let deletesAsked: string[] = []

const handlers = {
  progressions: http.get(endpoints.progressions, () => HttpResponse.json(listed)),
  progressionUses: http.get(`${endpoints.progressions}/:id`, ({ params }) => HttpResponse.json(params.id === TAGGED.progression_id ? USES : [])),
  deleteProgression: http.delete(`${endpoints.progressions}/:id`, ({ params }) => {
    deletesAsked.push(String(params.id))
    if (params.id === TAGGED.progression_id) return HttpResponse.json({ message: 'in use', reason: 'in_use', uses: USES }, { status: 409 })
    listed = listed.filter((p) => p.progression_id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
}

const meta = {
  title: 'Admin/ProgressionListView',
  component: ProgressionListView,
  parameters: { msw: { handlers } },
  beforeEach: () => {
    clearProgressionCatalog()
    listed = [POP, BLUES, TAGGED, MINOR, UNUSED]
    deletesAsked = []
    return clearProgressionCatalog
  },
} satisfies Meta<typeof ProgressionListView>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

async function chooseRemove(canvasElement: HTMLElement, name: string) {
  await userEvent.click(await within(canvasElement).findByRole('button', { name: `More for ${name}` }))
  await userEvent.click(await body.findByRole('button', { name: 'Remove' }))
}

export const List: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('I–♭VII–IV–I')).toBeVisible()
  },
}

export const ChartOnlyFilter: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('I–♭VII–IV–I')
    await userEvent.click(canvas.getByRole('button', { name: 'Chart only' }))
    await expect(canvas.queryByText('I–V–vi–IV (pop)')).toBeNull()
    await expect(canvas.getByText('I–IV–I–V')).toBeVisible()
  },
}

/** A progression a chart uses: the dialog reads the sections, and asks for no delete. */
export const RemoveBlocked: Story = {
  play: async ({ canvasElement }) => {
    await chooseRemove(canvasElement, 'I–♭VII–IV–I')
    await expect(await body.findByText(/Amazing Grace · Verse 1/)).toBeVisible()
    await expect(body.getByRole('button', { name: 'Remove' })).toBeDisabled()
    await expect(deletesAsked).toEqual([])
    await expect(body.getByRole('button', { name: 'Close' })).toHaveFocus()

    await userEvent.click(body.getByRole('button', { name: 'Close' }))
    await expect(within(canvasElement).getByText('I–♭VII–IV–I')).toBeVisible()
  },
}

/** Counted as tagged, but its last tag went since the list was read: it asks, and deletes nothing. */
export const RemoveAfterLastTagWent: Story = {
  play: async ({ canvasElement }) => {
    await chooseRemove(canvasElement, 'i–♭VI–♭III–♭VII')
    await expect(await body.findByText(/No chart uses it/)).toBeVisible()
    await expect(deletesAsked).toEqual([])
    await expect(within(canvasElement).getByText('i–♭VI–♭III–♭VII')).toBeVisible()
  },
}

/** A progression no chart uses: nothing goes until confirmed, then it leaves the list. */
export const RemoveConfirmed: Story = {
  play: async ({ canvasElement }) => {
    await chooseRemove(canvasElement, 'I–IV–I–V')
    await expect(await body.findByText(/No chart uses it/)).toBeVisible()
    await expect(listed.map((p) => p.progression_id)).toContain(UNUSED.progression_id)

    await userEvent.click(body.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(within(canvasElement).queryByText('I–IV–I–V')).toBeNull())
    await expect(body.queryByRole('dialog')).toBeNull()
  },
}
