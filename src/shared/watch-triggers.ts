export interface VersionWatchTriggers {
  /** 页面从隐藏变为可见时检查 */
  visibilityChange?: boolean
  /** 浏览器窗口聚焦时检查 */
  focus?: boolean
  /** 网络恢复时检查 */
  online?: boolean
  /** 启动后首次延迟检查（ms），0 表示关闭 */
  initialDelay?: number
  /** 定时轮询间隔（ms），0 表示关闭 */
  pollInterval?: number
}

export interface ResolvedVersionWatchTriggers {
  visibilityChange: boolean
  focus: boolean
  online: boolean
  initialDelay: number
  pollInterval: number
}

export const DEFAULT_WATCH_TRIGGERS: ResolvedVersionWatchTriggers = {
  visibilityChange: true,
  focus: true,
  online: true,
  initialDelay: 10_000,
  pollInterval: 5 * 60 * 1000
}

export function resolveWatchTriggers(
  ...sources: Array<Partial<VersionWatchTriggers> | undefined>
): ResolvedVersionWatchTriggers {
  const merged: Partial<VersionWatchTriggers> = {}
  for (const source of sources) {
    if (source) Object.assign(merged, source)
  }

  return {
    visibilityChange: merged.visibilityChange !== false,
    focus: merged.focus !== false,
    online: merged.online !== false,
    initialDelay: Math.max(0, merged.initialDelay ?? DEFAULT_WATCH_TRIGGERS.initialDelay),
    pollInterval: Math.max(0, merged.pollInterval ?? DEFAULT_WATCH_TRIGGERS.pollInterval)
  }
}
