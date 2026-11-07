import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type Progression = components['schemas']['Progression']
type ProgressionUse = components['schemas']['ProgressionUse']

const GET = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, DELETE }, eventApi: {} }),
}))
const isCompact = ref(false)
vi.mock('@/shared/composables/useSizeClass', () => ({
  useSizeClass: () => ({ isCompact, sizeClass: ref('expanded') }),
}))
const success = vi.fn()
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => ({ success, error: vi.fn(), neutral: vi.fn(), toasts: ref([]) }),
}))

import ProgressionListView from '@/features/admin/views/ProgressionListView.vue'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

const TeachShellStub = { template: '<div><slot /></div>' }
const OverlayLayerStub = {
  props: ['open'],
  emits: ['close'],
  template: '<div v-if="open" data-test="layer"><slot /></div>',
}

const NOW = new Date()
const ANA = { user_id: 'u1', display_name: 'Ana Souza' }

function progression(over: Partial<Progression> & { key: string }): Progression {
  return {
    progression_id: over.key,
    mode: 'major',
    bars: ['I', 'V', 'vi', 'IV'],
    borrowed_bars: [],
    in_drills: false,
    confusable: [],
    names: { en: over.key },
    song_chart_count: 0,
    created_by: ANA,
    created_at: NOW.toISOString(),
    ...over,
  }
}

const POP = progression({ key: 'I-V-vi-IV', names: { en: 'I–V–vi–IV (pop)' }, in_drills: true, created_by: null, created_at: null, song_chart_count: 3 })
const BLUES = progression({ key: '12-bar-blues', names: { en: '12-bar blues' }, in_drills: true, created_by: null, created_at: null, bars: Array.from({ length: 12 }, () => 'I') })
const TAGGED = progression({ key: 'major/I-bVII-IV-I', names: { en: 'I–♭VII–IV–I' }, bars: ['I', '♭VII', 'IV', 'I'], song_chart_count: 2 })
const ONE_CHART = progression({ key: 'minor/i-bVI-bIII-bVII', names: { en: 'i–♭VI–♭III–♭VII' }, mode: 'minor', bars: ['i', '♭VI', '♭III', '♭VII'], song_chart_count: 1, created_at: '2026-03-02T12:00:00Z' })
const UNUSED = progression({ key: 'major/I-IV-I-V', names: { en: 'I–IV–I–V' }, bars: ['I', 'IV', 'I', 'V'] })

const USES: ProgressionUse[] = [
  { song_chart_id: 'c1', title: 'Amazing Grace', revision: 'draft', section_index: 0, section_label: 'Verse 1' },
  { song_chart_id: 'c2', title: 'Home on the Range', revision: 'published', section_index: 2, section_label: null },
]

const listed = (list: Progression[]) => Promise.resolve({ data: list, error: undefined, response: { status: 200 } })
const removed = () => Promise.resolve({ data: undefined, error: undefined, response: { status: 204 } })
const refused = (status: number, error: unknown) => Promise.resolve({ data: undefined, error, response: { status } })

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
  })
  const wrapper = mount(ProgressionListView, {
    global: { plugins: [router], stubs: { TeachShell: TeachShellStub, OverlayLayer: OverlayLayerStub } },
  })
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountView>>

const rows = (w: Wrapper) => w.findAll('[data-test="progression-row"]')
const rowOf = (w: Wrapper, name: string) => {
  const row = rows(w).find((r) => r.find('[data-test="progression-row-name"]').text() === name)
  if (!row) throw new Error(`no row named ${name}`)
  return row
}
const names = (w: Wrapper) => rows(w).map((r) => r.find('[data-test="progression-row-name"]').text())
const dialogRemove = (w: Wrapper) => w.find('[data-test="remove-confirm"]')

async function chooseRemove(w: Wrapper, name: string) {
  await rowOf(w, name).find('[data-test="progression-row-menu"]').trigger('click')
  await rowOf(w, name).find('[data-test="progression-row-remove"]').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  GET.mockReset()
  DELETE.mockReset()
  success.mockReset()
  isCompact.value = false
  clearProgressionCatalog()
  GET.mockImplementation(() => listed([POP, BLUES, TAGGED, ONE_CHART, UNUSED]))
})

