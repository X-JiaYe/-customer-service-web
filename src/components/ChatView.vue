<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { chatStream, sendFeedback, clearToken } from '../api'

const emit = defineEmits<{ (e: 'logout'): void }>()

interface Msg {
  role: 'user' | 'assistant'
  text: string
  done: boolean
  rated?: 'up' | 'down'
}

const sessionId = ref(
  sessionStorage.getItem('cs_sid') || 's' + Math.random().toString(36).slice(2, 10),
)
sessionStorage.setItem('cs_sid', sessionId.value)

const messages = ref<Msg[]>([])
const input = ref('')
const busy = ref(false)
const listEl = ref<HTMLElement | null>(null)

async function scrollBottom() {
  await nextTick()
  listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
}

async function send(text?: string) {
  const t = (text ?? input.value).trim()
  if (!t || busy.value) return
  input.value = ''
  messages.value.push({ role: 'user', text: t, done: true })
  const m: Msg = { role: 'assistant', text: '', done: false }
  messages.value.push(m)
  busy.value = true
  try {
    const full = await chatStream(t, sessionId.value, (cur) => {
      m.text = cur
      scrollBottom()
    })
    m.text = full
  } catch (e) {
    m.text = '请求失败：' + (e as Error).message
    if ((e as Error).message.includes('401')) {
      clearToken()
      emit('logout')
    }
  } finally {
    m.done = true
    busy.value = false
    scrollBottom()
  }
}

function transfer() {
  send('我要转人工，请帮我转接人工客服')
}

async function rate(m: Msg, r: 'up' | 'down') {
  m.rated = m.rated === r ? undefined : r
  try {
    await sendFeedback(r, sessionId.value)
  } catch {
    /* 评分失败不打断 */
  }
}

function newSession() {
  sessionId.value = 's' + Math.random().toString(36).slice(2, 10)
  sessionStorage.setItem('cs_sid', sessionId.value)
  messages.value = []
}

function logout() {
  clearToken()
  emit('logout')
}

// 把答案里附的「来源/参考」行抽出，渲染为可点击复制块
function splitSources(text: string): { main: string; sources: string } {
  const lines = text.split('\n')
  const src: string[] = []
  const main: string[] = []
  for (const line of lines) {
    if (/来源|参考|依据|《.*》/.test(line) && line.length < 60) src.push(line)
    else main.push(line)
  }
  return { main: main.join('\n'), sources: src.join('\n') }
}

function copySources(sources: string) {
  if (navigator.clipboard) navigator.clipboard.writeText(sources)
}
</script>

<template>
  <div class="chat">
    <header>
      <div class="logo">🤖 智能客服</div>
      <div class="spacer"></div>
      <button class="ghost" @click="newSession">新会话</button>
      <button class="ghost" @click="logout">退出</button>
    </header>

    <main ref="listEl" class="list">
      <div v-for="(m, i) in messages" :key="i" class="row" :class="m.role">
        <div class="bubble">
          <template v-if="m.role === 'assistant'">
            <div class="text">{{ splitSources(m.text).main }}</div>
            <div
              v-if="splitSources(m.text).sources"
              class="src"
              title="点击复制"
              @click="copySources(splitSources(m.text).sources)"
            >
              📎 {{ splitSources(m.text).sources }}
            </div>
            <div v-if="m.done" class="actions">
              <button
                :class="{ 'on-up': m.rated === 'up' }"
                title="有帮助"
                @click="rate(m, 'up')"
              >
                👍
              </button>
              <button
                :class="{ 'on-down': m.rated === 'down' }"
                title="没帮助"
                @click="rate(m, 'down')"
              >
                👎
              </button>
            </div>
          </template>
          <template v-else>{{ m.text }}</template>
          <span v-if="!m.done && m.role === 'assistant'" class="cursor"></span>
        </div>
      </div>
    </main>

    <footer>
      <textarea
        v-model="input"
        placeholder="输入你的问题…（Enter 发送，Shift+Enter 换行）"
        @keydown.enter.exact.prevent="send()"
      ></textarea>
      <button class="transfer" :disabled="busy" @click="transfer">转人工</button>
      <button class="send" :disabled="busy" @click="send()">发送</button>
    </footer>
  </div>
</template>

<style scoped>
.chat {
  height: 100%;
  display: flex;
  flex-direction: column;
}
header {
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo {
  font-weight: 600;
  font-size: 16px;
}
.spacer {
  flex: 1;
}
.ghost {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
.ghost:hover {
  background: var(--brand-weak);
}
.list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.row {
  display: flex;
}
.row.user {
  justify-content: flex-end;
}
.bubble {
  max-width: 76%;
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
}
.row.user .bubble {
  background: var(--user);
  color: var(--user-text);
  border-bottom-right-radius: 4px;
}
.row.assistant .bubble {
  background: var(--panel);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}
.cursor {
  display: inline-block;
  width: 7px;
  height: 14px;
  background: var(--brand);
  vertical-align: middle;
  margin-left: 2px;
  animation: blink 1s steps(2) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.src {
  color: var(--muted);
  font-size: 12px;
  margin-top: 6px;
  border-top: 1px dashed var(--border);
  padding-top: 6px;
  cursor: pointer;
  white-space: pre-wrap;
}
.actions {
  margin-top: 6px;
  display: flex;
  gap: 8px;
}
.actions button {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--muted);
  padding: 2px 6px;
  border-radius: 4px;
}
.actions button.on-up {
  color: var(--ok);
}
.actions button.on-down {
  color: var(--warn);
}
footer {
  background: var(--panel);
  border-top: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  gap: 10px;
  align-items: center;
}
textarea {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  resize: none;
  padding: 10px 12px;
  font-size: 14px;
  height: 44px;
}
textarea:focus {
  outline: none;
  border-color: var(--brand);
}
footer button {
  border: none;
  border-radius: 8px;
  padding: 0 18px;
  cursor: pointer;
  font-size: 14px;
  height: 44px;
}
.send {
  background: var(--brand);
  color: #fff;
}
.transfer {
  background: var(--brand-weak);
  color: var(--brand);
}
footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
