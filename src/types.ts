import type { VersionWatchTriggers } from "./shared/watch-triggers"

export type { VersionWatchTriggers } from "./shared/watch-triggers"

export interface AppVersionCheckOptions {
  /** meta 标签名，默认 buildTime */
  metaName?: string
  /** define 全局变量名，默认 __APP_BUILD_TIME__ */
  globalName?: string
  /** 触发配置 define 全局变量名，默认 __APP_VERSION_WATCH_CONFIG__ */
  watchConfigGlobalName?: string
  /** buildTime 格式化，默认 ISO string */
  formatBuildTime?: () => string
  /** 版本检查触发方式，默认：可见/聚焦/联网/10s 首次/5min 轮询 */
  watch?: VersionWatchTriggers
  /** 仅 production 注入 define，meta 始终注入；默认 true */
  productionOnly?: boolean
  /** 构建完成时打印 buildTime */
  logBuildTime?: boolean
}
