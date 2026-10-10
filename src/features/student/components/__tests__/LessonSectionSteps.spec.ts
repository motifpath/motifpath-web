import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import LessonSectionSteps from '@/features/student/components/LessonSectionSteps.vue'
import type { MyPathSection, MyPathStep } from '@/features/student/utils/myPath'

const page = { template: '<div />' }
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/path', name: 'path', component: page },
      { path: '/path/nodes/:nodeId', name: 'node', component: page },
    ],
  })
}

function stepAt(position: number, state: MyPathStep['state'], extra: Partial<MyPathStep> = {}): MyPathStep {
  return {
    position,
    title: `Step ${position}`,
    contentNodeId: `node-${position}`,
    kind: 'video',
    state,
    availableLanguages: [],
    ...extra,
  }
}

function triadShapes(steps: MyPathStep[], label: string | null = 'Triad shapes'): MyPathSection {
  return { label, done: 2, total: 5, finished: false, steps }
}

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountSteps(section: MyPathSection, viewing = 'node-8', next: MyPathStep | null = null) {
  const router = makeRouter()
  await router.push('/path/nodes/node-8')
  wrapper = mount(LessonSectionSteps, {
    props: { section, viewingNodeId: viewing, next },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  return wrapper
}

const rows = (w: ReturnType<typeof mount>) => w.findAll('[data-test="step-row"]')

describe('LessonSectionSteps', () => {
  it('names the section with the whole section\'s count, in a region a screen reader can find', async () => {
    const w = await mountSteps(triadShapes([stepAt(7, 'done'), stepAt(8, 'current'), stepAt(9, 'locked')]))

    const region = w.get('[data-test="lesson-section-steps"]')
    expect(region.attributes('aria-label')).toBe('In this section')
    expect(region.text()).toContain('Triad shapes')
    expect(region.text()).toContain('2 of 5')
  })

  it('shows each step it is given, in order', async () => {
    const w = await mountSteps(triadShapes([stepAt(7, 'done'), stepAt(8, 'current'), stepAt(9, 'locked')]))

    expect(rows(w).map((row) => row.text())).toEqual([
      expect.stringContaining('Step 7'),
      expect.stringContaining('Step 8'),
      expect.stringContaining('Step 9'),
    ])
  })

  it('says the lesson on screen is the one the student is on now', async () => {
    const w = await mountSteps(triadShapes([stepAt(7, 'done'), stepAt(8, 'current'), stepAt(9, 'locked')]))

    expect(rows(w)[1].text()).toContain('Now · Video')
    expect(rows(w)[0].text()).toContain('Video · Done')
  })

  it('shows the lesson on screen as done once it is, and the step it opened as up next', async () => {
    const w = await mountSteps(triadShapes([stepAt(7, 'done'), stepAt(8, 'done'), stepAt(9, 'current')]))

    expect(rows(w)[1].text()).toContain('Video · Done')
    expect(rows(w)[2].text()).toContain('Up next · Video')
  })

  it('links every step the student may open to its lesson', async () => {
    const w = await mountSteps(triadShapes([stepAt(7, 'done'), stepAt(8, 'current')]))

    expect(rows(w)[0].attributes('href')).toBe('/path/nodes/node-7')
  })

  it('explains a locked step in place instead of opening it', async () => {
    const current = stepAt(8, 'current')
    const w = await mountSteps(triadShapes([stepAt(7, 'done'), current, stepAt(9, 'locked')]), 'node-8', current)

    await rows(w)[2].trigger('click')

    expect(document.body.textContent).toContain('Go to step 8')
  })

  it('has no heading for a path without sections, and still names the region', async () => {
    const w = await mountSteps(triadShapes([stepAt(7, 'done'), stepAt(8, 'current')], null))

    expect(w.find('h3').exists()).toBe(false)
    expect(w.get('[data-test="lesson-section-steps"]').attributes('aria-label')).toBe('In this section')
  })
})
