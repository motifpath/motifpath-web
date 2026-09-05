<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const router = useRouter()
const currentUser = useCurrentUserStore()

// A successful retry has nowhere else to go from this route — nothing else
// re-evaluates the guard, so this view must navigate onward itself.
watch(
  () => currentUser.state,
  (state) => {
    if (state === 'registered') {
      void router.push({ name: 'path' })
    }
  },
)
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-motif-blue">MotifPath</h1>
    <RegistrationFailedNotice />
  </section>
</template>
