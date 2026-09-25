import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import { i18n, type SupportedLocale } from '@/i18n'
import LocaleScope from '@/shared/components/LocaleScope.vue'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

// Renders one message, one interval label and one per-language name, each through the
// composable a real component would use.
const Probe = defineComponent({
  props: { testId: { type: String, required: true } },
  setup(props) {
    const { t } = useTypedT()
    const { intervalLabel } = useIntervalLabel()
    const { localizedName } = useLocalizedName()
    return () =>
      h('p', { 'data-test': props.testId }, [
        t('languages.en'),
        ' ',
        intervalLabel('b3'),
        ' ',
        localizedName({ en: 'Guitar', pt_BR: 'Violão' }),
      ])
  },
})

function mountScoped(locale = ref<SupportedLocale>('pt-BR')) {
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('div', [
          h(Probe, { testId: 'outside' }),
          h(LocaleScope, { locale: locale.value }, { default: () => h(Probe, { testId: 'inside' }) }),
        ]),
    }),
  )
  return { wrapper, locale }
}

describe('LocaleScope', () => {
  it('shows everything inside it in its own locale, and leaves the rest of the page in the UI locale', () => {
    const { wrapper } = mountScoped()

    expect(wrapper.get('[data-test="inside"]').text()).toBe('Inglês 3m Violão')
    expect(wrapper.get('[data-test="outside"]').text()).toBe('English b3 Guitar')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('follows a change of its locale', async () => {
    const { wrapper, locale } = mountScoped()

    locale.value = 'en'
    await nextTick()

    expect(wrapper.get('[data-test="inside"]').text()).toBe('English b3 Guitar')
  })

  it("lets the component that owns a scope translate in it too, since it can't inject its own scope", () => {
    const Owner = defineComponent({
      setup() {
        const { t } = useTypedT({ locale: ref<SupportedLocale>('pt-BR') })
        const { localizedName } = useLocalizedName({ locale: ref<SupportedLocale>('pt-BR') })
        return () => h('p', [t('languages.en'), ' ', localizedName({ en: 'Guitar', pt_BR: 'Violão' })])
      },
    })

    expect(mount(Owner).text()).toBe('Inglês Violão')
  })
})
