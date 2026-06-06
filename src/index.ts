export { createAppVersionCheckPlugin } from "./plugin"
export type { AppVersionCheckOptions } from "./types"
export {
  DEFAULT_GLOBAL_NAME,
  DEFAULT_META_NAME,
  DEFAULT_WATCH_CONFIG_GLOBAL_NAME,
  VIRTUAL_MODULE_ID
} from "./constants"
export { DEFAULT_WATCH_TRIGGERS, resolveWatchTriggers } from "./shared/watch-triggers"
export type { ResolvedVersionWatchTriggers, VersionWatchTriggers } from "./shared/watch-triggers"

import { createAppVersionCheckPlugin } from "./plugin"
import type { AppVersionCheckOptions } from "./types"

/** Vite 插件入口 */
export function appVersionCheck(options?: AppVersionCheckOptions) {
  return createAppVersionCheckPlugin(options)
}
