import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('ApprovalRequestCard uses a unified approval shell with productized Chinese copy', async () => {
  const [card, uiText] = await Promise.all([
    read('../src/components/content/ApprovalRequestCard.vue'),
    read('../src/i18n/uiText.ts'),
  ])

  assert.match(card, /approval-card/)
  assert.match(card, /approval-option/)
  assert.match(card, /approval-code-block/)
  assert.match(card, /approval-submit-button/)
  assert.match(card, /approval-skip-button/)
  assert.match(card, /threadConversation\.approvalSubmit/)
  assert.match(card, /threadConversation\.approvalSkip/)
  assert.match(uiText, /'threadConversation\.approvalCommandTitle'/)
  assert.match(uiText, /'threadConversation\.approvalFileTitle'/)
  assert.match(uiText, /'threadConversation\.approvalSubmit'/)
  assert.match(uiText, /'threadConversation\.approvalSkip'/)
})

test('ThreadConversation routes command and file approvals through ApprovalRequestCard', async () => {
  const conversation = await read('../src/components/content/ThreadConversation.vue')

  assert.match(conversation, /import ApprovalRequestCard from '\.\/ApprovalRequestCard\.vue'/)
  assert.match(conversation, /request\.method === 'item\/commandExecution\/requestApproval'/)
  assert.match(conversation, /request\.method === 'item\/fileChange\/requestApproval'/)
  assert.match(conversation, /<ApprovalRequestCard/)
  assert.match(conversation, /buildApprovalRequestDisplayModel/)
  assert.match(conversation, /decision: 'cancel'/)
  assert.doesNotMatch(conversation, /request-title">\{\{ request\.method \}\}/)
})
