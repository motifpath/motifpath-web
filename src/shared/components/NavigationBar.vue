<script setup lang="ts">
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
  <!-- A phone's navigation: the five destinations along the bottom, in the thumb zone, with every
       label visible and the bar clear of the home indicator. -->
  <nav
    :aria-label="t('nav.ariaLabel')"
    class="flex items-stretch border-t border-border bg-surface-raised px-1 pb-safe pt-1"
  >
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
</template>
