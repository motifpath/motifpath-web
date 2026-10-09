<script setup lang="ts">
import { PencilRuler } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import BrandMark from '@/shared/components/BrandMark.vue'
import NavItem from '@/shared/components/NavItem.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { LEARNER_DESTINATIONS, type DestinationId } from '@/shared/navigation'

withDefaults(
  defineProps<{
    /** The destination the page sits under; null marks none. */
    current: DestinationId | null
    /** Teachers and admins: Teach, under a divider, apart from the learner destinations. */
    showTeach?: boolean
  }>(),
  { showTeach: false },
)

const { t } = useTypedT()
</script>

<template>
  <!-- A desktop's navigation: icon and label rows. Authoring is desktop-first, so here Teach gets
       its own row instead of hiding in the account menu. The account entry (slot `account`) sits at
       the foot. -->
  <div class="flex h-full w-64 flex-col border-r border-border bg-surface-raised px-3 py-5">
    <RouterLink
      :to="{ name: 'home' }"
      class="mb-3 flex items-center gap-2.5 self-start rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <BrandMark size="md" />
      <span class="text-base font-bold text-ink">{{ t('appBar.brand') }}</span>
    </RouterLink>
    <nav :aria-label="t('nav.ariaLabel')" class="flex flex-col gap-1">
      <NavItem
        v-for="destination in LEARNER_DESTINATIONS"
        :key="destination.id"
        data-test="nav-destination"
        layout="row"
        :label="t(destination.labelKey)"
        :icon="destination.icon"
        :to="destination.to"
        :current="destination.id === current"
      />
      <template v-if="showTeach">
        <hr data-test="nav-teach-divider" class="my-1 border-border" />
        <NavItem data-test="nav-teach" layout="row" :label="t('accountMenu.teach')" :icon="PencilRuler" :to="{ name: 'teacher-content' }" />
      </template>
    </nav>
    <div class="mt-auto pt-4">
      <slot name="account" />
    </div>
  </div>
</template>
