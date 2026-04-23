import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createCodexBridgeMiddleware } from '../src/server/codexAppServerBridge.ts'

function createDeferred() {
  let resolve
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

test('resolvePendingServerRequest waits for persisted fallback conversion before recording resolution', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-server-request-test-'))

  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  const persistedRecord = {
    id: 42,
    method: 'workspace/approve',
    threadId: '',
    turnId: '',
    itemId: '',
    cwd: '/tmp/workspace',
    params: { cwd: '/tmp/workspace' },
    receivedAtIso: '2026-04-02T12:00:00.000Z',
    resolvedAtIso: null,
    resolutionKind: null,
    dismissedAtIso: null,
    dismissedReason: null,
    dismissedBy: null,
  }
  const deferredPersisted = createDeferred()

  appServer.sendServerRequestReply = () => {}
  appServer.toPersistedServerRequest = () => deferredPersisted.promise

  try {
    appServer.handleServerRequest(
      persistedRecord.id,
      persistedRecord.method,
      persistedRecord.params,
    )
    appServer.resolvePendingServerRequest(persistedRecord.id, {
      result: { ok: true },
    })

    deferredPersisted.resolve(persistedRecord)

    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))
    await appServer.persistedServerRequestsFlushChain

    const ledgerPath = join(tempCodexHome, 'codex-web-local', 'persisted-server-requests.json')
    const ledgerRaw = await readFile(ledgerPath, 'utf8')
    const ledger = JSON.parse(ledgerRaw)
    const [request] = ledger.requests ?? []

    assert.equal(typeof request?.id, 'number')
    assert.equal(request?.id, persistedRecord.id)
    assert.equal(request?.method, persistedRecord.method)
    assert.equal(request?.receivedAtIso, persistedRecord.receivedAtIso)
    assert.equal(request?.cwd, persistedRecord.cwd)
    assert.equal(request?.resolutionKind, 'resolved')
    assert.equal(typeof request?.resolvedAtIso, 'string')
  } finally {
    middleware.dispose()
    delete globalScope.__codexRemoteSharedBridge__
    if (previousSharedBridge) {
      globalScope.__codexRemoteSharedBridge__ = previousSharedBridge
    }
    if (previousCodexHome === undefined) {
      delete process.env.CODEX_HOME
    } else {
      process.env.CODEX_HOME = previousCodexHome
    }
    await rm(tempCodexHome, { recursive: true, force: true })
  }
})
