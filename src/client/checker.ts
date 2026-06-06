import { DEFAULT_META_NAME } from "../constants"
import type { ResolvedVersionWatchTriggers } from "../shared/watch-triggers"
import { mergeWatchConfig } from "./config"
import type { VersionCheckerOptions, VersionUpdateInfo } from "./types"

export function buildMetaRegex(metaName: string): RegExp {
  return new RegExp(`<meta name="${metaName}" content="(.*)">`)
}

export function parseBuildTimeFromHtml(html: string, metaName: string = DEFAULT_META_NAME): string {
  const match = html.match(buildMetaRegex(metaName))
  return match?.[1] ?? ""
}

export function resolveHtmlPath(htmlPath?: string): string {
  if (htmlPath) return htmlPath

  const base = (import.meta as ImportMeta & { env: { BASE_URL?: string } }).env.BASE_URL ?? "/"
  const normalizedBase = base.endsWith("/") ? base : `${base}/`
  return `${normalizedBase}index.html`
}

export async function fetchHtmlBuildTime(
  htmlPath?: string,
  metaName: string = DEFAULT_META_NAME
): Promise<string> {
  const path = resolveHtmlPath(htmlPath)
  const url = `${path}${path.includes("?") ? "&" : "?"}time=${Date.now()}`

  const response = await fetch(url, {
    cache: "no-cache",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: HTTP ${response.status}`)
  }

  const html = await response.text()
  return parseBuildTimeFromHtml(html, metaName)
}

export function hasVersionUpdate(currentBuildTime: string, serverBuildTime: string): boolean {
  return Boolean(serverBuildTime) && serverBuildTime !== currentBuildTime
}

export class VersionChecker {
  private static instance: VersionChecker | undefined

  private currentBuildTime: string
  private onUpdate: (info: VersionUpdateInfo) => void
  private htmlPath?: string
  private metaName: string
  private watchTriggers: ResolvedVersionWatchTriggers
  private pollTimerId?: number
  private isChecking = false
  private isNotifying = false
  private isWatching = false

  private constructor(options: VersionCheckerOptions) {
    this.currentBuildTime = options.currentBuildTime
    this.onUpdate = options.onUpdate
    this.htmlPath = options.htmlPath
    this.metaName = options.metaName ?? DEFAULT_META_NAME
    this.watchTriggers = mergeWatchConfig()
  }

  static getInstance(options: VersionCheckerOptions): VersionChecker {
    if (!VersionChecker.instance) {
      VersionChecker.instance = new VersionChecker(options)
    } else {
      VersionChecker.instance.onUpdate = options.onUpdate
      if (options.currentBuildTime) {
        VersionChecker.instance.currentBuildTime = options.currentBuildTime
      }
    }
    return VersionChecker.instance
  }

  static resetInstance(): void {
    VersionChecker.instance = undefined
  }

  async checkForUpdates(): Promise<boolean> {
    if (this.isChecking || this.isNotifying) return false
    if (!this.currentBuildTime) return false

    this.isChecking = true

    try {
      const serverBuildTime = await fetchHtmlBuildTime(this.htmlPath, this.metaName)

      if (!hasVersionUpdate(this.currentBuildTime, serverBuildTime)) {
        return false
      }

      this.isNotifying = true

      const info: VersionUpdateInfo = {
        currentBuildTime: this.currentBuildTime,
        serverBuildTime
      }

      this.onUpdate(info)
      return true
    } catch (error) {
      console.warn("[vite-app-version] Version check failed:", error)
      return false
    } finally {
      this.isChecking = false
    }
  }

  /** 版本更新回调触发后调用，允许后续再次检测 */
  resetNotifying(): void {
    this.isNotifying = false
  }

  startWatching(): void {
    if (this.isWatching) return
    this.isWatching = true

    const { visibilityChange, focus, online, initialDelay, pollInterval } = this.watchTriggers

    if (visibilityChange) {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          void this.checkForUpdates()
        }
      })
    }

    if (online) {
      window.addEventListener("online", () => {
        void this.checkForUpdates()
      })
    }

    if (focus) {
      window.addEventListener("focus", () => {
        void this.checkForUpdates()
      })
    }

    if (initialDelay > 0) {
      window.setTimeout(() => {
        void this.checkForUpdates()
      }, initialDelay)
    }

    if (pollInterval > 0) {
      this.pollTimerId = window.setInterval(() => {
        void this.checkForUpdates()
      }, pollInterval)
    }
  }

  async manualCheck(): Promise<boolean> {
    return this.checkForUpdates()
  }

  getCurrentBuildTime(): string {
    return this.currentBuildTime
  }
}

export function createVersionChecker(options: VersionCheckerOptions): VersionChecker {
  return VersionChecker.getInstance(options)
}
