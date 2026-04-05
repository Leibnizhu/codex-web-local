import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readFixture(name) {
  return readFile(new URL(`./fixtures/thread-file-changes-fallback/${name}`, import.meta.url), 'utf8')
}

async function loadFallbackParser() {
  return import('../src/server/threadFileChangesFallback.ts')
}

test('extracts the latest file-change summary from apply_patch session jsonl', async () => {
  const { readThreadFileChangesFallbackFromSessionJsonl } = await loadFallbackParser()
  const sessionJsonl = await readFixture('session-apply-patch.jsonl')

  const summary = await readThreadFileChangesFallbackFromSessionJsonl(sessionJsonl)

  assert.ok(summary)
  assert.equal(summary.turnId, 'turn-2')
  assert.equal(summary.files.length, 1)
  assert.equal(summary.files[0].path, 'docs/plans/obsolete.md')
  assert.equal(summary.files[0].diff, '')
  assert.equal(typeof summary.totalAdditions, 'number')
  assert.equal(typeof summary.totalDeletions, 'number')
  assert.ok(summary.totalAdditions >= 0)
  assert.ok(summary.totalDeletions >= 0)
})

test('returns null when session jsonl has no file-change events', async () => {
  const { readThreadFileChangesFallbackFromSessionJsonl } = await loadFallbackParser()
  const sessionJsonl = await readFixture('session-no-file-change.jsonl')

  const summary = await readThreadFileChangesFallbackFromSessionJsonl(sessionJsonl)

  assert.equal(summary, null)
})

test('ignores malformed or incomplete records without throwing', async () => {
  const { readThreadFileChangesFallbackFromSessionJsonl } = await loadFallbackParser()
  const sessionJsonl = `${await readFixture('session-apply-patch.jsonl')}\n{"type":"response_item","turnId":"turn-3","item":`

  await assert.doesNotReject(async () => {
    const summary = await readThreadFileChangesFallbackFromSessionJsonl(sessionJsonl)
    assert.equal(summary?.turnId, 'turn-2')
  })
})

test('inherits turn id from surrounding task lifecycle records when apply_patch item omits it', async () => {
  const { readThreadFileChangesFallbackFromSessionJsonl } = await loadFallbackParser()
  const sessionJsonl = [
    '{"type":"event_msg","payload":{"type":"task_started","turn_id":"turn-real-1"}}',
    '{"type":"response_item","payload":{"type":"custom_tool_call","name":"apply_patch","input":"*** Begin Patch\\n*** Add File: sample.txt\\n+fallback sample\\n*** End Patch"}}',
  ].join('\n')

  const summary = await readThreadFileChangesFallbackFromSessionJsonl(sessionJsonl)

  assert.ok(summary)
  assert.equal(summary.turnId, 'turn-real-1')
  assert.equal(summary.files[0]?.path, 'sample.txt')
})
