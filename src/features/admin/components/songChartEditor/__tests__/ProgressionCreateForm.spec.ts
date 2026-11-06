import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

enableAutoUnmount(afterEach)

const GET = vi.fn()
const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST }, eventApi: {} }),
}))

import type { components } from '@/api/generated/core-domain'
import ProgressionCreateForm from '@/features/admin/components/songChartEditor/ProgressionCreateForm.vue'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { useToast } from '@/shared/composables/useToast'
import { mockViewport } from '@/shared/testUtils/viewport'

type Progression = components['schemas']['Progression']

const progression = (key: string, en: string, bars: string[], fields: Partial<Progression> = {}): Progression => ({
  progression_id: key,
  key,
  mode: 'major',
  bars,
  borrowed_bars: [],
  in_drills: true,
  confusable: [],
  names: { en },
  song_chart_count: 0,
  created_by: null,
  created_at: null,
  ...fields,
})
const POP = progression('I-V-vi-IV', 'I–V–vi–IV (pop)', ['I', 'V', 'vi', 'IV'])
const CREATED = progression('major/I-bVII-IV-I', 'I–♭VII–IV–I', ['I', '♭VII', 'IV', 'I'], { in_drills: false, borrowed_bars: [1] })

const NODE = { node_id: 'n1', key: 'chords', name: 'Chord progressions', names: { en: 'Chord progressions' }, parent_id: null, instrument_ids: [] }

function serve() {
  GET.mockImplementation((path: string) => {
    if (path === '/progressions') return Promise.resolve({ data: [POP, CREATED] })
    return Promise.resolve({ data: [NODE] })
  })
}

function mountForm(numerals = '', chartKey: string | null = 'G') {
  return mount(ProgressionCreateForm, {
    props: { open: true, progressions: [POP], chartKey, sectionName: 'Verse 1', numerals },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })
}

type Form = ReturnType<typeof mountForm>
const numerals = (w: Form) => w.get('[data-test="progression-numerals"] input')
const submit = (w: Form) => w.get('[data-test="progression-submit"]')
const drills = (w: Form) => w.get('[data-test="use-in-drills"] [role="switch"]')
const chips = (w: Form) => w.findAll('[data-test="numeral-chip"]')
const reading = (w: Form) => w.get('[data-test="progression-reading"]').text()

beforeEach(() => {
  GET.mockReset()
  POST.mockReset()
  clearProgressionCatalog()
  useToast().clear()
  mockViewport(1280)
  serve()
})

