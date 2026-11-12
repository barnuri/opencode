import path from "node:path"
import { Keymap } from "../context/keymap"
import { useRoute } from "../context/route"
import { useSessionTabs } from "../context/session-tabs"
import { useTheme } from "../context/theme"
import { DIALOG_LIST_INSET, useDialog } from "../ui/dialog"
import { DialogSelect } from "../ui/dialog-select"
import { useInbox } from "./inbox-data"

export const DialogInboxKey = Symbol("DialogInbox")

export function DialogInbox() {
  const inbox = useInbox()
  const theme = useTheme().surface("dialog")
  const tabs = useSessionTabs()
  const route = useRoute()
  const dialog = useDialog()
  Keymap.createLayer(() => ({ mode: "modal", bindings: ["session.inbox.toggle"] }))

  return (
    <DialogSelect
      title="Inbox"
      placeholder="Search inbox sessions…"
      preserveSelection
      current={tabs.current()}
      sectionNavigation
      options={
        inbox.loading()
          ? []
          : inbox.sections().flatMap((section) =>
              section.rows.map((row) => ({
                title: row.title,
                value: row.id,
                category: section.title,
                details: [[row.detail, path.basename(row.directory) || row.directory].filter(Boolean).join(" · ")],
                searchText: `${row.directory} ${row.detail}`,
              })),
            )
      }
      emptyView={
        <text paddingLeft={DIALOG_LIST_INSET} fg={theme.text.muted}>
          {inbox.loading() ? "Loading sessions…" : "No inbox sessions"}
        </text>
      }
      footer={<text fg={theme.text.muted}>↑↓ move · enter open · esc close</text>}
      onSelect={(option) => {
        dialog.clear()
        if (tabs.enabled()) return tabs.select(option.value)
        route.navigate({ type: "session", sessionID: option.value })
      }}
    />
  )
}
