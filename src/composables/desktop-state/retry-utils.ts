function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function retryWithResult(
  action: () => Promise<void>,
  options: {
    attempts: number
    baseDelayMs: number
    shouldRetry: (error: unknown) => boolean
  },
): Promise<boolean> {
  const { attempts, baseDelayMs, shouldRetry } = options
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await action()
      return true
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error
      }
      if (attempt >= attempts) {
        return false
      }
      await delayMs(baseDelayMs * attempt)
    }
  }
  return false
}

export async function retryOrThrow(
  action: () => Promise<void>,
  options: {
    attempts: number
    baseDelayMs: number
    shouldRetry: (error: unknown) => boolean
  },
): Promise<void> {
  const { attempts, baseDelayMs, shouldRetry } = options
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await action()
      return
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error
      }
      if (attempt >= attempts) {
        throw error
      }
      await delayMs(baseDelayMs * attempt)
    }
  }
}
