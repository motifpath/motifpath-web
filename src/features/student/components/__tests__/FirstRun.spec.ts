import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { i18n } from '@/i18n'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ accountName: computed(() => ({ firstName: 'Carla', lastName: 'Lima' })) }),
}))

import FirstRun from '@/features/student/components/FirstRun.vue'

const instruments = [
  { instrument_id: 'inst-acoustic', names: { en: 'Acoustic guitar' } },
  { instrument_id: 'inst-guitar', names: { en: 'Electric guitar' } },
  { instrument_id: 'inst-bass', names: { en: 'Electric bass' } },
]
const path = { learning_path_id: 'lp-1', title: 'Electric guitar from zero', level: 'beginner', language: 'en', lesson_count: 18 }
const course = { course_id: 'c-1', title: 'Electric guitar basics', level: 'beginner', language: 'en', checkpoint_count: 3, lesson_count: 12 }

interface Catalog {
  startingPoints?: unknown[] | 'fail' | 'hang'
  paths?: unknown[]
  courses?: unknown[]
}

function catalog({ startingPoints = [{ kind: 'path', path }, { kind: 'course', course }], paths = [], courses = [] }: Catalog = {}) {
  GET.mockImplementation(async (url: string) => {
    if (url === '/instruments') return { data: instruments, error: undefined, response: { status: 200 } }
    if (url === '/catalog/starting-points') {
      if (startingPoints === 'hang') return new Promise(() => {})
      return startingPoints === 'fail'
        ? { data: undefined, error: { message: 'boom' }, response: { status: 500 } }
        : { data: { source: 'curated', items: startingPoints }, error: undefined, response: { status: 200 } }
    }
    const items = url === '/catalog/paths' ? paths : courses
    return { data: { items, total: items.length, limit: 5, offset: 0 }, error: undefined, response: { status: 200 } }
  })
}

const blank = { template: '<div />' }

async function mountAt(path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: FirstRun },
      { path: '/paths', name: 'path-catalog', component: blank },
      { path: '/paths/:learningPathId', name: 'path-detail', component: blank },
      { path: '/courses/:courseId', name: 'course-detail', component: blank },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

function chip(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'], label: string) {
  const found = wrapper.findAll('button[aria-pressed]').find((button) => button.text() === label)
  if (!found) throw new Error(`no chip ${label}`)
  return found
}

