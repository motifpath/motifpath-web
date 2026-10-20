import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { ArrowRight, Pencil, Trash2 } from 'lucide-vue-next'

import OrderedList from '@/shared/components/OrderedList.vue'
import OrderedRow from '@/shared/components/OrderedRow.vue'

// A course's checkpoints, as an editor would list them.
const Harness = defineComponent({
  props: { draggable: { type: Boolean, default: true } },
  setup(props) {
    const titles = ref(['First chords', 'Strumming', 'Changes'])
    const actions = ref<string[]>([])
    function move(from: number, to: number) {
      const next = [...titles.value]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved!)
      titles.value = next
    }
    return () =>
      h('div', [
        h('p', { 'data-test': 'order' }, titles.value.join(' | ')),
        h('p', { 'data-test': 'actions' }, actions.value.join(' | ')),
        h(OrderedList, { onMove: move }, () =>
          titles.value.map((title, index) =>
            h(OrderedRow, {
              key: title,
              index,
              count: titles.value.length,
              title: `${index + 1} · ${title}`,
              meta: index === 2 ? 'Path · 7 lessons · Draft — publish it first' : 'Path · 6 lessons · Published',
              metaTone: index === 2 ? 'warning' : 'muted',
              draggable: props.draggable,
              actions: [
                { id: 'rename', label: 'Rename in this course', icon: Pencil },
                { id: 'open', label: 'Open the path', icon: ArrowRight },
                { id: 'remove', label: 'Remove from course', icon: Trash2, danger: true },
              ],
              onAction: (id: string) => actions.value.push(`${id}:${title}`),
            }),
          ),
        ),
      ])
  },
})

function rowRects(wrapper: ReturnType<typeof mount>) {
  // jsdom lays nothing out: give each row a 60 px slot, top to bottom.
  wrapper.findAll('[data-test="ordered-row"]').forEach((row, index) => {
    row.element.getBoundingClientRect = () => ({ top: index * 60, bottom: index * 60 + 56, height: 56, left: 0, right: 300, width: 300, x: 0, y: index * 60, toJSON: () => ({}) })
  })
}

function pointer(type: string, clientY: number) {
  return new MouseEvent(type, { clientY, bubbles: true })
}

async function openMenu(wrapper: ReturnType<typeof mount>, row: number) {
  await wrapper.findAll('[data-test="ordered-row-menu"]')[row]!.trigger('click')
}

function menuLabels(): string[] {
  return [...document.querySelectorAll('[data-test="ordered-row-menu-item"]')].map((item) => item.textContent?.trim() ?? '')
}

function clickMenuItem(label: string) {
  const item = [...document.querySelectorAll<HTMLButtonElement>('[data-test="ordered-row-menu-item"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  item!.click()
}

describe('OrderedList and OrderedRow', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('shows each row’s title and what it says about publishing', () => {
    wrapper = mount(Harness, { attachTo: document.body })

    const rows = wrapper.findAll('[data-test="ordered-row"]')
    expect(rows[0]!.get('[data-test="ordered-row-title"]').text()).toBe('1 · First chords')
    expect(rows[2]!.get('[data-test="ordered-row-meta"]').text()).toBe('Path · 7 lessons · Draft — publish it first')
  })

  it('⋮ offers the moves and the row’s own actions', async () => {
    wrapper = mount(Harness, { attachTo: document.body })

    await openMenu(wrapper, 1)

    expect(menuLabels()).toEqual(['Move up', 'Move down', 'Rename in this course', 'Open the path', 'Remove from course'])
  })

  it('Move up moves the row one place up and closes the menu', async () => {
    wrapper = mount(Harness, { attachTo: document.body })

    await openMenu(wrapper, 2)
    clickMenuItem('Move up')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="order"]').text()).toBe('First chords | Changes | Strumming')
    expect(document.querySelector('[data-test="ordered-row-menu-item"]')).toBeNull()
  })

  it('Move down moves the row one place down', async () => {
    wrapper = mount(Harness, { attachTo: document.body })

    await openMenu(wrapper, 0)
    clickMenuItem('Move down')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="order"]').text()).toBe('Strumming | First chords | Changes')
  })

  it('the first row can’t move up and the last can’t move down', async () => {
    wrapper = mount(Harness, { attachTo: document.body })

    await openMenu(wrapper, 0)
    expect(menuLabels()).not.toContain('Move up')
    clickMenuItem('Move down')
    await wrapper.vm.$nextTick()

    await openMenu(wrapper, 2)
    expect(menuLabels()).not.toContain('Move down')
  })

  it('passes the row’s own actions on', async () => {
    wrapper = mount(Harness, { attachTo: document.body })

    await openMenu(wrapper, 1)
    clickMenuItem('Remove from course')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="actions"]').text()).toBe('remove:Strumming')
  })

  it('names the menu after the row', async () => {
    wrapper = mount(Harness, { attachTo: document.body })

    await openMenu(wrapper, 1)

    expect(document.body.textContent).toContain('2 · Strumming')
    expect(wrapper.findAll('[data-test="ordered-row-menu"]')[1]!.attributes('aria-label')).toBe('More for 2 · Strumming')
  })

  it('dragging a row by its handle onto another moves it there', async () => {
    wrapper = mount(Harness, { attachTo: document.body })
    rowRects(wrapper)

    const handle = wrapper.findAll('[data-test="ordered-row-handle"]')[2]!
    handle.element.dispatchEvent(pointer('pointerdown', 150))
    window.dispatchEvent(pointer('pointermove', 90))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-test="ordered-row"]')[2]!.attributes('data-dragging')).toBe('true')
    window.dispatchEvent(pointer('pointerup', 90))
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="order"]').text()).toBe('First chords | Changes | Strumming')
  })

  it('dropping a row back where it was changes nothing', async () => {
    wrapper = mount(Harness, { attachTo: document.body })
    rowRects(wrapper)

    wrapper.findAll('[data-test="ordered-row-handle"]')[0]!.element.dispatchEvent(pointer('pointerdown', 20))
    window.dispatchEvent(pointer('pointermove', 30))
    window.dispatchEvent(pointer('pointerup', 30))
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="order"]').text()).toBe('First chords | Strumming | Changes')
  })

  it('rows in a fixed order have no handle and no moves', async () => {
    wrapper = mount(Harness, { props: { draggable: false }, attachTo: document.body })

    expect(wrapper.find('[data-test="ordered-row-handle"]').exists()).toBe(false)
    await openMenu(wrapper, 1)
    expect(menuLabels()).toEqual(['Rename in this course', 'Open the path', 'Remove from course'])
  })
})
