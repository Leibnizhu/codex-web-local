import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('desktop-state storage exposes load/save helpers for thread file changes', async () => {
  const storage = await read('../src/composables/desktop-state/storage.ts')

  assert.match(storage, /const FILE_CHANGES_STORAGE_KEY = 'codex-web-local\.thread-file-changes\.v2'/)
  assert.match(storage, /const FILE_CHANGES_DEBUG_STORAGE_KEY = 'codex-web-local\.debug\.file-changes\.v1'/)
  assert.match(storage, /const MAX_STORED_FILE_CHANGE_THREADS = 20/)
  assert.match(storage, /type StoredTurnFileChangesSummary = \{/)
  assert.match(storage, /export function loadLatestFileChangesMap\(\): Record<string, UiTurnFileChanges>/)
  assert.match(storage, /export function saveLatestFileChangesMap\(state: Record<string, UiTurnFileChanges>\): void/)
  assert.match(storage, /window\.localStorage\.getItem\(FILE_CHANGES_STORAGE_KEY\)/)
  assert.match(storage, /import\.meta\.env\.DEV/)
  assert.match(storage, /window\.localStorage\.getItem\(FILE_CHANGES_DEBUG_STORAGE_KEY\) === '1'/)
  assert.match(storage, /diff: ''/)
  assert.match(storage, /slice\(0, MAX_STORED_FILE_CHANGE_THREADS\)/)
  assert.doesNotMatch(storage, /window\.localStorage\.setItem\(FILE_CHANGES_STORAGE_KEY, JSON\.stringify\(state\)\)/)
})

test('useDesktopState restores and persists thread file changes across refreshes', async () => {
  const state = await read('../src/composables/useDesktopState.ts')
  const conversation = await read('../src/components/content/ThreadConversation.vue')

  assert.match(state, /loadLatestFileChangesMap/)
  assert.match(state, /saveLatestFileChangesMap/)
  assert.match(state, /const latestFileChangesByThreadId = ref<Record<string, UiTurnFileChanges>>\(loadLatestFileChangesMap\(\)\)/)
  assert.match(state, /saveLatestFileChangesMap\(latestFileChangesByThreadId\.value\)/)
  assert.match(state, /debugFileChangesState/)
  assert.match(conversation, /:disabled="!change\.diff\.trim\(\)\.length"/)
})
