/**
 * Markdown / 消息文本解析引擎。
 * 从 ThreadConversation.vue 提取的纯函数集合。
 */

import { isFilePath, formatDisplayPath } from './pathUtils'

// ─── 类型定义 ────────────────────────────────────────────────
export type InlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'file'; value: string; displayName: string; path: string; line: number | null }
  | { kind: 'markdownLink'; label: string; href: string; path: string; line: number | null }

export type MessageBlock =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string; language: string }

export type TextPart =
  | { kind: 'paragraph'; value: string }
  | { kind: 'list'; items: string[] }

// ─── 字符串 / 引用处理 ──────────────────────────────────────

export function stripEnclosingQuotes(value: string): string {
  let current = value.trim()
  const quotePairs: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ['`', '`'],
    ['\u201c', '\u201d'],
    ['\u2018', '\u2019'],
  ]

  let changed = true
  while (changed) {
    changed = false
    for (const [left, right] of quotePairs) {
      if (current.length >= 2 && current.startsWith(left) && current.endsWith(right)) {
        current = current.slice(left.length, current.length - right.length).trim()
        changed = true
      }
    }
  }

  return current
}

export function unwrapMarkdownLinkTarget(value: string): string {
  const trimmed = stripEnclosingQuotes(value)
  const markdownLinkMatch = trimmed.match(/^\[[^\]]+\]\((.+)\)$/u)
  if (!markdownLinkMatch) return trimmed
  return stripEnclosingQuotes(markdownLinkMatch[1].trim())
}

// ─── 文件引用解析 ────────────────────────────────────────────

