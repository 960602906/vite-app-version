export type { VersionWatchTriggers } from "../shared/watch-triggers"

export interface VersionUpdateInfo {
  currentBuildTime: string
  serverBuildTime: string
}

export interface VersionCheckerOptions {
  currentBuildTime: string
  onUpdate: (info: VersionUpdateInfo) => void
  htmlPath?: string
  metaName?: string
}

export interface StartVersionWatchOptions extends VersionCheckerOptions {
  enabled?: boolean | (() => boolean)
}
