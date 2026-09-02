<script setup lang="ts">
import { ref } from 'vue'
import { login, setToken } from '../api'

const emit = defineEmits<{ (e: 'logged-in'): void }>()

const apiKey = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  const key = apiKey.value.trim()
  if (!key) {
    error.value = '请输入 API Key'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { token } = await login(key)
    setToken(token) // 只存短期 token，不存 key
    apiKey.value = ''
    emit('logged-in')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="card">
      <div class="logo">🤖</div>
      <h1>智能客服</h1>
      <p class="hint">输入 API Key 登录 —— 仅用于换取短期访问 token，不会被保存</p>
      <input
        v-model="apiKey"
        type="password"
        placeholder="API Key"
        autocomplete="off"
        @keyup.enter="submit"
      />
      <button :disabled="loading" @click="submit">
        {{ loading ? '登录中…' : '登录' }}
      </button>
      <p v-if="error" class="err">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.login {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  width: 360px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 36px 32px;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}
.logo {
  font-size: 44px;
}
h1 {
  margin: 12px 0 4px;
  font-size: 20px;
}
.hint {
  color: var(--muted);
  font-size: 13px;
  margin: 0 0 20px;
  line-height: 1.5;
}
input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 12px;
}
input:focus {
  outline: none;
  border-color: var(--brand);
}
button {
  width: 100%;
  padding: 10px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.err {
  color: var(--warn);
  font-size: 13px;
  margin: 12px 0 0;
}
</style>
