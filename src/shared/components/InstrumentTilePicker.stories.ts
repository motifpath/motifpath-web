import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'

import InstrumentTilePicker from './InstrumentTilePicker.vue'

type Instrument = components['schemas']['Instrument']

const instruments: Instrument[] = [
  { instrument_id: 'i-1', names: { en: 'Acoustic guitar', pt_BR: 'Violão' }, languages: [], family: 'fretted', icon: 'acoustic_guitar', default_voice_id: 'acoustic_guitar' },
  { instrument_id: 'i-2', names: { en: 'Electric guitar', pt_BR: 'Guitarra' }, languages: [], family: 'fretted', icon: 'electric_guitar', default_voice_id: 'electric_guitar' },
  { instrument_id: 'i-3', names: { en: 'Electric bass', pt_BR: 'Contrabaixo elétrico' }, languages: [], family: 'fretted', icon: 'electric_bass', default_voice_id: 'electric_bass' },
  { instrument_id: 'i-4', names: { en: 'Piano', pt_BR: 'Piano' }, languages: [], family: 'keyboard', icon: 'piano', default_voice_id: 'piano' },
]

const meta = {
  title: 'Selection/InstrumentTilePicker',
  component: InstrumentTilePicker,
  args: { instruments, label: 'Instrument in hand', modelValue: 'i-1' },
} satisfies Meta<typeof InstrumentTilePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithNoneTile: Story = { args: { noneLabel: 'None — in my head', modelValue: null } }
