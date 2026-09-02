<script setup lang="ts">
import { ref } from 'vue'
import { getToken } from './api'
import LoginView from './components/LoginView.vue'
import ChatView from './components/ChatView.vue'

const authed = ref(!!getToken())

function onLoggedIn() {
  authed.value = true
}
function onLogout() {
  authed.value = false
}
</script>

<template>
  <LoginView v-if="!authed" @logged-in="onLoggedIn" />
  <ChatView v-else @logout="onLogout" />
</template>
