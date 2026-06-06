import { describe, expect, it } from "vitest"
import { resolveWatchTriggers } from "./watch-triggers"

describe("resolveWatchTriggers", () => {
  it("uses defaults when no overrides", () => {
    expect(resolveWatchTriggers()).toEqual({
      visibilityChange: true,
      focus: true,
      online: true,
      initialDelay: 10_000,
      pollInterval: 300_000
    })
  })

  it("merges partial config without replacing defaults", () => {
    expect(resolveWatchTriggers({ pollInterval: 60_000 })).toEqual({
      visibilityChange: true,
      focus: true,
      online: true,
      initialDelay: 10_000,
      pollInterval: 60_000
    })
  })

  it("merges multiple partial sources in order", () => {
    expect(
      resolveWatchTriggers(
        { pollInterval: 60_000 },
        { focus: false, initialDelay: 5_000 }
      )
    ).toEqual({
      visibilityChange: true,
      focus: false,
      online: true,
      initialDelay: 5_000,
      pollInterval: 60_000
    })
  })

  it("allows disabling polling and initial delay with 0", () => {
    expect(resolveWatchTriggers({ pollInterval: 0, initialDelay: 0 })).toMatchObject({
      initialDelay: 0,
      pollInterval: 0
    })
  })
})
