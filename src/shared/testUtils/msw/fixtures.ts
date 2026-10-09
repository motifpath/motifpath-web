import type { components } from '@/api/generated/core-domain'
import { makeFrettedInstrument, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'
import { knowledgeNode } from '@/shared/testUtils/knowledgeNode'

type Schemas = components['schemas']

/** What the mock API answers with by default: a small, plausible catalog in en and pt-BR. */

export const instruments: Schemas['Instrument'][] = [
  makeFrettedInstrument(),
  makeFrettedInstrument({
    instrument_id: 'instrument-bass',
    names: { en: '4-string bass (standard tuning)', pt_BR: 'Baixo de 4 cordas (afinação padrão)' },
    icon: 'electric_bass',
    string_count: 4,
    tuning: ['E1', 'A1', 'D2', 'G2'],
    default_voice_id: 'electric-bass',
  }),
  {
    instrument_id: 'instrument-piano',
    names: { en: 'Piano', pt_BR: 'Piano' },
    languages: ['en', 'pt_BR'],
    family: 'keyboard',
    icon: 'piano',
    key_range: { lowest: 'A0', highest: 'C8' },
    default_voice_id: 'piano',
  },
]

export const creators: Schemas['UserRef'][] = [
  { user_id: '00000000-0000-4000-8000-000000000002', display_name: 'Ana Souza' },
  { user_id: '00000000-0000-4000-8000-000000000003', display_name: 'Bob Ferreira' },
  { user_id: '00000000-0000-4000-8000-000000000004', display_name: 'Maria Aparecida dos Santos Oliveira' },
]

// The seeded voices, attributions as the reference data has them.
export const voices: Schemas['Voice'][] = [
  {
    voice_id: 'acoustic-guitar',
    names: { en: 'Acoustic guitar', pt_BR: 'Violão' },
    languages: ['en', 'pt_BR'],
    family: 'fretted',
    samples: [],
    attribution: 'Acoustic guitar samples from tonejs-instruments by Nicholaus Brosowsky, CC BY 3.0',
  },
  {
    voice_id: 'piano',
    names: { en: 'Piano', pt_BR: 'Piano' },
    languages: ['en', 'pt_BR'],
    family: 'keyboard',
    samples: [],
    attribution: 'Piano samples from tonejs-instruments by Nicholaus Brosowsky, CC BY 3.0',
  },
  {
    voice_id: 'electric-bass',
    names: { en: 'Electric bass', pt_BR: 'Contrabaixo elétrico' },
    languages: ['en', 'pt_BR'],
    family: 'fretted',
    samples: [],
    attribution: 'Electric bass samples from tonejs-instruments by Nicholaus Brosowsky, CC BY 3.0',
  },
]

export const diagram: Schemas['Diagram'] = makeSequencedFrettedDiagram()

export const skillNodes: Schemas['KnowledgeNode'][] = [
  knowledgeNode('skill-technique', { names: { en: 'Technique', pt_BR: 'Técnica' } }),
  knowledgeNode('skill-alternate-picking', {
    names: { en: 'Alternate picking', pt_BR: 'Palhetada alternada' },
    parent_id: 'skill-technique',
    instrument_ids: ['instrument-guitar', 'instrument-bass'],
  }),
]

export const conceptNodes: Schemas['KnowledgeNode'][] = [
  knowledgeNode('concept-pentatonic', {
    kind: 'concept',
    names: { en: 'Pentatonic scale', pt_BR: 'Escala pentatônica' },
  }),
]

const alternatePicking = { node_id: 'skill-alternate-picking', names: { en: 'Alternate picking', pt_BR: 'Palhetada alternada' } }

export const practiceOverview: Schemas['PracticeOverview'] = {
  practice_days_last_7: 4,
  learning_days_last_7: 5,
  minutes_practised_last_7: 95,
  minutes_practised_previous_7: 60,
  day_streak_current: 3,
  day_streak_best: 9,
  skills_up_last_7: 2,
  instruments: [
    {
      instrument_id: 'instrument-guitar',
      practice_days_last_7: 4,
      top_next_step: { kind: 'strengthen', ...alternatePicking, level: 'learning' },
    },
  ],
}

export const practiceSummary: Schemas['PracticeSummary'] = {
  instrument_id: 'instrument-guitar',
  student_instrument_ids: ['instrument-guitar'],
  practice_days_last_7: 4,
  progress_this_week: [{ ...alternatePicking, measure: 'best_clean_tempo_bpm', before: 80, after: 92 }],
  next_steps: [{ kind: 'strengthen', ...alternatePicking, level: 'learning' }],
  next_steps_total: 1,
  groups: [
    {
      area_node_id: 'skill-technique',
      any_instrument: false,
      names: { en: 'Technique', pt_BR: 'Técnica' },
      nodes: [
        {
          ...alternatePicking,
          level: 'learning',
          fading: false,
          coverage: { met_count: 3, item_count: 8 },
          child_node_ids: [],
          readiness: { met_count: 1, required_count: 2 },
        },
      ],
    },
  ],
}
