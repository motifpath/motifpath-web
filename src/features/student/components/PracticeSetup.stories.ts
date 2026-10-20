import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { components } from '@/api/generated/core-domain'
import PracticeShell from '@/shared/components/PracticeShell.vue'

import PracticeSetup from './PracticeSetup.vue'

type Instrument = components['schemas']['Instrument']

const instruments: Instrument[] = [
  { instrument_id: 'i-1', names: { en: 'Guitar', pt_BR: 'Violão' }, languages: [], family: 'fretted', icon: 'acoustic_guitar', default_voice_id: 'acoustic_guitar' },
  { instrument_id: 'i-3', names: { en: 'Electric bass', pt_BR: 'Contrabaixo elétrico' }, languages: [], family: 'fretted', icon: 'electric_bass', default_voice_id: 'electric_bass' },
]

const progressions: components['schemas']['PracticeSubject'] = {
  node_id: 'n-1',
  names: { en: 'Recognise intervals by ear', pt_BR: 'Reconhecer intervalos de ouvido' },
  on_path: true,
  item_count: 14,
  level: 'learning',
  current_rung: 'hear',
}

const meta = {
  title: 'Practice/PracticeSetup',
  component: PracticeSetup,
  args: { instruments, instrumentsLoading: false, instrumentsFailed: false, problem: null, subject: null, instrumentId: 'i-1', minutes: 10, whatToPractise: 'mix' },
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

/** A subject chosen: the session is only this, as much as fits the minutes. */
export const SubjectChosen: Story = { args: { whatToPractise: 'choose', subject: progressions } }
export const SubjectChosenDarkPortuguese: Story = { ...SubjectChosen, globals: { theme: 'dark', locale: 'pt-BR' } }

/** I'll choose, nothing picked yet: the way on is choosing what to practise. */
export const ChoosingWithoutSubject: Story = { args: { whatToPractise: 'choose' } }

/** Nothing suggested for the head: the way out is choosing what to practise, never a dead end. */
export const NothingToMixInTheHead: Story = { args: { problem: 'nothing_to_mix', instrumentId: null } }

/** Nothing suggested for the instrument. */
export const NothingToMix: Story = { args: { problem: 'nothing_to_mix' } }

/** A student who has never started anything: the way out is finding where to start. */
export const NothingStarted: Story = { args: { problem: 'nothing_started', instrumentId: null } }

/** The subject chosen has nothing to practise this way: choosing another is the way on. */
export const SubjectUnavailable: Story = { args: { whatToPractise: 'choose', subject: progressions, problem: 'subject_unavailable' } }

/** The session couldn't be put together: the choices are kept, and Try again sends them again. */
export const ComposeFailed: Story = { args: { problem: 'failed', minutes: 20 } }

/** The instruments didn't load: said in place, Try again is the primary action. */
export const InstrumentsFailed: Story = { args: { instrumentsFailed: true } }

export const InstrumentsLoading: Story = { args: { instrumentsLoading: true } }
