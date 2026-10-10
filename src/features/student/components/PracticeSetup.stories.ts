import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import PracticeShell from '@/shared/components/PracticeShell.vue'

import PracticeSetup from './PracticeSetup.vue'

type Instrument = components['schemas']['Instrument']

const instruments: Instrument[] = [
  { instrument_id: 'i-1', names: { en: 'Guitar', pt_BR: 'Violão' }, languages: [], family: 'fretted', icon: 'acoustic_guitar', default_voice_id: 'acoustic_guitar' },
  { instrument_id: 'i-3', names: { en: 'Electric bass', pt_BR: 'Contrabaixo elétrico' }, languages: [], family: 'fretted', icon: 'electric_bass', default_voice_id: 'electric_bass' },
]

const meta = {
  title: 'Practice/PracticeSetup',
  component: PracticeSetup,
  args: { instruments, instrumentsLoading: false, instrumentsFailed: false, problem: null, instrumentId: 'i-1', minutes: 10 },
  render: (args) => ({
    components: { PracticeSetup, PracticeShell },
    setup: () => ({ args }),
    template: '<PracticeShell exit-label="Close"><PracticeSetup v-bind="args" /></PracticeShell>',
  }),
} satisfies Meta<typeof PracticeSetup>

export default meta
type Story = StoryObj<typeof meta>

/** Today's instrument and 10 minutes already chosen: Start practising is one tap. */
export const Preselected: Story = {}

/** Nothing to play on the instrument: practising in the head becomes the primary action. */
export const NothingToPlay: Story = { args: { problem: 'nothing_to_play' } }

/** Nothing to practise in the head either: the way out is finding where to start. */
export const NothingInTheHead: Story = { args: { problem: 'nothing_in_the_head', instrumentId: null } }

/** The session couldn't be put together: the choices are kept, and Try again sends them again. */
export const ComposeFailed: Story = { args: { problem: 'failed', minutes: 20 } }

/** The instruments didn't load: said in place, Try again is the primary action. */
export const InstrumentsFailed: Story = { args: { instrumentsFailed: true } }

export const InstrumentsLoading: Story = { args: { instrumentsLoading: true } }
