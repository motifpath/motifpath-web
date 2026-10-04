import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import InstrumentTilePicker from '@/shared/components/InstrumentTilePicker.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'

const guitar = makeFrettedInstrument({ instrument_id: 'guitar', names: { en: 'Acoustic guitar' }, icon: 'acoustic_guitar' })
const bass = makeFrettedInstrument({ instrument_id: 'bass', names: { en: 'Electric bass' }, icon: 'electric_bass' })

function mountPicker(modelValue: string | null = 'guitar') {
  return mount(InstrumentTilePicker, {
    attachTo: document.body,
    props: {
      instruments: [guitar, bass],
      modelValue,
      label: 'Instrument in your hands',
      'onUpdate:modelValue': () => {},
    },
  })
}

enableAutoUnmount(afterEach)

describe('InstrumentTilePicker', () => {
  it('shows each instrument as a tile with its picture and name', () => {
    const tiles = mountPicker().findAll('[data-test="instrument-tile"]')

    expect(tiles.map((tile) => tile.text())).toEqual(['Acoustic guitar', 'Electric bass'])
    expect(tiles.map((tile) => tile.get('svg').attributes('data-icon'))).toEqual(['acoustic_guitar', 'electric_bass'])
  })

  it('picks an instrument with one tap', async () => {
    const wrapper = mountPicker()

    await wrapper.findAll('[data-test="instrument-tile"]')[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['bass']])
  })

  it('is a group of choices named by its label, the chosen one checked', () => {
    const wrapper = mountPicker('bass')

    expect(wrapper.get('fieldset legend').text()).toBe('Instrument in your hands')
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    expect(radios.map((radio) => radio.element.checked)).toEqual([false, true])
  })
})
