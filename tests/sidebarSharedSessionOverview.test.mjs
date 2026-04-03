import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('SidebarThreadTree accepts shared snapshot mapping and renders unified owner-state summary', async () => {
  const tree = await read('../src/components/sidebar/SidebarThreadTree.vue')

  assert.match(tree, /sharedSessionSnapshotByThreadId: Record<string, UiSharedSessionSnapshot>/)
  assert.match(tree, /thread-row-text/)
  assert.match(tree, /thread-row-shared-summary/)
  assert.match(tree, /readSharedSessionThreadSummary/)
  assert.match(tree, /readSharedSessionThreadSummaryState/)
  assert.match(tree, /ownerLabel/)
  assert.match(tree, /stateLabel/)
})

test('App passes shared snapshot mapping into SidebarThreadTree', async () => {
  const app = await read('../src/App.vue')

  assert.match(app, /sharedSessionSnapshotByThreadId/)
  assert.match(app, /:shared-session-snapshot-by-thread-id="sharedSessionSnapshotByThreadId"/)
})
