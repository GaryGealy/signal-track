# SignalTrack — Add Entry Sheet Design Spec

**Date:** 2026-03-12
**Scope:** Add Entry bottom sheet — all four metrics (weight, blood pressure, sleep, work)
**Status:** Approved

---

## 1. Overview

Tapping "+ Add" on any dashboard metric card opens a bottom sheet overlay. The sheet accepts a new entry for that metric, saves it, and dismisses — refreshing the dashboard card live with the new value and updated sparkline.

---

## 2. Trigger Mechanism

The `+ Add` button on `MetricCard` changes from an `<a href>` link to a `<button>`. Clicking it sets a `$state` variable on the dashboard page (`openMetric: MetricType | null`), which passes the metric type to `AddEntrySheet`. When `openMetric` is non-null the sheet opens; when it is null the sheet is closed.

---

## 3. Sheet Shell

- Native `<dialog>` element — handles focus trap, backdrop, and accessibility
- White surface (`var(--color-surface)`), 24px top border-radius
- Drag handle: 40×4px pill, `var(--color-border)`, centered at top of sheet
- Slide-up entrance: `transform: translateY(100%)` → `translateY(0)`, 300ms ease-out
- Backdrop: `rgba(44, 26, 14, 0.4)` warm dark overlay
- Max-height: 85dvh; content area scrollable if needed
- Close triggers: X button (top-right) or backdrop click

---

## 4. Per-Metric Forms

### 4.1 Weight

**Fields:**
- `value` — number input, "lbs" suffix unit label, placeholder "0.0"
- `date` — date input (`<input type="date">`), default today
- `time` — time input (`<input type="time">`), default current time

**Storage mapping:**
- `valueNumeric = value`
- `recordedAt = date + time` (combined into a Date)

---

### 4.2 Blood Pressure

**Fields:**
- `systolic` — number input (left), no suffix
- `diastolic` — number input (right), separated by a "/" divider
- Helper text below both: "Both values in mmHg"
- `date` — date input, default today
- `time` — time input, default current time

**Storage mapping:**
- `valueNumeric = systolic`
- `valueSecondary = diastolic`
- `recordedAt = date + time`

---

### 4.3 Sleep

**Fields:**
- `bedDate` — date input, default **yesterday**
- `bedTime` — time input, default 22:00 (10:00 PM)
- `wakeDate` — date input, default **today**
- `wakeTime` — time input, default 06:00 (6:00 AM)
- Duration is displayed live as a calculated label (e.g. "8h 0m")

**Storage mapping:**
- `valueDuration = (wake datetime − bed datetime) in minutes`
- `recordedAt = bed datetime`

**Validation:** wake datetime must be after bed datetime.

---

### 4.4 Work

**Fields:**
- `workDate` — date input, default today
- `startTime` — time input, default 09:00
- `endTime` — time input, default 17:00
- Quick add chips: **4h / 6h / 8h / 10h** — sets `endTime = startTime + N hours` client-side
- Duration displayed live (e.g. "8h 0m")

**Storage mapping:**
- `valueDuration = (end datetime − start datetime) in minutes`
- `recordedAt = start datetime`

**Validation:** end time must be after start time.

---

## 5. Input Styling

Follows the login page input pattern:
- Background: `var(--color-accent-bg)` (`#FDF0E8`)
- Border: 1px `var(--color-border)`, 10px border-radius
- Focus ring: 2px `var(--color-accent)` (`#C4622D`)
- Error state: red border (`#EF4444`) + error message below field in red 12px
- Labels: 13px, weight 500, `var(--color-text-primary)`

---

## 6. Data Flow

1. User taps "+ Add" on a metric card → `openMetric` state set on `+page.svelte`
2. `AddEntrySheet` opens with `dialog.showModal()`
3. User fills form and taps "Save entry"
4. Form submits via `use:enhance` to `?/addEntry` named action on `+page.server.ts`
5. Server validates with Zod and inserts into `metric_entries`
6. **On success:** `use:enhance` callback calls `update()` (triggers SvelteKit invalidation, refreshing dashboard data) then calls `onClose()` to close the sheet
7. **On failure:** `fail(400, { metricType, errors })` — sheet stays open, errors shown inline via `actionForm` prop

---

## 7. Architecture

| File | Role |
|---|---|
| `app/src/lib/schemas/metrics.ts` | Zod schemas for all four metric types |
| `app/src/lib/components/AddEntrySheet.svelte` | Sheet shell + per-metric form UI |
| `app/src/lib/components/MetricCard.svelte` | Replace `href` prop with `onAdd: () => void` callback |
| `app/src/routes/(app)/dashboard/+page.svelte` | Own `openMetric` state; pass `onAdd` to cards, `actionForm` to sheet |
| `app/src/routes/(app)/dashboard/+page.server.ts` | Add `addEntry` action alongside existing `logout` |
| `app/e2e/add-entry.spec.ts` | E2e tests |

---

## 8. Implementation Notes

- No client-side Zod validation (YAGNI) — server-side only
- `dialog.showModal()` called in `$effect` when `metric` prop becomes non-null
- Quick add chips for Work and Sleep are purely client-side — they update `$state` variables bound to the time inputs
- The `metricType` is sent as a hidden form field so the server knows which Zod schema to apply
- Only one sheet can be open at a time — enforced by the single `openMetric: MetricType | null` state variable
- `actionForm` errors are only shown if `actionForm.metricType === metric` (prevents stale errors from a previous submission leaking into a different form)

---

## 9. Scope Boundaries

Out of scope for this spec:
- Editing or deleting existing entries
- Metric detail pages
- Empty state handling (separate spec)
- Desktop modal variant (bottom sheet only for now)
