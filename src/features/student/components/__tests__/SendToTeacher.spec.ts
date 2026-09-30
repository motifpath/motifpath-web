import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'

import { i18n } from '@/i18n'

// `reactive()` mirrors Pinia's own auto-unwrapping of a setup store's refs.
const currentUser = reactive<{ profile: { display_name?: string } | null }>({
  profile: { display_name: 'Ana Souza' },
})
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import SendToTeacher from '@/features/student/components/SendToTeacher.vue'

enableAutoUnmount(afterEach)

const lessonProps = {
  reference: 'L-3eb9ccc1',
  pathTitle: 'Blues Basics',
  lessonTitle: 'Shuffle in E',
}

function mountButton(props: Partial<typeof lessonProps & { raised: boolean }> = {}) {
  // Attached, so isVisible() reads the tooltip's computed display.
  return mount(SendToTeacher, { props: { ...lessonProps, ...props }, attachTo: document.body })
}

type Wrapper = ReturnType<typeof mountButton>
type Point = { clientX: number; clientY: number }

const POSITION_KEY = 'motifpath:send-to-teacher-position'

/**
 * jsdom lays nothing out, so this gives the icon the box a browser would draw
 * it in: its resting side and height inside jsdom's 1024 x 768 window.
 */
function drawIconWhereItRests(wrapper: Wrapper) {
  const floating = float(wrapper)
  const x = floating.classes().includes('left-4') ? 16 : 1024 - 16 - 48
  const bottom = Number(/bottom: (\d+)px/.exec(floating.attributes('style') ?? '')?.[1] ?? 16)
  drawIconAt(wrapper, x, 768 - bottom - 48)
}

function drawIconAt(wrapper: Wrapper, x: number, y: number) {
  const link = wrapper.get('[data-test="send-to-teacher"]').element
  vi.spyOn(link, 'getBoundingClientRect').mockReturnValue(new DOMRect(x, y, 48, 48))
}

/** A whole pointer gesture on the icon: press at `from`, move to `to`, release there. */
async function drag(wrapper: Wrapper, from: Point, to: Point) {
  drawIconWhereItRests(wrapper)
  const link = wrapper.get('[data-test="send-to-teacher"]')
  const pointer = { pointerType: 'mouse', pointerId: 1, button: 0 }
  await link.trigger('pointerdown', { ...pointer, ...from })
  await link.trigger('pointermove', { ...pointer, ...to })
  await link.trigger('pointerup', { ...pointer, ...to })
}

/** Whether a click on the icon would go on to open WhatsApp. */
function clickOpensWhatsApp(wrapper: Wrapper): boolean {
  const click = new MouseEvent('click', { bubbles: true, cancelable: true })
  wrapper.get('[data-test="send-to-teacher"]').element.dispatchEvent(click)
  return !click.defaultPrevented
}

function float(wrapper: Wrapper) {
  return wrapper.get('[data-test="send-to-teacher-float"]')
}

/** The prefilled message carried by the link's `text` query parameter. */
function prefilledMessage(wrapper: ReturnType<typeof mountButton>): string {
  const href = wrapper.get('[data-test="send-to-teacher"]').attributes('href') ?? ''
  return new URL(href).searchParams.get('text') ?? ''
}

