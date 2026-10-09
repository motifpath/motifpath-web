<script setup lang="ts">
/**
 * Credits for the recordings diagrams play with: each voice's name and the
 * attribution its samples' license asks for.
 */
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useListVoices } from '@/shared/composables/useListVoices'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { voices, isLoading, error, retry } = useListVoices()
</script>

<template>
  <section class="flex flex-col gap-6">
    <h1 class="text-xl font-semibold sm:text-2xl">{{ t('creditsView.title') }}</h1>

    <section class="flex flex-col gap-3" aria-labelledby="credits-sounds">
      <h2 id="credits-sounds" class="text-lg font-semibold">{{ t('creditsView.soundsTitle') }}</h2>
      <p class="text-sm text-ink-muted">{{ t('creditsView.soundsIntro') }}</p>

      <LoadingSkeleton v-if="isLoading" data-test="loading" />
      <LoadFailed v-else-if="error" data-test="error" :message="t('creditsView.errorMessage')" @retry="retry" />
      <ul v-else class="flex flex-col gap-3">
        <li v-for="voice in voices" :key="voice.voice_id" data-test="credits-voice" class="flex flex-col gap-0.5">
          <span class="font-semibold">{{ localizedName(voice.names) }}</span>
          <span class="text-sm text-ink-muted">{{ voice.attribution }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>