export function parseFileReference(value: string): { path: string; line: number | null } | null {
  if (!value) return null

  let pathValue = unwrapMarkdownLinkTarget(value)
  let line: number | null = null

  const hashLineMatch = pathValue.match(/^(.*)#L(\d+)(?:C\d+)?$/u)
  if (hashLineMatch) {
    pathValue = hashLineMatch[1]
    line = Number(hashLineMatch[2])
  } else {
    const colonLineMatch = pathValue.match(/^(.*):(\d+)(?::\d+)?$/u)
    if (colonLineMatch) {
      pathValue = colonLineMatch[1]
      line = Number(colonLineMatch[2])
    }
  }

  if (!isFilePath(pathValue)) return null
  return { path: pathValue, line }
}

export function isPathLikeLabel(value: string): boolean {
  return parseFileReference(value) !== null
}

export function buildFileReferenceHrefFromValue(path: string, line: number | null): string {
  const basePath = path.trim()
  if (!basePath) return '#'
  return line ? `${basePath}:${String(line)}` : basePath
}

// ─── 路径显示格式化 (需要 cwd) ─────────────────────────────

export function formatDisplayPathWithLine(pathValue: string, line: number | null, cwd: string): string {
  const displayPath = formatDisplayPath(pathValue, cwd)
  return line ? `${displayPath}:${String(line)}` : displayPath
}

export function formatMarkdownFileLabel(label: string, pathValue: string, line: number | null, cwd: string): string {
  const trimmed = stripEnclosingQuotes(label.trim())
  if (!trimmed) return formatDisplayPathWithLine(pathValue, line, cwd)
  if (isPathLikeLabel(trimmed)) return formatDisplayPathWithLine(pathValue, line, cwd)
  return trimmed
}

// ─── Worked 消息解析 ─────────────────────────────────────────

export function extractWorkedDuration(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return '<1s'
  if (trimmed.toLowerCase().startsWith('worked for ')) {
    return trimmed.slice('worked for '.length).trim() || '<1s'
  }
  if (trimmed.startsWith('耗时')) {
    return trimmed.slice(2).trim() || '<1s'
  }
  return trimmed
}

// ─── Markdown 块级解析 ──────────────────────────────────────

export function parseMessageBlocks(text: string): MessageBlock[] {
  const normalizedText = text.replace(/\r\n/gu, '\n')
  if (!normalizedText.includes('```')) {
    return [{ kind: 'text', value: text }]
  }

  const blocks: MessageBlock[] = []
  const fencedRegex = /(^|\n)```([^\n`]*)\n([\s\S]*?)\n```(?=\n|$)/gu
  let cursor = 0

  while (true) {
    const match = fencedRegex.exec(normalizedText)
    if (!match) break

    const fullMatch = match[0] || ''
    const prefix = match[1] || ''
    const infoString = (match[2] || '').trim()
    const codeContent = match[3] || ''
    const matchStart = match.index + prefix.length
    const matchEnd = matchStart + fullMatch.length

    if (matchStart > cursor) {
      blocks.push({ kind: 'text', value: normalizedText.slice(cursor, matchStart) })
    }

    const language = infoString.split(/\s+/u)[0] || ''
    blocks.push({
      kind: 'code',
      value: codeContent.replace(/\r?\n$/u, ''),
      language,
    })

    cursor = matchEnd
  }

  if (cursor < normalizedText.length) {
    blocks.push({ kind: 'text', value: normalizedText.slice(cursor) })
  }

  return blocks.length > 0 ? blocks : [{ kind: 'text', value: normalizedText }]
}

export function parseTextParts(text: string): TextPart[] {
  const lines = text.split('\n')
  const parts: TextPart[] = []
  let paragraphBuffer: string[] = []
  let listBuffer: string[] = []

  const flushParagraph = (): void => {
    if (paragraphBuffer.length === 0) return
    const value = paragraphBuffer.join('\n').trim()
    paragraphBuffer = []
    if (value) {
      parts.push({ kind: 'paragraph', value })
    }
  }

  const flushList = (): void => {
    if (listBuffer.length === 0) return
    const items = listBuffer.map((item) => item.trim()).filter((item) => item.length > 0)
    listBuffer = []
    if (items.length > 0) {
      parts.push({ kind: 'list', items })
    }
  }

  for (const line of lines) {
    const listMatch = line.match(/^\s*-\s+(.+)$/u)
    if (listMatch) {
      flushParagraph()
      listBuffer.push(listMatch[1])
      continue
    }

    if (line.trim().length === 0) {
      flushParagraph()
      flushList()
      continue
    }

    flushList()
    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()
  return parts
}

// ─── 行内解析 ────────────────────────────────────────────────

function parseMarkdownLinks(text: string, cwd: string): InlineSegment[] {
  const parts: InlineSegment[] = []
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/gu
  let cursor = 0

  while (true) {
    const match = markdownLinkRegex.exec(text)
    if (!match) break

    const [fullMatch, labelRaw, hrefRaw] = match
    const matchStart = match.index
    const matchEnd = matchStart + fullMatch.length

    if (matchStart > cursor) {
      parts.push({ kind: 'text', value: text.slice(cursor, matchStart) })
    }

    const label = labelRaw.trim() || hrefRaw.trim()
    const href = stripEnclosingQuotes(hrefRaw.trim())
    const fileReference = parseFileReference(href)
    if (fileReference) {
      parts.push({
        kind: 'markdownLink',
        label: formatMarkdownFileLabel(label, fileReference.path, fileReference.line, cwd),
        href: buildFileReferenceHrefFromValue(fileReference.path, fileReference.line),
        path: fileReference.path,
        line: fileReference.line,
      })
    } else {
      parts.push({
        kind: 'markdownLink',
        label,
        href,
        path: '',
        line: null,
      })
    }

    cursor = matchEnd
  }

  if (cursor < text.length) {
    parts.push({ kind: 'text', value: text.slice(cursor) })
  }

  return parts.length > 0 ? parts : [{ kind: 'text', value: text }]
}

function expandBoldSegments(segments: InlineSegment[]): InlineSegment[] {
  const expanded: InlineSegment[] = []
  const boldRegex = /\*\*([^*]+)\*\*/gu

  for (const segment of segments) {
    if (segment.kind !== 'text') {
      expanded.push(segment)
      continue
    }

    const text = segment.value
    let cursor = 0
    let matched = false

    while (true) {
      const match = boldRegex.exec(text)
      if (!match) break
      matched = true

      const [fullMatch, boldText] = match
      const start = match.index
      const end = start + fullMatch.length

      if (start > cursor) {
        expanded.push({ kind: 'text', value: text.slice(cursor, start) })
      }
      expanded.push({ kind: 'bold', value: boldText })
      cursor = end
    }

    if (!matched) {
      expanded.push(segment)
      continue
    }

    if (cursor < text.length) {
      expanded.push({ kind: 'text', value: text.slice(cursor) })
    }
  }

  return expanded
}

function expandMarkdownLinks(segments: InlineSegment[], cwd: string): InlineSegment[] {
  const expanded: InlineSegment[] = []
  for (const segment of segments) {
    if (segment.kind === 'text') {
      expanded.push(...expandBoldSegments(parseMarkdownLinks(segment.value, cwd)))
      continue
    }
    expanded.push(segment)
  }
  return expanded
}

export function parseInlineSegments(text: string, cwd: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  let cursor = 0
  let textStart = 0

  while (cursor < text.length) {
    if (text[cursor] !== '`') {
      cursor += 1
      continue
    }

    let openLength = 1
    while (cursor + openLength < text.length && text[cursor + openLength] === '`') {
      openLength += 1
    }
    const delimiter = '`'.repeat(openLength)

    let searchFrom = cursor + openLength
    let closingStart = -1
    while (searchFrom < text.length) {
      const candidate = text.indexOf(delimiter, searchFrom)
      if (candidate < 0) break

      const hasBacktickBefore = candidate > 0 && text[candidate - 1] === '`'
      const hasBacktickAfter =
        candidate + openLength < text.length && text[candidate + openLength] === '`'
      const hasNewLineInside = text.slice(cursor + openLength, candidate).includes('\n')

      if (!hasBacktickBefore && !hasBacktickAfter && !hasNewLineInside) {
        closingStart = candidate
        break
      }
      searchFrom = candidate + 1
    }

    if (closingStart < 0) {
      cursor += openLength
      continue
    }

    if (cursor > textStart) {
      segments.push({ kind: 'text', value: text.slice(textStart, cursor) })
    }

    const token = text.slice(cursor + openLength, closingStart)
    if (token.length > 0) {
      // Backtick-wrapped segments must stay as code, even if they look like paths.
      segments.push({ kind: 'code', value: token })
    } else {
      segments.push({ kind: 'text', value: `${delimiter}${delimiter}` })
    }

    cursor = closingStart + openLength
    textStart = cursor
  }

  if (textStart < text.length) {
    segments.push({ kind: 'text', value: text.slice(textStart) })
  }

  return expandMarkdownLinks(segments, cwd)
}
