/** Stopwatch factory (HOF): owns accumMs / anchor / interval, pushes ticks out. */

export interface TimerHandle {
  start: () => void
  stop: () => number
  reset: () => void
  setElapsed: (ms: number) => void
  getElapsed: () => number
  isRunning: () => boolean
}

export function createTimer(onTick: (elapsedMs: number) => void, intervalMs = 100): TimerHandle {
  let accumMs = 0
  let startedAt = 0
  let tickHandle: number | undefined

  function getElapsed(): number {
    if (tickHandle === undefined) {
      return Math.round(accumMs)
    }
    return Math.round(accumMs + performance.now() - startedAt)
  }

  function stop(): number {
    if (tickHandle !== undefined) {
      accumMs += performance.now() - startedAt
      const out = Math.round(accumMs)
      window.clearInterval(tickHandle)
      tickHandle = undefined
      onTick(out)
      return out
    }
    return Math.round(accumMs)
  }

  function start(): void {
    if (tickHandle !== undefined) {
      return
    }
    startedAt = performance.now()
    tickHandle = window.setInterval(() => {
      onTick(getElapsed())
    }, intervalMs)
  }

  function reset(): void {
    if (tickHandle !== undefined) {
      window.clearInterval(tickHandle)
      tickHandle = undefined
    }
    accumMs = 0
    onTick(0)
  }

  function setElapsed(ms: number): void {
    accumMs = ms
    if (tickHandle !== undefined) {
      startedAt = performance.now()
    }
    onTick(Math.round(ms))
  }

  function isRunning(): boolean {
    return tickHandle !== undefined
  }

  return { start, stop, reset, getElapsed, isRunning, setElapsed }
}
