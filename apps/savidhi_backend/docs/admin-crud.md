# Admin CRUD conventions

## Why

The admin manages ten-odd entity types (temples, pujas, chadhavas, deities, devotees, pujaris, astrologers, hampers, admin-users, banners…). They look the same and behave the same on purpose: one set of shared components, one set of rules.

This doc is the "how to add a new admin page" reference. The visual examples are at `.claude/skills/savidhi-admin-flow.md` (with Figma node IDs); the rules here are what every page must follow.

## Shared components

All under [`apps/savidhi_admin/src/components/shared/`](../../savidhi_admin/src/components/shared/):

| Component | Role |
|-----------|------|
| `DataTable.tsx` | List view. Pagination, sort, filter. Renders a soft-deleted row dimmed; toggling shows/hides them. |
| `ActionButtons.tsx` | Per-row View / Edit / Delete cluster. Delete = soft delete. |
| `Modal.tsx` | Create/Edit form host. |
| `StatusBadge.tsx`, `StatusToggle.tsx` | Status pill + inline toggle (same endpoint as Edit but a single field). |
| `MediaUpload.tsx` | Drag-drop → `media-service /upload` → returns media URL. |
| `PageHeader.tsx`, `SearchBar.tsx`, `TabToggle.tsx`, `TimelineView.tsx` | Layout primitives. |

A representative usage: [`apps/savidhi_admin/src/app/dashboard/pujas/`](../../savidhi_admin/src/app/dashboard/pujas/).

## Rules

1. **Soft delete only.** No hard DELETE. The gesture is `PATCH /entity/:id { is_active: false }`. Restore via the same endpoint with `true`. Soft-deleted rows appear dimmed in `DataTable` and a toggle shows/hides them.

2. **Audit toast.** Every mutation that returns 2xx fires a toast (`success` for create/update, `info` for soft-delete/restore). The toast names the actor + entity + action. This is the platform's audit trail until a real audit log lands — don't suppress it.

3. **Optimistic update only where reversible.** `StatusToggle` is optimistic (revert on error — the UI snaps back). Full edits are pessimistic (wait for 200, then close the modal). Creates are always pessimistic.

4. **`apiClient` from `lib/api.ts` is mandatory.** A 2026-04-27 incident — "500 across every admin CRUD form" — traced to raw `fetch()` calls in three new pages. Raw fetch bypasses the axios interceptor that attaches the access token. The gateway then returns a 401 that the proxy stream-closes as a 500 to the browser. Fix: every component imports `apiClient` from `lib/api.ts`. **Do not re-introduce raw fetch in admin.** If you need streaming, extend `apiClient` — don't sidestep it.

5. **Slugs come from the server.** Migration 006 added slug columns. The admin form doesn't ask for a slug; the catalog route generates and persists it.

6. **Translations are write-through async.** When you submit the canonical name/description/etc, the catalog route returns 200 immediately; the `_en` / `_hi` siblings backfill in the background (see [translations.md](translations.md)). The user sees the canonical immediately and the translation on next refresh.

## Files

- [`apps/savidhi_admin/src/components/shared/`](../../savidhi_admin/src/components/shared/) — primitives.
- [`apps/savidhi_admin/src/lib/api.ts`](../../savidhi_admin/src/lib/api.ts) — exports `apiClient`, the axios instance with auth interceptor.
- [`apps/savidhi_admin/src/app/dashboard/pujas/`](../../savidhi_admin/src/app/dashboard/pujas/) — the example to copy when adding a new CRUD.
