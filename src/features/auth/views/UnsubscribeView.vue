<script setup lang="ts">
/** Where an email's unsubscribe link leads: it turns that kind of email off as it opens. */
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

import UnsubscribeScreen from '@/features/auth/components/UnsubscribeScreen.vue'
import { useEmailUnsubscribe } from '@/shared/composables/useEmailUnsubscribe'

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : null
const { state, kind, unsubscribe } = useEmailUnsubscribe(token)

onMounted(unsubscribe)
</script>

<template>
  <UnsubscribeScreen :state="state" :kind="kind" @retry="unsubscribe" />
</template>
