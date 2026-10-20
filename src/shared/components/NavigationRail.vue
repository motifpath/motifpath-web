<script setup lang="ts">
import { RouterLink } from 'vue-router'

import BrandMark from '@/shared/components/BrandMark.vue'
import NavItem from '@/shared/components/NavItem.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { LEARNER_DESTINATIONS, type DestinationId } from '@/shared/navigation'

defineProps<{
  /** The destination the page sits under; null marks none. */
  current: DestinationId | null
}>()

const { t } = useTypedT()
</script>

<template>
  <!-- A tablet's navigation: the same five destinations, down the left edge. The account entry
       (slot `account`) sits at the foot. -->
  <div class="flex w-24 flex-col items-center border-r border-border bg-surface-raised py-5">
    <RouterLink :to="{ name: 'home' }" class="mb-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
      <BrandMark size="md" />
    </RouterLink>
    <nav :aria-label="t('nav.ariaLabel')" class="flex w-full flex-col gap-3 px-2">
      <NavItem
        v-for="destination in LEARNER_DESTINATIONS"
        :key="destination.id"
        data-test="nav-destination"
        :label="t(destination.labelKey)"
        :icon="destination.icon"
        :to="destination.to"
        :current="destination.id === current"
      />
    </nav>
    <div class="mt-auto pt-4">
      <slot name="account" />
    </div>
  </div>
</template>
