import type { RouteLocationRaw } from 'vue-router'

import type { MyPathStep } from '@/features/student/utils/myPath'
import { languageName } from '@/features/student/utils/languageName'
import { useTypedT } from '@/shared/composables/useTypedT'

/** The way into a step: its label and where it goes. */
export interface StepAction {
  label: string
  to: RouteLocationRaw
}

/**
 * How My path words a step: its kind, its meta line, and the way into it. A language-locked step
 * opens in the first language it has, named in the interface language ("Watch in English").
 */
export function useStepWording() {
  const { t, locale } = useTypedT()

  function kindLabel(step: Pick<MyPathStep, 'kind'>): string {
    return t(`pathView.kind.${step.kind}`)
  }

  function language(step: MyPathStep): { code: string; name: string } | null {
    const code = step.availableLanguages[0]
    return code ? { code, name: languageName(code, locale.value) } : null
  }

  function meta(step: MyPathStep): string {
    const kind = kindLabel(step)
    switch (step.state) {
      case 'done':
        return t('pathView.meta.done', { kind })
      case 'current':
        return t('pathView.meta.current', { kind })
      case 'language': {
        const name = language(step)?.name
        return name ? t('pathView.meta.language', { language: name }) : kind
      }
      default:
        return kind
    }
  }

  function lessonRoute(step: MyPathStep): RouteLocationRaw {
    const code = step.state === 'language' ? language(step)?.code : undefined
    return { name: 'node', params: { nodeId: step.contentNodeId }, ...(code ? { query: { language: code } } : {}) }
  }

  /** "Start lesson", or for a language-locked step "Watch in English" / "Read in English". */
  function startAction(step: MyPathStep): StepAction {
    const name = step.state === 'language' ? language(step)?.name : undefined
    return {
      label: name ? t(`pathView.language.action.${step.kind}`, { language: name }) : t('pathView.startLesson'),
      to: lessonRoute(step),
    }
  }

  /** The interface language's own name, for "Not in English yet". */
  function ownLanguage(): string {
    return languageName(locale.value, locale.value)
  }

  return { kindLabel, meta, language, lessonRoute, startAction, ownLanguage }
}