describe('ProgressionListView', () => {
  describe('the list', () => {
    it('says where each progression stands', async () => {
      const w = await mountView()

      expect(rowOf(w, 'I–♭VII–IV–I').find('[data-test="progression-row-meta"]').text()).toBe('Major · 4 bars · created by Ana Souza, today · tagged in 2 charts')
      expect(rowOf(w, 'I–V–vi–IV (pop)').find('[data-test="progression-row-meta"]').text()).toBe('Major · 4 bars · catalog · tagged in 3 charts')
      expect(rowOf(w, '12-bar blues').find('[data-test="progression-row-meta"]').text()).toBe('Major · 12 bars · catalog')
      expect(rowOf(w, 'I–IV–I–V').find('[data-test="progression-row-meta"]').text()).toContain('not tagged in any chart')
      expect(rowOf(w, 'i–♭VI–♭III–♭VII').find('[data-test="progression-row-meta"]').text()).toMatch(/^Minor · 4 bars · created by Ana Souza, .* · tagged in 1 chart$/)
    })

    it('shortens the line on a phone', async () => {
      isCompact.value = true
      const w = await mountView()

      expect(rowOf(w, 'I–♭VII–IV–I').find('[data-test="progression-row-meta"]').text()).toBe('Major · 4 bars · 2 charts')
      expect(rowOf(w, 'i–♭VI–♭III–♭VII').find('[data-test="progression-row-meta"]').text()).toBe('Minor · 4 bars · 1 chart')
      expect(rowOf(w, 'I–IV–I–V').find('[data-test="progression-row-meta"]').text()).toBe('Major · 4 bars · not tagged')
      expect(rowOf(w, 'I–V–vi–IV (pop)').find('[data-test="progression-row-meta"]').text()).toBe('Major · 4 bars · catalog')
    })

    it('marks each row, and offers Remove only on a chart-only progression', async () => {
      const w = await mountView()

      expect(rowOf(w, 'I–V–vi–IV (pop)').find('[data-test="progression-row-status"]').text()).toBe('In drills')
      expect(rowOf(w, 'I–V–vi–IV (pop)').find('[data-test="progression-row-menu"]').exists()).toBe(false)
      expect(rowOf(w, 'I–IV–I–V').find('[data-test="progression-row-status"]').text()).toBe('Chart only')
      expect(rowOf(w, 'I–IV–I–V').find('[data-test="progression-row-menu"]').exists()).toBe(true)
    })

    it('lists a progression added to the drills as in drills, with its creator and no Remove', async () => {
      const added = progression({ key: 'major/I-iii-IV-V', names: { en: 'I–iii–IV–V' }, in_drills: true })
      GET.mockImplementation(() => listed([added]))
      const w = await mountView()

      const row = rowOf(w, 'I–iii–IV–V')
      expect(row.find('[data-test="progression-row-meta"]').text()).toContain('created by Ana Souza')
      expect(row.find('[data-test="progression-row-status"]').text()).toBe('In drills')
      expect(row.find('[data-test="progression-row-menu"]').exists()).toBe(false)
    })

    it('puts the drills first, whatever order they arrive in', async () => {
      GET.mockImplementation(() => listed([UNUSED, POP, TAGGED, BLUES]))
      const w = await mountView()

      expect(names(w)).toEqual(['I–V–vi–IV (pop)', '12-bar blues', 'I–IV–I–V', 'I–♭VII–IV–I'])
    })

    it('counts what it shows', async () => {
      const w = await mountView()
      expect(w.find('[data-test="progression-count"]').text()).toBe('5 progressions · created ones are tagged from the song chart picker')

      await w.find('[data-test="filter-chart-only"]').trigger('click')
      expect(w.find('[data-test="progression-count"]').text()).toContain('3 progressions')
    })

    it('filters by where a progression stands', async () => {
      const w = await mountView()

      await w.find('[data-test="filter-in-drills"]').trigger('click')
      expect(names(w)).toEqual(['I–V–vi–IV (pop)', '12-bar blues'])

      await w.find('[data-test="filter-chart-only"]').trigger('click')
      expect(names(w)).toEqual(['I–♭VII–IV–I', 'i–♭VI–♭III–♭VII', 'I–IV–I–V'])

      await w.find('[data-test="filter-all"]').trigger('click')
      expect(names(w)).toHaveLength(5)
    })

    it('finds a progression by its name or by numerals typed plainly', async () => {
      const w = await mountView()

      await w.find('input[type="search"]').setValue('blues')
      expect(names(w)).toEqual(['12-bar blues'])

      await w.find('input[type="search"]').setValue('I bVII IV')
      expect(names(w)).toEqual(['I–♭VII–IV–I'])
    })

    it('says so when nothing matches, and clears the search', async () => {
      const w = await mountView()

      await w.find('input[type="search"]').setValue('zzz')
      expect(rows(w)).toHaveLength(0)
      expect(w.find('[data-test="no-matches"]').exists()).toBe(true)

      await w.find('[data-test="clear-search"]').trigger('click')
      expect(rows(w)).toHaveLength(5)
    })

    it('asks again on opening, so a tag untagged elsewhere counts', async () => {
      await mountView()
      expect(GET).toHaveBeenCalledTimes(1)

      GET.mockImplementation(() => listed([{ ...TAGGED, song_chart_count: 0 }]))
      const again = await mountView()

      expect(rowOf(again, 'I–♭VII–IV–I').find('[data-test="progression-row-meta"]').text()).toContain('not tagged in any chart')
    })

    it('offers to try again when the list can\'t load', async () => {
      GET.mockImplementationOnce(() => refused(500, { message: 'boom' }))
      const w = await mountView()

      expect(w.find('[data-test="error"]').exists()).toBe(true)
      expect(rows(w)).toHaveLength(0)

      await w.find('[data-test="error"] button').trigger('click')
      await flushPromises()
      expect(w.find('[data-test="error"]').exists()).toBe(false)
      expect(rows(w)).toHaveLength(5)
    })

    it('shows it is loading until the list arrives', async () => {
      GET.mockImplementation(() => new Promise(() => {}))
      const w = await mountView()

      expect(w.find('[data-test="loading"]').exists()).toBe(true)
    })
  })

  describe('removing a progression no chart uses', () => {
    it('asks first and deletes nothing until confirmed', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–IV–I–V')

      expect(w.find('[role="dialog"]').text()).toContain('Remove I–IV–I–V?')
      expect(w.find('[data-test="remove-dialog"]').text()).toContain('No chart uses it. It is deleted for every admin and leaves the picker.')
      expect(w.find('[data-test="remove-dialog"]').text()).toContain('The same numerals can be created again later.')
      expect(DELETE).not.toHaveBeenCalled()
    })

    it('deletes it on confirming, and it leaves the list', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–IV–I–V')
      GET.mockImplementation(() => listed([POP, BLUES, TAGGED, ONE_CHART]))
      DELETE.mockImplementation(removed)

      await dialogRemove(w).trigger('click')
      await flushPromises()

      expect(DELETE).toHaveBeenCalledWith('/progressions/{progression_id}', { params: { path: { progression_id: UNUSED.progression_id } } })
      expect(names(w)).not.toContain('I–IV–I–V')
      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(false)
      expect(success).toHaveBeenCalledWith('I–IV–I–V removed')
    })

    it('Cancel deletes nothing', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–IV–I–V')

      await w.find('[data-test="remove-cancel"]').trigger('click')

      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(false)
      expect(DELETE).not.toHaveBeenCalled()
    })

    it('stays open with a reason when deleting fails, and can be tried again', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–IV–I–V')
      DELETE.mockImplementationOnce(() => refused(500, { message: 'boom' }))

      await dialogRemove(w).trigger('click')
      await flushPromises()

      expect(w.find('[data-test="remove-error"]').exists()).toBe(true)
      expect(names(w)).toContain('I–IV–I–V')

      DELETE.mockImplementationOnce(removed)
      await dialogRemove(w).trigger('click')
      await flushPromises()
      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(false)
    })

    it('can\'t be closed while the delete runs', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–IV–I–V')
      DELETE.mockImplementation(() => new Promise(() => {}))

      await dialogRemove(w).trigger('click')
      await w.find('[data-test="remove-cancel"]').trigger('click')

      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(true)
    })

    it('shows the sections when a chart tagged it since the list was read', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–IV–I–V')
      DELETE.mockImplementation(() => refused(409, { message: 'in use', reason: 'in_use', uses: USES }))

      await dialogRemove(w).trigger('click')
      await flushPromises()

      expect(w.find('[data-test="remove-dialog"]').text()).toContain('It can’t be removed while a chart uses it.')
      expect(dialogRemove(w).attributes('disabled')).toBeDefined()
    })
  })

  describe('removing a progression a chart still uses', () => {
    beforeEach(() => {
      DELETE.mockImplementation(() => refused(409, { message: 'in use', reason: 'in_use', uses: USES }))
    })

    it('lists what to untag, with Remove disabled', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–♭VII–IV–I')

      const dialog = w.find('[data-test="remove-dialog"]')
      expect(dialog.text()).toContain('It can’t be removed while a chart uses it. Take it off these sections first, then come back to remove it.')
      const uses = w.findAll('[data-test="remove-use"]').map((li) => li.text())
      expect(uses).toEqual(['Amazing Grace · Verse 1 — in the draft: untag it and save', 'Home on the Range · Section 3 — in the published revision: untag it and publish'])
      expect(dialogRemove(w).attributes('disabled')).toBeDefined()
      expect(w.find('[data-test="remove-cancel"]').text()).toBe('Close')
    })

    it('never asks to delete a progression the fresh list says is untagged', async () => {
      const w = await mountView()
      GET.mockImplementation(() => listed([POP, BLUES, { ...TAGGED, song_chart_count: 0 }, ONE_CHART, UNUSED]))

      await chooseRemove(w, 'I–♭VII–IV–I')

      expect(DELETE).not.toHaveBeenCalled()
      expect(w.find('[data-test="remove-dialog"]').text()).toContain('No chart uses it.')
    })

    it('says it can\'t tell when the sections don\'t arrive', async () => {
      DELETE.mockImplementation(() => refused(500, { message: 'boom' }))
      const w = await mountView()
      await chooseRemove(w, 'I–♭VII–IV–I')

      expect(w.find('[data-test="remove-error"]').text()).toContain('Couldn’t check whether a chart uses it.')
      expect(dialogRemove(w).text()).toBe('Try again')
    })

    it('reports the removal when its last tag went just before asking for the sections', async () => {
      DELETE.mockImplementation(removed)
      const w = await mountView()
      await chooseRemove(w, 'I–♭VII–IV–I')

      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(false)
      expect(success).toHaveBeenCalledWith('I–♭VII–IV–I removed')
    })

    it('closes without the phone\'s Close: × is there, as the sheet shows', async () => {
      isCompact.value = true
      const w = await mountView()
      await chooseRemove(w, 'I–♭VII–IV–I')

      expect(w.find('[data-test="remove-cancel"]').exists()).toBe(false)
      expect(dialogRemove(w).exists()).toBe(true)
    })
  })

  describe('when the list has gone stale', () => {
    it('says so when it reached the drills meanwhile, and refreshes', async () => {
      const w = await mountView()
      GET.mockImplementation(() => listed([POP, BLUES, { ...UNUSED, in_drills: true }]))

      await chooseRemove(w, 'I–IV–I–V')

      expect(w.find('[data-test="remove-dialog"]').text()).toContain('It’s in the drills now')
      expect(dialogRemove(w).attributes('disabled')).toBeDefined()
      expect(DELETE).not.toHaveBeenCalled()
    })

    it('closes quietly when someone else removed it already', async () => {
      const w = await mountView()
      GET.mockImplementation(() => listed([POP, BLUES]))

      await chooseRemove(w, 'I–IV–I–V')

      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(false)
      expect(names(w)).toEqual(['I–V–vi–IV (pop)', '12-bar blues'])
      expect(DELETE).not.toHaveBeenCalled()
    })

    it('treats a delete that finds nothing as done', async () => {
      const w = await mountView()
      await chooseRemove(w, 'I–IV–I–V')
      GET.mockImplementation(() => listed([POP, BLUES]))
      DELETE.mockImplementation(() => refused(404, { message: 'gone' }))

      await dialogRemove(w).trigger('click')
      await flushPromises()

      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(false)
      expect(names(w)).not.toContain('I–IV–I–V')
      expect(success).not.toHaveBeenCalled()
    })

    it('offers to check again when it can\'t tell, and deletes nothing', async () => {
      const w = await mountView()
      GET.mockImplementationOnce(() => refused(500, { message: 'boom' }))

      await chooseRemove(w, 'I–IV–I–V')

      expect(w.find('[data-test="remove-error"]').exists()).toBe(true)
      expect(DELETE).not.toHaveBeenCalled()

      await dialogRemove(w).trigger('click')
      await flushPromises()

      expect(w.find('[data-test="remove-error"]').exists()).toBe(false)
      expect(w.find('[data-test="remove-dialog"]').text()).toContain('No chart uses it.')
      expect(DELETE).not.toHaveBeenCalled()
    })

    it('ignores a check that comes back after the dialog was closed', async () => {
      const w = await mountView()
      let answer: (value: unknown) => void = () => {}
      GET.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve }))

      await chooseRemove(w, 'I–♭VII–IV–I')
      await w.find('[data-test="remove-cancel"]').trigger('click')
      answer({ data: [TAGGED], error: undefined, response: { status: 200 } })
      await flushPromises()

      expect(DELETE).not.toHaveBeenCalled()
      expect(w.find('[data-test="remove-dialog"]').exists()).toBe(false)
    })
  })
})
