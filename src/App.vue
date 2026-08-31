<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterView } from 'vue-router'

import { updateAuthBridge } from '@/features/auth/authBridge'
import { useAuth } from '@/features/auth/composables/useAuth'

const { isLoaded, isSignedIn, getToken } = useAuth()

watchEffect(() => {
  updateAuthBridge({
    isLoaded: isLoaded.value,
    isSignedIn: isSignedIn.value,
    getToken,
  })
})
</script>

<template>
  <RouterView />
</template>