describe('FirstRun', () => {
  beforeEach(() => {
    GET.mockReset()
    catalog()
    i18n.global.locale.value = 'en'
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '+55 11 91234-5678')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('the two questions', () => {
    it('welcomes the student by name and asks what they want to play and how much they have played it', async () => {
      const { wrapper } = await mountAt()

      expect(wrapper.get('h1').text()).toBe('Welcome, Carla')
      expect(wrapper.text()).toContain("Two quick questions and we'll show you where to start.")
      expect(wrapper.text()).toContain('What do you want to play?')
      expect(wrapper.text()).toContain('How much have you played it?')
    })

    it('offers every instrument, none chosen, with Never played chosen', async () => {
      const { wrapper } = await mountAt()

      for (const name of ['Acoustic guitar', 'Electric guitar', 'Electric bass']) {
        expect(chip(wrapper, name).attributes('aria-pressed')).toBe('false')
      }
      expect(chip(wrapper, 'Never played').attributes('aria-pressed')).toBe('true')
    })

    it('waits for an instrument before showing where to start', async () => {
      const { wrapper } = await mountAt()
      const show = wrapper.get('[data-test="show-where-to-start"]')

      expect(show.attributes('disabled')).toBeDefined()
      await chip(wrapper, 'Electric guitar').trigger('click')
      expect(show.attributes('disabled')).toBeUndefined()
    })

    it('puts the answers in the address, never anywhere else, and shows where to start', async () => {
      const { wrapper, router } = await mountAt()

      await chip(wrapper, 'Electric guitar').trigger('click')
      await chip(wrapper, 'I can play a bit').trigger('click')
      await wrapper.get('[data-test="show-where-to-start"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ instrument: 'inst-guitar', experience: 'plays_a_bit' })
      expect(wrapper.find('[data-test="where-to-start"]').exists()).toBe(true)
    })

    it('offers WhatsApp and Discover as quiet ways out', async () => {
      const { wrapper } = await mountAt()

      expect(wrapper.get('[data-test="first-run-whatsapp"]').text()).toBe('Not sure? Ask us on WhatsApp')
      expect(wrapper.get('[data-test="first-run-whatsapp"]').attributes('href')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=/)
      expect(wrapper.get('[data-test="first-run-discover"]').text()).toBe('Browse everything in Discover')
    })

    it('leaves WhatsApp out when this build has no concierge number', async () => {
      vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '')
      const { wrapper } = await mountAt()

      expect(wrapper.find('[data-test="first-run-whatsapp"]').exists()).toBe(false)
    })
  })

  describe('where to start', () => {
    const answered = '/?instrument=inst-guitar&experience=never_played'

    it('shows the answers, a count, and the starting points in their order', async () => {
      const { wrapper } = await mountAt(answered)

      expect(wrapper.get('[data-test="where-to-start-answers"]').text()).toContain('Electric guitar · Never played')
      expect(wrapper.get('[data-test="where-to-start-count"]').text()).toBe('1 path · 1 course')
      const rows = wrapper.findAll('[data-test="starting-point"]')
      expect(rows.map((row) => row.get('h3').text())).toEqual(['Electric guitar from zero', 'Electric guitar basics'])
      expect(rows[0].get('[data-test="starting-point-eyebrow"]').text()).toBe('Path · Beginner · English')
    })

    it('opens a path’s detail, which can lead back to these results', async () => {
      const { wrapper } = await mountAt(answered)

      const link = wrapper.findAll('[data-test="starting-point"]')[0]
      expect(link.attributes('href')).toBe('/paths/lp-1?startInstrument=inst-guitar&startExperience=never_played')
    })

    it('goes back to the questions with the answers kept on Change', async () => {
      const { wrapper } = await mountAt(answered)

      await wrapper.get('[data-test="where-to-start-change"]').trigger('click')
      await flushPromises()

      expect(chip(wrapper, 'Electric guitar').attributes('aria-pressed')).toBe('true')
      expect(chip(wrapper, 'Never played').attributes('aria-pressed')).toBe('true')
    })

    it('says nothing suits the level and shows the closest when there are no starting points', async () => {
      catalog({ startingPoints: [], courses: [course] })
      const { wrapper } = await mountAt('/?instrument=inst-bass&experience=never_played')

      expect(wrapper.text()).toContain('Nothing for beginners on electric bass yet. These are the closest:')
      expect(wrapper.findAll('[data-test="starting-point"]')).toHaveLength(1)
    })

    it('says the instrument has nothing yet and offers WhatsApp, with Change still there', async () => {
      catalog({ startingPoints: [] })
      const { wrapper } = await mountAt('/?instrument=inst-bass&experience=never_played')

      expect(wrapper.text()).toContain('No electric bass courses yet')
      expect(wrapper.get('[data-test="where-to-start-whatsapp"]').text()).toBe('Ask us on WhatsApp')
      expect(wrapper.find('[data-test="where-to-start-change"]').exists()).toBe(true)
    })

    it('says it could not load and offers Try again, with Change still there', async () => {
      catalog({ startingPoints: 'fail' })
      const { wrapper } = await mountAt(answered)

      expect(wrapper.get('[role="alert"]').text()).toContain("Where to start couldn't load.")
      catalog()
      const retry = wrapper.findAll('button').find((button) => button.text() === 'Try again')
      await retry?.trigger('click')
      await flushPromises()

      expect(wrapper.findAll('[data-test="starting-point"]')).toHaveLength(2)
      expect(wrapper.find('[data-test="where-to-start-change"]').exists()).toBe(true)
    })

    it('shows loading in place while the starting points come', async () => {
      catalog({ startingPoints: 'hang' })
      const { wrapper } = await mountAt(answered)

      expect(wrapper.find('[role="status"][aria-busy="true"]').exists()).toBe(true)
    })
  })
})
