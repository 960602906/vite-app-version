import type { Plugin, UserConfig } from "vite"
import {
  DEFAULT_GLOBAL_NAME,
  DEFAULT_META_NAME,
  DEFAULT_WATCH_CONFIG_GLOBAL_NAME,
  RESOLVED_VIRTUAL_MODULE_ID,
  VIRTUAL_MODULE_ID
} from "./constants"
import { resolveWatchTriggers } from "./shared/watch-triggers"
import type { AppVersionCheckOptions } from "./types"

const defaultFormatBuildTime = () => new Date().toISOString()

export function createAppVersionCheckPlugin(options: AppVersionCheckOptions = {}): Plugin {
  const metaName = options.metaName ?? DEFAULT_META_NAME
  const globalName = options.globalName ?? DEFAULT_GLOBAL_NAME
  const watchConfigGlobalName = options.watchConfigGlobalName ?? DEFAULT_WATCH_CONFIG_GLOBAL_NAME
  const formatBuildTime = options.formatBuildTime ?? defaultFormatBuildTime
  const productionOnly = options.productionOnly ?? true
  const logBuildTime = options.logBuildTime ?? false
  const buildTime = formatBuildTime()
  // 用户只配部分字段时与默认值合并，例如 watch: { pollInterval: 60_000 }
  const watchTriggers = resolveWatchTriggers(options.watch)

  return {
    name: "vite-app-version",
    enforce: "pre",

    config(config, { command }) {
      const isProductionBuild = command === "build"
      const injectDefine = !productionOnly || isProductionBuild

      const defineValue = injectDefine ? buildTime : ""
      const watchConfigValue = injectDefine ? watchTriggers : resolveWatchTriggers({ pollInterval: 0, initialDelay: 0 })
      const define: UserConfig["define"] = {
        ...(config.define ?? {}),
        [globalName]: JSON.stringify(defineValue),
        [watchConfigGlobalName]: JSON.stringify(watchConfigValue)
      }

      return { define }
    },

    configResolved() {
      if (logBuildTime) {
        console.log(`[vite-app-version] buildTime: ${buildTime}`)
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      return null
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return `export const buildTime = ${JSON.stringify(buildTime)};
export const watchTriggers = ${JSON.stringify(watchTriggers)};
`
      }
      return null
    },

    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const metaTag = `<meta name="${metaName}" content="${buildTime}">`
        if (html.includes(`name="${metaName}"`)) {
          return html.replace(
            new RegExp(`<meta name="${metaName}" content="[^"]*">`),
            metaTag
          )
        }
        return html.replace("<head>", `<head>\n    ${metaTag}`)
      }
    }
  }
}
