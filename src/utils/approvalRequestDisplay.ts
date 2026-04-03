import type { UiChangedFile, UiServerRequest, UiTurnFileChanges } from '../types/codex'

export type ApprovalDecision =
  | 'accept'
  | 'acceptForSession'
  | 'decline'
  | 'cancel'
  | { acceptWithExecpolicyAmendment: { execpolicy_amendment: string[] } }

export type ApprovalOption = {
  id: string
  number: number
  label: string
  description: string
  decision: ApprovalDecision
}

export type CommandApprovalDisplayModel = {
  kind: 'command'
  title: string
  description: string
  command: string
  cwd: string
  reason: string
  summary: string
  options: ApprovalOption[]
  defaultOptionId: string
}

export type FileChangeApprovalDisplayModel = {
  kind: 'fileChange'
  title: string
  description: string
  grantRoot: string
  reason: string
  fileCount: number
  totalAdditions: number
  totalDeletions: number
  files: UiChangedFile[]
  options: ApprovalOption[]
  defaultOptionId: string
}

export type ApprovalRequestDisplayModel =
  | CommandApprovalDisplayModel
  | FileChangeApprovalDisplayModel

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function readText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function readCommandActionSummary(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return ''

  const labels = value
    .map((entry) => asRecord(entry))
    .map((action) => {
      switch (action?.type) {
        case 'read':
          return '读取文件'
        case 'listFiles':
          return '查看目录'
        case 'search':
          return '搜索内容'
        default:
          return ''
      }
    })
    .filter((label) => label.length > 0)

  return Array.from(new Set(labels)).join('、')
}

function buildCommandOptions(params: JsonRecord): ApprovalOption[] {
  const proposedExecpolicyAmendment = Array.isArray(params.proposedExecpolicyAmendment)
    ? params.proposedExecpolicyAmendment.filter((entry): entry is string => typeof entry === 'string')
    : []

  const secondDecision: ApprovalDecision = proposedExecpolicyAmendment.length > 0
    ? {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: proposedExecpolicyAmendment,
        },
      }
    : 'acceptForSession'

  return [
    {
      id: 'accept',
      number: 1,
      label: '允许本次执行',
      description: '继续当前操作，仅对这一次生效。',
      decision: 'accept',
    },
    {
      id: 'remember',
      number: 2,
      label: '允许本次执行，并对后续同类命令减少重复确认',
      description: proposedExecpolicyAmendment.length > 0
        ? '按当前建议规则授权后，后续匹配命令可减少重复询问。'
        : '在当前会话内记住这次授权，减少重复确认。',
      decision: secondDecision,
    },
    {
      id: 'decline',
      number: 3,
      label: '拒绝，并让 Codex 调整方案',
      description: '拒绝本次执行，让后续方案回到更安全的路径。',
      decision: 'decline',
    },
  ]
}

function buildFileOptions(): ApprovalOption[] {
  return [
    {
      id: 'accept',
      number: 1,
      label: '允许应用本次改动',
      description: '继续当前改动，仅应用这一次的文件写入。',
      decision: 'accept',
    },
    {
      id: 'session',
      number: 2,
      label: '允许本次改动，并在本会话内减少同类确认',
      description: '在当前会话内记住这次授权，减少重复确认。',
      decision: 'acceptForSession',
    },
    {
      id: 'decline',
      number: 3,
      label: '拒绝这次改动',
      description: '拒绝本次文件写入，让 Codex 改用其他方案。',
      decision: 'decline',
    },
  ]
}

export function buildApprovalRequestDisplayModel(
  request: UiServerRequest,
  fileChanges: UiTurnFileChanges | null = null,
): ApprovalRequestDisplayModel | null {
  const params = asRecord(request.params)
  if (!params) return null

  if (request.method === 'item/commandExecution/requestApproval') {
    const reason = readText(params.reason, '该操作需要你的授权后才能继续。')
    const summary = readCommandActionSummary(params.commandActions)
    return {
      kind: 'command',
      title: '是否允许执行此命令？',
      description: '该操作需要你的授权后才能继续',
      command: readText(params.command, '未提供命令内容'),
      cwd: readText(params.cwd, '未提供执行目录'),
      reason,
      summary,
      options: buildCommandOptions(params),
      defaultOptionId: 'accept',
    }
  }

  if (request.method === 'item/fileChange/requestApproval') {
    const matchedFileChanges = fileChanges?.turnId === request.turnId ? fileChanges : null
    return {
      kind: 'fileChange',
      title: '是否允许应用这些文件改动？',
      description: '这些改动需要你的确认后才能写入工作区',
      grantRoot: readText(params.grantRoot, '未限制写入目录'),
      reason: readText(params.reason, '该操作需要写入工作区文件。'),
      fileCount: matchedFileChanges?.files.length ?? 0,
      totalAdditions: matchedFileChanges?.totalAdditions ?? 0,
      totalDeletions: matchedFileChanges?.totalDeletions ?? 0,
      files: matchedFileChanges?.files ?? [],
      options: buildFileOptions(),
      defaultOptionId: 'accept',
    }
  }

  return null
}