describe('SendToTeacher', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '+55 11 91234-5678')
    currentUser.profile = { display_name: 'Ana Souza' }
    i18n.global.locale.value = 'en'
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    i18n.global.locale.value = 'en'
  })

  it('is a floating WhatsApp icon named "Send to your teacher"', () => {
    const link = mountButton().get('[data-test="send-to-teacher"]')

    expect(link.attributes('aria-label')).toBe('Send to your teacher')
    expect(link.text()).toBe('')
    expect(link.find('[data-test="whatsapp-icon"]').exists()).toBe(true)
  })

  it('starts in the bottom-right corner, higher when raised above a bottom bar', () => {
    const resting = float(mountButton())
    const raised = float(mountButton({ raised: true }))

    expect(resting.classes()).toEqual(expect.arrayContaining(['fixed', 'right-4']))
    expect(resting.attributes('style')).toContain('bottom: 16px')
    expect(raised.classes()).toContain('right-4')
    expect(raised.attributes('style')).toContain('bottom: 80px')
  })

  describe('dragging', () => {
    // jsdom's window is 1024 x 768; the 48px icon rests 16px from the right and
    // bottom edges, so its top-left corner starts at (960, 704).

    it('moves with a drag and settles on the nearest side edge, at the height it was let go', async () => {
      const wrapper = mountButton()

      await drag(wrapper, { clientX: 1000, clientY: 740 }, { clientX: 100, clientY: 440 })

      expect(float(wrapper).classes()).toContain('left-4')
      expect(float(wrapper).classes()).not.toContain('right-4')
      expect(float(wrapper).attributes('style')).toContain('bottom: 316px')
    })

    it('follows the finger from wherever the icon is drawn, without jumping', async () => {
      const wrapper = mountButton()
      // Drawn somewhere other than its resting corner.
      drawIconAt(wrapper, 500, 300)
      const link = wrapper.get('[data-test="send-to-teacher"]')

      await link.trigger('pointerdown', { pointerType: 'touch', pointerId: 1, button: 0, clientX: 520, clientY: 320 })
      await link.trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 420, clientY: 120 })

      expect(float(wrapper).attributes('style')).toContain('translate(-100px, -200px)')
    })

    describe('when the icon is drawn away from where the window size puts it', () => {
      // Resting at bottom 16px, but drawn 400px higher than that implies.
      async function dragFromMisplacedIcon(wrapper: Wrapper, dy: number) {
        drawIconAt(wrapper, 960, 304)
        const link = wrapper.get('[data-test="send-to-teacher"]')
        const pointer = { pointerType: 'touch', pointerId: 1, button: 0, clientX: 980 }
        await link.trigger('pointerdown', { ...pointer, clientY: 330 })
        await link.trigger('pointermove', { ...pointer, clientY: 330 + dy })
        return link
      }

      it('settles where it was let go', async () => {
        const wrapper = mountButton()
        const link = await dragFromMisplacedIcon(wrapper, -100)

        await link.trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 980, clientY: 230 })

        expect(float(wrapper).attributes('style')).toContain('bottom: 116px')
      })

      it('still cannot be dragged below its lowest place', async () => {
        const wrapper = mountButton()

        await dragFromMisplacedIcon(wrapper, 100)

        expect(float(wrapper).attributes('style')).toContain('translate(0px, 0px)')
      })

      it('still stops below the app bar', async () => {
        const wrapper = mountButton()
        const link = await dragFromMisplacedIcon(wrapper, -1000)

        await link.trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 980, clientY: -670 })

        // Drawn at top 304px, stopped at 80px: moved up 224px from a bottom of 16px.
        expect(float(wrapper).attributes('style')).toContain('bottom: 240px')
      })
    })

    it('does not open WhatsApp at the end of a drag', async () => {
      const wrapper = mountButton()

      await drag(wrapper, { clientX: 1000, clientY: 740 }, { clientX: 100, clientY: 440 })

      expect(clickOpensWhatsApp(wrapper)).toBe(false)
    })

    it('still opens WhatsApp on a tap', async () => {
      const wrapper = mountButton()

      await drag(wrapper, { clientX: 1000, clientY: 740 }, { clientX: 1000, clientY: 740 })

      expect(clickOpensWhatsApp(wrapper)).toBe(true)
    })

    it('treats a slight wobble during a tap as a tap', async () => {
      const wrapper = mountButton()

      await drag(wrapper, { clientX: 1000, clientY: 740 }, { clientX: 1003, clientY: 742 })

      expect(clickOpensWhatsApp(wrapper)).toBe(true)
      expect(float(wrapper).classes()).toContain('right-4')
      expect(float(wrapper).attributes('style')).toContain('bottom: 16px')
    })

    it('opens WhatsApp on the next tap after a drag', async () => {
      const wrapper = mountButton()
      await drag(wrapper, { clientX: 1000, clientY: 740 }, { clientX: 100, clientY: 440 })
      clickOpensWhatsApp(wrapper)

      await drag(wrapper, { clientX: 40, clientY: 420 }, { clientX: 40, clientY: 420 })

      expect(clickOpensWhatsApp(wrapper)).toBe(true)
    })

    it('stays entirely on screen, below the app bar', async () => {
      const wrapper = mountButton()

      await drag(wrapper, { clientX: 1000, clientY: 740 }, { clientX: 1000, clientY: -500 })

      // Top edge held at 80px (64px app bar + 16px), so 768 - 80 - 48 from the bottom.
      expect(float(wrapper).attributes('style')).toContain('bottom: 640px')
    })

    it('cannot be dragged below a bottom bar when raised', async () => {
      const wrapper = mountButton({ raised: true })

      await drag(wrapper, { clientX: 1000, clientY: 700 }, { clientX: 1000, clientY: 760 })

      expect(float(wrapper).attributes('style')).toContain('bottom: 80px')
    })

    it('hides the tooltip while it is being dragged', async () => {
      const wrapper = mountButton()
      const link = wrapper.get('[data-test="send-to-teacher"]')
      await link.trigger('pointerenter', { pointerType: 'mouse' })
      drawIconWhereItRests(wrapper)

      await link.trigger('pointerdown', { pointerType: 'mouse', pointerId: 1, button: 0, clientX: 1000, clientY: 740 })
      await link.trigger('pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 800, clientY: 600 })

      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
    })

    it('remembers its place on this device', async () => {
      const first = mountButton()
      await drag(first, { clientX: 1000, clientY: 740 }, { clientX: 100, clientY: 440 })
      first.unmount()

      const next = mountButton({ reference: 'X-3eb9ccc1/5c20a7e4', raised: true })

      expect(float(next).classes()).toContain('left-4')
      expect(float(next).attributes('style')).toContain('bottom: 316px')
    })

    it('comes back into view when a remembered place no longer fits the window', async () => {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify({ side: 'right', bottom: 600 }))
      const wrapper = mountButton()
      const tallHeight = window.innerHeight

      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 })
      window.dispatchEvent(new Event('resize'))
      await nextTick()

      // 500 - 80 (app bar and margin) - 48 (icon)
      expect(float(wrapper).attributes('style')).toContain('bottom: 372px')
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: tallHeight })
    })

    it('starts in the bottom-right corner when this device cannot remember its place', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage blocked')
      })

      const wrapper = mountButton()

      expect(float(wrapper).classes()).toContain('right-4')
      expect(float(wrapper).attributes('style')).toContain('bottom: 16px')
    })

    it('ignores a remembered place it cannot read', () => {
      window.localStorage.setItem(POSITION_KEY, 'not json')

      const wrapper = mountButton()

      expect(float(wrapper).classes()).toContain('right-4')
      expect(float(wrapper).attributes('style')).toContain('bottom: 16px')
    })
  })

  it('opens the concierge number on wa.me outside the app', () => {
    const link = mountButton().get('[data-test="send-to-teacher"]')

    expect(link.attributes('href')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=/)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('hides its tooltip until hovered or focused', () => {
    const wrapper = mountButton()

    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('shows its label and where the message goes while a mouse hovers it', async () => {
    const wrapper = mountButton()
    const link = wrapper.get('[data-test="send-to-teacher"]')

    await link.trigger('pointerenter', { pointerType: 'mouse' })

    const tooltip = wrapper.get('[role="tooltip"]')
    expect(tooltip.isVisible()).toBe(true)
    expect(tooltip.text()).toContain('Send to your teacher')
    expect(tooltip.text()).toContain('Opens WhatsApp. Your message goes to the MotifPath team.')

    await link.trigger('pointerleave', { pointerType: 'mouse' })

    expect(tooltip.isVisible()).toBe(false)
  })

  it('shows no tooltip for a touch, which opens WhatsApp straight away', async () => {
    const wrapper = mountButton()

    await wrapper.get('[data-test="send-to-teacher"]').trigger('pointerenter', { pointerType: 'touch' })

    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('shows its tooltip while it has keyboard focus', async () => {
    const wrapper = mountButton()
    const link = wrapper.get('[data-test="send-to-teacher"]')

    await link.trigger('focus')
    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(true)

    await link.trigger('blur')
    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('shows no tooltip for the focus a tap or click gives it', async () => {
    const wrapper = mountButton()
    const link = wrapper.get('[data-test="send-to-teacher"]')

    await link.trigger('pointerdown', { pointerType: 'touch' })
    await link.trigger('focus')

    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('describes itself with the tooltip for assistive technology', () => {
    const wrapper = mountButton()

    const tooltipId = wrapper.get('[role="tooltip"]').attributes('id')
    expect(tooltipId).toBeTruthy()
    expect(wrapper.get('[data-test="send-to-teacher"]').attributes('aria-describedby')).toBe(tooltipId)
  })

  it('prefills the student, the path, the lesson and the reference', () => {
    expect(prefilledMessage(mountButton())).toBe(
      [
        "Hi! I'm Ana Souza.",
        'Path: Blues Basics',
        'Lesson: Shuffle in E',
        'Ref: L-3eb9ccc1',
        '',
        'My question or recording:',
      ].join('\n'),
    )
  })

  it('carries whatever reference it is given', () => {
    const message = prefilledMessage(mountButton({ reference: 'X-3eb9ccc1/5c20a7e4' }))

    expect(message).toContain('Ref: X-3eb9ccc1/5c20a7e4')
  })

  it('greets without a name when the student has no display name', () => {
    currentUser.profile = {}

    const message = prefilledMessage(mountButton())

    expect(message.split('\n')[0]).toBe('Hi!')
    expect(message).not.toContain("I'm")
  })

  it('leaves out a title it does not know yet', () => {
    const message = prefilledMessage(mountButton({ pathTitle: undefined }))

    expect(message).not.toContain('Path:')
    expect(message).toContain('Lesson: Shuffle in E')
  })

  it('writes the label, the hint and the message in Portuguese for a pt-BR interface', () => {
    i18n.global.locale.value = 'pt-BR'

    const wrapper = mountButton()

    expect(wrapper.get('[data-test="send-to-teacher"]').attributes('aria-label')).toBe('Enviar ao professor')
    expect(prefilledMessage(wrapper)).toBe(
      [
        'Olá! Sou Ana Souza.',
        'Trilha: Blues Basics',
        'Lição: Shuffle in E',
        'Ref: L-3eb9ccc1',
        '',
        'Minha dúvida ou gravação:',
      ].join('\n'),
    )
  })

  it('renders nothing when no concierge number is configured', () => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '')

    const wrapper = mountButton()

    expect(wrapper.find('[data-test="send-to-teacher"]').exists()).toBe(false)
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })
})
