import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createCodexBridgeMiddleware } from '../src/server/codexAppServerBridge.ts'
import { readSharedSessionSnapshot, resolveSharedSessionSnapshotPath } from '../src/server/sharedSessionStore.ts'

function createDeferred() {
  let resolve
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

function createResponseCapture() {
  const headers = {}
  let body = ''
  return {
    headers,
    statusCode: 0,
    writableEnded: false,
    destroyed: false,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value
    },
    end(chunk) {
      if (typeof chunk === 'string') {
        body += chunk
      } else if (chunk) {
        body += Buffer.from(chunk).toString('utf8')
      }
      this.writableEnded = true
    },
    get body() {
      return body
    },
  }
}

function createJsonRequest(method, url, body) {
  const payload = JSON.stringify(body)
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(payload, 'utf8')
    },
  }
}

test('syncSharedSessionSnapshot writes a projected snapshot to disk', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  appServer.rpc = async (method, params) => {
    assert.equal(method, 'thread/read')
    assert.deepEqual(params, {
      threadId: 'thread-bridge-1',
      includeTurns: true,
    })
    return {
      thread: {
        id: 'thread-bridge-1',
        preview: 'Bridge preview title',
        cwd: '/repo-bridge',
        turns: [
          {
            id: 'turn-bridge-1',
            status: 'inProgress',
            items: [
              {
                type: 'userMessage',
                id: 'msg-user-1',
                content: [
                  {
                    type: 'text',
                    text: '请继续',
                    text_elements: [],
                  },
                ],
              },
              {
                type: 'agentMessage',
                id: 'msg-assistant-1',
                text: '我在继续',
              },
            ],
          },
        ],
      },
    }
  }
  appServer.persistedServerRequestsLoaded = Promise.resolve()
  appServer.pendingServerRequests.set(1, {
    id: 1,
    method: 'item/commandExecution/requestApproval',
    params: {
      threadId: 'thread-bridge-1',
    },
    receivedAtIso: '2026-04-04T10:00:00.000Z',
  })
  appServer.persistedServerRequests.set(2, {
    id: 2,
    method: 'item/fileChange/requestApproval',
    threadId: 'thread-bridge-1',
    turnId: 'turn-bridge-1',
    itemId: 'item-bridge-2',
    cwd: '/repo-bridge',
    params: {
      threadId: 'thread-bridge-1',
    },
    receivedAtIso: '2026-04-04T10:01:00.000Z',
    resolvedAtIso: null,
    resolutionKind: null,
    dismissedAtIso: null,
    dismissedReason: null,
    dismissedBy: null,
  })

  try {
    await appServer.syncSharedSessionSnapshot('thread-bridge-1')

    const snapshot = await readSharedSessionSnapshot('thread-bridge-1')
    assert.ok(snapshot, 'expected snapshot to be written')
    assert.equal(snapshot.sessionId, 'thread-bridge-1')
    assert.equal(snapshot.title, 'Bridge preview title')
    assert.equal(snapshot.cwd, '/repo-bridge')
    assert.equal(snapshot.owner, 'web')
    assert.equal(snapshot.state, 'needs_attention')
    assert.equal(snapshot.activeTurnId, 'turn-bridge-1')
    assert.deepEqual(snapshot.timeline.map((entry) => entry.kind), [
      'user_message',
      'assistant_message',
    ])
    assert.equal(snapshot.attention.pendingApprovalCount, 2)
    assert.deepEqual(snapshot.attention.pendingApprovalKinds, [
      'command',
      'file_change',
    ])
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

test('syncSharedSessionSnapshot waits for persisted ledger loading before writing snapshot', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  const loadDeferred = createDeferred()
  appServer.persistedServerRequestsLoaded = loadDeferred.promise
  appServer.rpc = async () => ({
    thread: {
      id: 'thread-bridge-load',
      preview: 'Loading bridge preview',
      cwd: '/repo-bridge',
      turns: [],
    },
  })

  const syncPromise = appServer.syncSharedSessionSnapshot('thread-bridge-load')
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(await readSharedSessionSnapshot('thread-bridge-load'), null)

  appServer.persistedServerRequests.set(21, {
    id: 21,
    method: 'item/commandExecution/requestApproval',
    threadId: 'thread-bridge-load',
    turnId: 'turn-bridge-load',
    itemId: 'item-bridge-load',
    cwd: '/repo-bridge',
    params: {
      threadId: 'thread-bridge-load',
    },
    receivedAtIso: '2026-04-04T10:20:00.000Z',
    resolvedAtIso: null,
    resolutionKind: null,
    dismissedAtIso: null,
    dismissedReason: null,
    dismissedBy: null,
  })
  loadDeferred.resolve()
  await syncPromise

  try {
    const snapshot = await readSharedSessionSnapshot('thread-bridge-load')
    assert.ok(snapshot, 'expected snapshot to be written after ledger load')
    assert.equal(snapshot?.attention.pendingApprovalCount, 1)
    assert.deepEqual(snapshot?.attention.pendingApprovalKinds, ['command'])
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

test('handleServerRequest swallows shared snapshot refresh failures', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  appServer.sendServerRequestReply = () => {}
  appServer.syncSharedSessionSnapshot = async () => {
    throw new Error('snapshot refresh failed')
  }

  try {
    assert.doesNotThrow(() => {
      appServer.handleServerRequest(11, 'item/commandExecution/requestApproval', {
        threadId: 'thread-bridge-2',
      })
    })
    await new Promise((resolve) => setImmediate(resolve))
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

test('turn lifecycle notifications trigger shared snapshot refresh for the related thread', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  const observedThreadIds = []
  appServer.syncSharedSessionSnapshot = async (threadId) => {
    observedThreadIds.push(threadId)
  }

  try {
    appServer.handleLine(JSON.stringify({
      jsonrpc: '2.0',
      method: 'turn/started',
      params: {
        threadId: 'thread-turn-started',
      },
    }))
    appServer.handleLine(JSON.stringify({
      jsonrpc: '2.0',
      method: 'turn/completed',
      params: {
        turn: {
          threadId: 'thread-turn-completed',
          id: 'turn-1',
          status: 'failed',
        },
      },
    }))

    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(observedThreadIds.sort(), ['thread-turn-completed', 'thread-turn-started'])
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

test('turn start and interrupt RPC calls trigger shared snapshot refresh after success', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  const observedThreadIds = []
  appServer.syncSharedSessionSnapshot = async (threadId) => {
    observedThreadIds.push(threadId)
  }
  appServer.rpc = async (method, params) => {
    assert.ok(method === 'turn/start' || method === 'turn/interrupt')
    return {
      ok: true,
      params,
    }
  }

  async function callMiddleware(method, url, body) {
    const req = createJsonRequest(method, url, body)
    const res = createResponseCapture()
    let nextCalled = false
    await middleware(req, res, () => {
      nextCalled = true
    })
    return { res, nextCalled }
  }

  try {
    const startResponse = await callMiddleware('POST', '/codex-api/rpc', {
      method: 'turn/start',
      params: {
        threadId: 'thread-turn-rpc',
      },
    })
    assert.equal(startResponse.nextCalled, false)
    assert.equal(startResponse.res.statusCode, 200)

    const interruptResponse = await callMiddleware('POST', '/codex-api/rpc', {
      method: 'turn/interrupt',
      params: {
        threadId: 'thread-turn-rpc',
        turnId: 'turn-turn-rpc',
      },
    })
    assert.equal(interruptResponse.nextCalled, false)
    assert.equal(interruptResponse.res.statusCode, 200)

    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(observedThreadIds, ['thread-turn-rpc', 'thread-turn-rpc'])
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

test('resolvePendingServerRequest refreshes after persisted state is marked resolved', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  appServer.sendServerRequestReply = () => {}
  appServer.persistedServerRequestsLoaded = Promise.resolve()
  appServer.pendingServerRequests.set(12, {
    id: 12,
    method: 'item/commandExecution/requestApproval',
    params: {
      threadId: 'thread-bridge-2',
    },
    receivedAtIso: '2026-04-04T10:11:00.000Z',
    threadId: 'thread-bridge-2',
  })
  appServer.persistedServerRequests.set(12, {
    id: 12,
    method: 'item/commandExecution/requestApproval',
    threadId: 'thread-bridge-2',
    turnId: 'turn-bridge-2',
    itemId: 'item-bridge-12',
    cwd: '/repo-bridge',
    params: {
      threadId: 'thread-bridge-2',
    },
    receivedAtIso: '2026-04-04T10:11:00.000Z',
    resolvedAtIso: null,
    resolutionKind: null,
    dismissedAtIso: null,
    dismissedReason: null,
    dismissedBy: null,
  })

  const syncObserved = createDeferred()
  let observedResolvedAtIso = null
  appServer.syncSharedSessionSnapshot = async (threadId) => {
    assert.equal(threadId, 'thread-bridge-2')
    observedResolvedAtIso = appServer.persistedServerRequests.get(12)?.resolvedAtIso ?? null
    syncObserved.resolve()
    throw new Error('snapshot refresh failed')
  }

  try {
    assert.doesNotThrow(() => {
      appServer.resolvePendingServerRequest(12, { result: { ok: true } })
    })

    await syncObserved.promise
    assert.notEqual(observedResolvedAtIso, null)
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

test('bridge shared session endpoints return snapshot data', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  appServer.rpc = async () => ({
    thread: {
      id: 'thread-bridge-3',
      preview: 'Bridge preview list',
      cwd: '/repo-bridge',
      turns: [],
    },
  })
  appServer.persistedServerRequestsLoaded = Promise.resolve()
  await appServer.syncSharedSessionSnapshot('thread-bridge-3')

  async function callMiddleware(method, url) {
    const req = {
      method,
      url,
    }
    const res = createResponseCapture()
    let nextCalled = false
    await middleware(req, res, () => {
      nextCalled = true
    })
    return { res, nextCalled }
  }

  try {
    const listResponse = await callMiddleware('GET', '/codex-api/shared-sessions')
    assert.equal(listResponse.nextCalled, false)
    const listBody = JSON.parse(listResponse.res.body)
    assert.ok(Array.isArray(listBody.data))
    assert.equal(listBody.data[0]?.sessionId, 'thread-bridge-3')

    const singleResponse = await callMiddleware('GET', '/codex-api/shared-sessions/thread-bridge-3')
    assert.equal(singleResponse.nextCalled, false)
    const singleBody = JSON.parse(singleResponse.res.body)
    assert.equal(singleBody.data?.sessionId, 'thread-bridge-3')
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

test('dismissPersistedServerRequests triggers snapshot refresh per thread once', async () => {
  const previousCodexHome = process.env.CODEX_HOME
  const globalScope = globalThis
  const previousSharedBridge = globalScope.__codexRemoteSharedBridge__
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codex-web-local-shared-session-bridge-'))
  process.env.CODEX_HOME = tempCodexHome
  delete globalScope.__codexRemoteSharedBridge__

  const middleware = createCodexBridgeMiddleware()
  const appServer = globalScope.__codexRemoteSharedBridge__?.appServer
  assert.ok(appServer, 'expected shared appServer instance')

  const observedThreadIds = []
  appServer.syncSharedSessionSnapshot = async (threadId) => {
    observedThreadIds.push(threadId)
  }
  appServer.persistedServerRequestsLoaded = Promise.resolve()
  appServer.persistedServerRequests.set(41, {
    id: 41,
    method: 'item/commandExecution/requestApproval',
    threadId: 'thread-dismiss-a',
    turnId: 'turn-dismiss-a',
    itemId: 'item-dismiss-a1',
    cwd: '/repo-bridge',
    params: { threadId: 'thread-dismiss-a' },
    receivedAtIso: '2026-04-04T10:30:00.000Z',
    resolvedAtIso: null,
    resolutionKind: null,
    dismissedAtIso: null,
    dismissedReason: null,
    dismissedBy: null,
  })
  appServer.persistedServerRequests.set(42, {
    id: 42,
    method: 'item/fileChange/requestApproval',
    threadId: 'thread-dismiss-a',
    turnId: 'turn-dismiss-a',
    itemId: 'item-dismiss-a2',
    cwd: '/repo-bridge',
    params: { threadId: 'thread-dismiss-a' },
    receivedAtIso: '2026-04-04T10:31:00.000Z',
    resolvedAtIso: null,
    resolutionKind: null,
    dismissedAtIso: null,
    dismissedReason: null,
    dismissedBy: null,
  })
  appServer.persistedServerRequests.set(43, {
    id: 43,
    method: 'item/commandExecution/requestApproval',
    threadId: 'thread-dismiss-b',
    turnId: 'turn-dismiss-b',
    itemId: 'item-dismiss-b1',
    cwd: '/repo-bridge',
    params: { threadId: 'thread-dismiss-b' },
    receivedAtIso: '2026-04-04T10:32:00.000Z',
    resolvedAtIso: null,
    resolutionKind: null,
    dismissedAtIso: null,
    dismissedReason: null,
    dismissedBy: null,
  })

  try {
    const dismissed = await appServer.dismissPersistedServerRequests([41, 42, 43])
    assert.deepEqual(dismissed, [41, 42, 43])
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(observedThreadIds.sort(), ['thread-dismiss-a', 'thread-dismiss-b'])
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
