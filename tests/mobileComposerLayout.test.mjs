import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('ThreadComposer keeps mobile controls stable when the input is focused', async () => {
  const composer = await read('../src/components/content/ThreadComposer.vue')

  assert.match(composer, /@media\s*\(max-width:\s*720px\)/)
  assert.match(composer, /thread-composer-input[\s\S]*font-size:\s*16px/)
  assert.match(composer, /thread-composer-submit[\s\S]*min-width:\s*2\.5rem/)
  assert.match(composer, /thread-composer-stop[\s\S]*min-width:\s*2\.5rem/)
  assert.match(composer, /thread-composer-status-group[\s\S]*min-width:\s*0/)
  assert.match(composer, /thread-composer-branch-text[\s\S]*truncate/)
})

test('App centers the project dropdown menu on mobile home screen', async () => {
  const app = await read('../src/App.vue')

  assert.match(app, /new-thread-folder-dropdown[\s\S]*@media\s*\(max-width:\s*720px\)/)
  assert.match(app, /new-thread-folder-dropdown[\s\S]*left:\s*50%/)
  assert.match(app, /new-thread-folder-dropdown[\s\S]*translateX\(-50%\)/)
  assert.match(app, /new-thread-folder-dropdown[\s\S]*width:\s*min\(20rem,\s*calc\(100vw - 1\.5rem\)\)/)
})