describe('ProgressionCreateForm', () => {
  it('starts from the search, major and chart only', () => {
    const w = mountForm('I bVII IV I')

    expect(w.get('[role="dialog"]').text()).toContain('New progression')
    expect(w.get('[data-test="mode-major"]').attributes('aria-pressed')).toBe('true')
    expect(numerals(w).element).toHaveProperty('value', 'I bVII IV I')
    expect(drills(w).attributes('aria-checked')).toBe('false')
    expect(w.get('[data-test="use-in-drills"]').text()).toContain('Off: chart only. You can add it to the drills later in Admin › Progressions.')
  })

  it('counts the bars, spells them in the chart’s key and marks a borrowed chord', async () => {
    const w = mountForm()

    await numerals(w).setValue('I bVII IV I')

    expect(w.get('[data-test="bar-count"]').text()).toBe('4 bars')
    expect(chips(w).map((c) => [c.text(), c.attributes('data-kind')])).toEqual([
      ['I', 'plain'],
      ['♭VII', 'borrowed'],
      ['IV', 'plain'],
      ['I', 'plain'],
    ])
    expect(reading(w)).toBe('In G, this chart’s key: G – F – C – G. ♭VII is borrowed: it isn’t in G major, and that’s fine.')
    expect(submit(w).text()).toBe('Create and tag Verse 1')
    expect(submit(w).attributes('disabled')).toBeUndefined()
  })

  it('reads a minor progression in the chart’s relative key', async () => {
    const w = mountForm()

    await w.get('[data-test="mode-minor"]').trigger('click')
    await numerals(w).setValue('i bVI bII V')

    expect(reading(w)).toBe('In E minor: Em – C – F – B. ♭II is borrowed: it isn’t in E minor, the relative key of this chart’s G, and that’s fine.')
  })

  it('names the relative key when nothing is borrowed', async () => {
    const w = mountForm()

    await w.get('[data-test="mode-minor"]').trigger('click')
    await numerals(w).setValue('i iv V i')

    expect(reading(w)).toBe('In E minor, the relative key of this chart’s G: Em – Am – B – Em.')
  })

  it('reads borrowed chords with no key at all when the chart has none', async () => {
    const w = mountForm('I bVII bIII I', null)

    expect(reading(w)).toBe('♭VII and ♭III are borrowed: they aren’t in the major scale, and that’s fine.')
  })

  it('makes input that isn’t a chord an error on its numeral, and refuses to create', async () => {
    const w = mountForm()

    await w.get('[data-test="mode-minor"]').trigger('click')
    await numerals(w).setValue('i bVI bII Vx')

    expect(w.get('[data-test="text-field-error"]').text()).toContain('“Vx” isn’t a chord.')
    expect(chips(w)[3]?.attributes('data-kind')).toBe('error')
    expect(reading(w)).toBe('♭II is borrowed: it isn’t in E minor, the relative key of this chart’s G, and that’s fine. It plays in E minor once every bar is valid.')
    expect(submit(w).attributes('disabled')).toBeDefined()
  })

  it('refuses more bars than a progression can have', async () => {
    const w = mountForm()

    await numerals(w).setValue(Array(17).fill('I').join(' '))

    expect(w.get('[data-test="text-field-error"]').text()).toBe('A progression has at most 16 bars.')
    expect(submit(w).attributes('disabled')).toBeDefined()
  })

  it('needs a numeral before it can create', () => {
    expect(submit(mountForm()).attributes('disabled')).toBeDefined()
  })

  it('offers to tag a progression that already has these numerals', async () => {
    const w = mountForm('I V vi IV')
    await flushPromises()

    expect(w.get('[data-test="progression-exists"]').text()).toContain('Already a progression')
    expect(w.get('[data-test="progression-exists"]').text()).toContain('These numerals are I–V–vi–IV (pop).')
    expect(submit(w).text()).toBe('Tag I–V–vi–IV (pop)')

    await submit(w).trigger('click')

    expect(POST).not.toHaveBeenCalled()
    expect(w.emitted('tag')).toEqual([[POP.key]])
  })

  it('creates chart only, sends only the nicknames written, tags at once and says so', async () => {
    POST.mockResolvedValue({ data: CREATED, response: { status: 201 } })
    const w = mountForm('I bVII IV I')

    await w.get('[data-test="nickname-en"] input').setValue(' Rock ')
    await submit(w).trigger('click')
    await flushPromises()

    expect(POST).toHaveBeenCalledWith('/progressions', {
      body: { mode: 'major', bars: ['I', '♭VII', 'IV', 'I'], nicknames: { en: 'Rock' }, in_drills: false },
    })
    expect(w.emitted('tag')).toEqual([[CREATED.key]])
    expect(useToast().toasts.value[0]?.message).toBe('Created I–♭VII–IV–I and tagged Verse 1')
  })

  it('asks for skills and concepts with the switch on, and sends them', async () => {
    POST.mockResolvedValue({ data: CREATED, response: { status: 201 } })
    const w = mountForm('I bVII IV I')

    await drills(w).trigger('click')
    await flushPromises()

    expect(w.get('[data-test="use-in-drills"]').text()).toContain('On: learners practising one of these skills or concepts meet it in harmony, hear, play-along and guide-tone drills.')
    expect(w.find('[data-test="progression-classification"]').exists()).toBe(true)
    expect(submit(w).attributes('disabled')).toBeDefined()

    w.getComponent({ name: 'ProgressionDrillFields' }).vm.$emit('update:conceptIds', ['n1'])
    await flushPromises()
    expect(submit(w).attributes('disabled')).toBeUndefined()

    await submit(w).trigger('click')
    await flushPromises()

    expect(POST).toHaveBeenCalledWith('/progressions', {
      body: { mode: 'major', bars: ['I', '♭VII', 'IV', 'I'], in_drills: true, skill_ids: [], concept_ids: ['n1'] },
    })
  })

  it('doesn’t load the knowledge map until the switch is on', () => {
    mountForm('I bVII IV I')

    expect(GET).not.toHaveBeenCalled()
  })

  it.each([
    ['a minor progression', 'minor', 'i iv V i', 'Drills don’t use minor keys yet, so it stays chart only.'],
    ['a bar count drills don’t ask', 'major', 'I IV V', 'Drills ask only 4- and 12-bar progressions, so it stays chart only.'],
  ])('disables the switch for %s and says why', async (_name, mode, typed, why) => {
    const w = mountForm()

    await w.get(`[data-test="mode-${mode}"]`).trigger('click')
    await numerals(w).setValue(typed)

    expect(drills(w).attributes('disabled')).toBeDefined()
    expect(w.get('[data-test="use-in-drills"]').text()).toContain(why)
  })

  it('turns the switch back off when the progression stops suiting the drills', async () => {
    POST.mockResolvedValue({ data: CREATED, response: { status: 201 } })
    const w = mountForm('I bVII IV I')

    await drills(w).trigger('click')
    await w.get('[data-test="mode-minor"]').trigger('click')
    expect(drills(w).attributes('aria-checked')).toBe('false')

    await submit(w).trigger('click')
    await flushPromises()
    expect(POST.mock.calls[0]?.[1].body.in_drills).toBe(false)
  })

  it('offers the existing progression when someone else created it first', async () => {
    POST.mockResolvedValue({ error: { message: 'exists', progression: CREATED }, response: { status: 409 } })
    const w = mountForm('I bVII IV I')

    await submit(w).trigger('click')
    await flushPromises()

    expect(w.emitted('tag')).toBeUndefined()
    expect(w.get('[data-test="progression-exists"]').text()).toContain('These numerals are I–♭VII–IV–I.')
    expect(submit(w).text()).toBe('Tag I–♭VII–IV–I')
  })

  it('says why the drills refused, and tags nothing', async () => {
    POST.mockResolvedValue({ error: { message: 'no', reasons: ['no_other_drill_progression'] }, response: { status: 409 } })
    const w = mountForm('I bVII IV I')

    await drills(w).trigger('click')
    w.getComponent({ name: 'ProgressionDrillFields' }).vm.$emit('update:conceptIds', ['n1'])
    await flushPromises()
    await submit(w).trigger('click')
    await flushPromises()

    expect(w.get('[data-test="progression-create-error"]').text()).toBe('No other progression in the drills has this many bars, so they have no wrong answer to offer. Turn off “Use in drills” to create it for charts only.')
    expect(w.emitted('tag')).toBeUndefined()
  })

  it('says when creating failed, keeps what was typed, and lets it be tried again', async () => {
    POST.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 500 } })
    const w = mountForm('I bVII IV I')

    await submit(w).trigger('click')
    await flushPromises()

    expect(w.get('[data-test="progression-create-error"]').text()).toBe('The progression couldn’t be created. Try again.')
    expect(numerals(w).element).toHaveProperty('value', 'I bVII IV I')
    expect(submit(w).attributes('disabled')).toBeUndefined()
  })

  it('starts afresh each time it opens', async () => {
    const w = mountForm('I bVII IV I')
    await w.get('[data-test="mode-minor"]').trigger('click')

    await w.setProps({ open: false })
    await w.setProps({ open: true, numerals: 'I IV' })

    expect(w.get('[data-test="mode-major"]').attributes('aria-pressed')).toBe('true')
    expect(numerals(w).element).toHaveProperty('value', 'I IV')
  })

  it('closes on Cancel', async () => {
    const w = mountForm()

    await w.get('[data-test="progression-cancel"]').trigger('click')

    expect(w.emitted('close')).toHaveLength(1)
  })

  it('fills the screen on a phone, with its action at the bottom', () => {
    mockViewport(390)

    expect(mountForm().get('[data-test="overlay-sheet"]').classes()).toContain('h-dvh')
  })
})
