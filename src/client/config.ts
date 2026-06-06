import { DEFAULT_WATCH_CONFIG_GLOBAL_NAME } from "../constants"
import {
  DEFAULT_WATCH_TRIGGERS,
  resolveWatchTriggers
} from "../shared/watch-triggers"
import type { ResolvedVersionWatchTriggers, VersionWatchTriggers } from "../shared/watch-triggers"

declare const __APP_VERSION_WATCH_CONFIG__: ResolvedVersionWatchTriggers | undefined

function readPluginWatchConfig(): Partial<VersionWatchTriggers> | undefined {
  if (typeof __APP_VERSION_WATCH_CONFIG__ === "undefined") {
    return undefined
  }
  return __APP_VERSION_WATCH_CONFIG__
}

export function getWatchConfigFromGlobal(
  globalName: string = DEFAULT_WATCH_CONFIG_GLOBAL_NAME
): Partial<VersionWatchTriggers> | undefined {
  if (globalName === DEFAULT_WATCH_CONFIG_GLOBAL_NAME) {
    return readPluginWatchConfig()
  }

  const config = (globalThis as Record<string, unknown>)[globalName]
  return config && typeof config === "object" ? (config as Partial<VersionWatchTriggers>) : undefined
}

/** 合并插件注入配置与内置默认值（局部配置项会与默认值合并，不会整体覆盖） */
export function mergeWatchConfig(
  globalName: string = DEFAULT_WATCH_CONFIG_GLOBAL_NAME
): ResolvedVersionWatchTriggers {
  return resolveWatchTriggers(DEFAULT_WATCH_TRIGGERS, getWatchConfigFromGlobal(globalName))
}
