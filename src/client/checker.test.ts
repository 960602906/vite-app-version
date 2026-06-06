import { describe, expect, it } from "vitest"
import { hasVersionUpdate, parseBuildTimeFromHtml } from "./checker"

describe("parseBuildTimeFromHtml", () => {
  it("parses buildTime from meta tag", () => {
    const html = `<!DOCTYPE html><html><head><meta name="buildTime" content="2026-06-05T10:00:00.000Z"></head></html>`
    expect(parseBuildTimeFromHtml(html)).toBe("2026-06-05T10:00:00.000Z")
  })

  it("supports custom meta name", () => {
    const html = `<head><meta name="appBuild" content="v2"></head>`
    expect(parseBuildTimeFromHtml(html, "appBuild")).toBe("v2")
  })

  it("returns empty string when meta is missing", () => {
    expect(parseBuildTimeFromHtml("<head></head>")).toBe("")
  })
})

describe("hasVersionUpdate", () => {
  it("detects different build times", () => {
    expect(hasVersionUpdate("old", "new")).toBe(true)
  })

  it("returns false for same build time", () => {
    expect(hasVersionUpdate("same", "same")).toBe(false)
  })

  it("returns false when server build time is empty", () => {
    expect(hasVersionUpdate("old", "")).toBe(false)
  })
})
