/**
 * 纯路径工具函数。
 * 从 App.vue 和 ThreadConversation.vue 中提取的重复/共用函数。
 */

export function normalizePathSeparators(pathValue: string): string {
  return pathValue.replace(/\\/gu, '/')
}

export function stripTrailingSlash(pathValue: string): string {
  if (!pathValue) return pathValue
  if (pathValue === '/') return pathValue
  return pathValue.replace(/\/+$/u, '')
}

export function getBasename(pathValue: string): string {
  const normalized = normalizePathSeparators(pathValue)
  const name = normalized.split('/').filter(Boolean).pop()
  return name || pathValue
}

export function isFilePath(value: string): boolean {
  if (!value || /\s/u.test(value)) return false
  if (value.endsWith('/') || value.endsWith('\\')) return false
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(value)) return false

  const looksLikeUnixAbsolute = value.startsWith('/')
  const looksLikeWindowsAbsolute = /^[A-Za-z]:[/\\]/u.test(value)
  const looksLikeRelative = value.startsWith('./') || value.startsWith('../') || value.startsWith('~/')
  const hasPathSeparator = value.includes('/') || value.includes('\\')
  return looksLikeUnixAbsolute || looksLikeWindowsAbsolute || looksLikeRelative || hasPathSeparator
}

export function collapsePathSegments(pathValue: string): string {
  const normalized = normalizePathSeparators(pathValue.trim())
  if (!normalized) return ''

  const isWindowsAbs = /^[A-Za-z]:\//u.test(normalized)
  const isUnixAbs = normalized.startsWith('/')
  const hasRoot = isWindowsAbs || isUnixAbs

  const rawParts = normalized.split('/')
  const parts: string[] = []
  for (const part of rawParts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (parts.length > 0 && parts[parts.length - 1] !== '..') {
        parts.pop()
      } else if (!hasRoot) {
        parts.push('..')
      }
      continue
    }
    parts.push(part)
  }

  if (isWindowsAbs) {
    const drive = rawParts[0] ?? ''
    const rest = parts.filter((part) => part.toLowerCase() !== drive.toLowerCase())
    return `${drive}/${rest.join('/')}`.replace(/\/+$/u, '')
  }

  if (isUnixAbs) {
    return `/${parts.join('/')}`.replace(/\/+$/u, '') || '/'
  }

  return parts.join('/')
}

export function resolvePathWithCwd(pathValue: string, cwd: string): string {
  const target = normalizePathSeparators(pathValue.trim())
  if (!target) return ''
  if (target.startsWith('/') || /^[A-Za-z]:\//u.test(target)) {
    return collapsePathSegments(target)
  }

  const base = collapsePathSegments(cwd)
  if (!base) return collapsePathSegments(target)
  return collapsePathSegments(`${base}/${target}`)
}

export function normalizePathForMatch(pathValue: string, cwd: string): string {
  const resolved = resolvePathWithCwd(pathValue, cwd)
  if (!resolved) return ''
  return resolved.toLowerCase()
}

export function formatDisplayPath(pathValue: string, cwd: string): string {
  const target = normalizePathSeparators(pathValue.trim())
  if (!target) return pathValue
  if (target.startsWith('./')) return target.slice(2)
  if (target.startsWith('../')) return target

  const normalizedCwd = stripTrailingSlash(normalizePathSeparators(cwd.trim()))
  if (normalizedCwd) {
    const lowerTarget = target.toLowerCase()
    const lowerCwd = normalizedCwd.toLowerCase()
    const prefix = `${lowerCwd}/`
    if (lowerTarget.startsWith(prefix)) {
      return target.slice(normalizedCwd.length + 1)
    }
  }

  const isAbsolute = target.startsWith('/') || /^[A-Za-z]:\//u.test(target)
  return isAbsolute ? getBasename(target) : target
}
