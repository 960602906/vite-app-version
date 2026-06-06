export {
  VersionChecker,
  buildMetaRegex,
  createVersionChecker,
  fetchHtmlBuildTime,
  hasVersionUpdate,
  parseBuildTimeFromHtml,
  resolveHtmlPath
} from "./checker"
export { getWatchConfigFromGlobal, mergeWatchConfig } from "./config"
export type {
  StartVersionWatchOptions,
  VersionCheckerOptions,
  VersionUpdateInfo,
  VersionWatchTriggers
} from "./types"
export { DEFAULT_WATCH_TRIGGERS, resolveWatchTriggers } from "../shared/watch-triggers"
export type { ResolvedVersionWatchTriggers } from "../shared/watch-triggers"

import { DEFAULT_META_NAME } from "../constants"
import { VersionChecker } from "./checker"
import type { StartVersionWatchOptions } from "./types"

function resolveEnabled(enabled: StartVersionWatchOptions["enabled"]): boolean {
  if (enabled !== undefined) {
    return typeof enabled === "function" ? enabled() : enabled
  }
  return (import.meta as ImportMeta & { env: { PROD: boolean } }).env.PROD
}

/**
 * 启动版本监听，发现新版本时调用 onUpdate 回调（UI 由项目自行实现）
 * 触发配置由 appVersionCheck({ watch }) 注入，与内置默认值合并
 */
export function startVersionWatch(options: StartVersionWatchOptions): VersionChecker | null {
  if (!resolveEnabled(options.enabled)) {
    return null
  }

  const checker = VersionChecker.getInstance({
    currentBuildTime: options.currentBuildTime,
    onUpdate: options.onUpdate,
    htmlPath: options.htmlPath,
    metaName: options.metaName ?? DEFAULT_META_NAME
  })

  checker.startWatching()
  return checker
}
