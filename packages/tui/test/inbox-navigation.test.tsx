import { expect, test } from "bun:test"
import { InputRenderable, TextareaRenderable } from "@opentui/core"
import { createAppFixture } from "./fixture/app"
import { session } from "./fixture/local"
import { directory, json } from "./fixture/tui-client"

test("open inbox sessions in different locations by mouse and by keyboard", async () => {
  const sessions = [
    { ...session("ses_inbox_local"), title: "Local work" },
    { ...session("ses_inbox_other"), title: "Other work", location: { directory: "/tmp/another-project" } },
  ]
  await using app = await createAppFixture({
    width: 114,
    height: 30,
    config: { animations: false, session: { inbox: true }, tabs: { enabled: true } },
    fetch: (url) => {
      if (url.pathname === "/api/session") return json({ data: sessions, cursor: {} })
      const item = sessions.find((s) => url.pathname === `/api/session/${s.id}`)
      if (item) return json({ data: item })
      if (/^\/api\/session\/[^/]+\/(message|inbox)$/.test(url.pathname)) return json({ data: [], cursor: {} })
      if (url.pathname === "/api/location") {
        const target = url.searchParams.get("directory") ?? directory
        return json({ directory: target, project: { id: "project", directory: target, canonical: target } })
      }
    },
  })
  await app.ready
  await app.waitForFrame((frame) => frame.includes("Other work") && frame.includes("Local work"))
  const lines = app.captureCharFrame().split("\n")
  const y = lines.findIndex((line) => line.includes("Other work"))
  await app.mockMouse.click(lines[y]!.indexOf("Other work"), y)
  await app.waitForFrame(
    (frame) =>
      !frame.includes("Search inbox sessions") &&
      frame.includes("Other work") &&
      app.renderer.currentFocusedEditor instanceof TextareaRenderable,
  )
  const prompt = app.renderer.currentFocusedEditor!
  const width = prompt.width
  app.mockInput.pressKey("x", { ctrl: true })
  app.mockInput.pressKey("o")
  await app.waitForFrame(
    (frame) => frame.includes("Search inbox sessions") && app.renderer.currentFocusedEditor instanceof InputRenderable,
  )
  expect(prompt.width).toBe(width)
  app.mockInput.pressArrow("up")
  app.mockInput.pressEnter()
  await app.waitForFrame(
    (frame) =>
      !frame.includes("Search inbox sessions") &&
      frame.includes("Local work") &&
      app.renderer.currentFocusedEditor instanceof TextareaRenderable,
  )
})

test("scroll through a long inbox without leaving the overlay", async () => {
  const sessions = Array.from({ length: 10 }, (_, index) => ({
    ...session(`ses_wheel_${index}`),
    title: `Wheel session ${index}`,
  }))
  await using app = await createAppFixture({
    width: 64,
    height: 18,
    config: { animations: false, session: { inbox: true } },
    fetch: (url) => (url.pathname === "/api/session" ? json({ data: sessions, cursor: {} }) : undefined),
  })
  await app.ready
  await app.waitForFrame((frame) => frame.includes("Wheel session 0"))
  expect(app.captureCharFrame()).not.toContain("Wheel session 9")
  const y = app
    .captureCharFrame()
    .split("\n")
    .findIndex((line) => line.includes("Wheel session 0"))
  for (let i = 0; i < 15; i++) await app.mockMouse.scroll(12, y, "down")
  await app.waitForFrame((frame) => frame.includes("Wheel session 9") && !frame.includes("Wheel session 0"))
})
