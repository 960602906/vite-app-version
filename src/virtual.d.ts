import type { ResolvedVersionWatchTriggers } from "./shared/watch-triggers"

declare module "virtual:app-version" {
  export const buildTime: string
  export const watchTriggers: ResolvedVersionWatchTriggers
}
