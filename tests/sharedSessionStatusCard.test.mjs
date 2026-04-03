import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('SharedSessionStatusCard defines a read-only shared session status shell', async () => {
  const component = await read('../src/components/content/SharedSessionStatusCard.vue')

  assert.match(component, /shared-session-status-card/)
  assert.match(component, /shared-session-status-chip/)
  assert.match(component, /shared-session-status-summary/)
  assert.match(component, /shared-session-status-meta/)
  assert.match(component, /shared-session-status-pill/)
  assert.doesNotMatch(component, /emit\('/)
})

test('App renders SharedSessionStatusCard above ThreadConversation when snapshot exists', async () => {
  const app = await read('../src/App.vue')

  assert.match(app, /import SharedSessionStatusCard from '\.\/components\/content\/SharedSessionStatusCard\.vue'/)
  assert.match(app, /selectedSharedSessionSnapshot/)
  assert.match(app, /<SharedSessionStatusCard/)
  assert.match(app, /v-if="selectedSharedSessionSnapshot"/)
  assert.match(app, /:snapshot="selectedSharedSessionSnapshot"/)
  assert.match(app, /:ui-language="uiLanguage"/)
  assert.match(app, /<ThreadConversation/)
})

test('uiText defines Chinese product copy for shared session status states and labels', async () => {
  const uiText = await read('../src/i18n/uiText.ts')

  assert.match(uiText, /'app\.sharedSessionStatusRunning'/)
  assert.match(uiText, /'app\.sharedSessionStatusNeedsAttention'/)
  assert.match(uiText, /'app\.sharedSessionStatusFailed'/)
  assert.match(uiText, /'app\.sharedSessionStatusInterrupted'/)
  assert.match(uiText, /'app\.sharedSessionStatusStaleOwner'/)
  assert.match(uiText, /'app\.sharedSessionOwnerWeb'/)
  assert.match(uiText, /'app\.sharedSessionOwnerTerminal'/)
  assert.match(uiText, /'app\.sharedSessionLatestTurn'/)
  assert.match(uiText, /'app\.sharedSessionPendingApprovals'/)
  assert.match(uiText, /'app\.sharedSessionReturnToOwner'/)
})
