<script setup lang="ts">
import { watch, watchEffect } from 'vue'
import { RouterView } from 'vue-router'

import { updateAuthBridge, updateRegistrationBridge } from '@/features/auth/authBridge'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn, getToken } = useAuth()
const currentUser = useCurrentUserStore()

watchEffect(() => {
  updateAuthBridge({
    isLoaded: isLoaded.value,
    isSignedIn: isSignedIn.value,
    getToken,
  })
})

watchEffect(() => {
  updateRegistrationBridge(currentUser.state)
})

watch(
  isSignedIn,
  (signedIn) => {
    if (signedIn) {
      void currentUser.ensure()
    } else {
      currentUser.reset()
    }
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
