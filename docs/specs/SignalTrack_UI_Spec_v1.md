# SignalTrack — UI Specification (v1 MVP)

Document Version: v1.0
Date: 2026-03-11

---

## 1. Design Philosophy

Mobile-first. Every decision prioritizes the experience on a phone screen,
then enhances progressively for tablet and desktop.

---

## 2. Navigation

### Mobile (< 1024px)
- Bottom tab bar with 5 tabs: Dashboard + 4 metrics (Weight, Blood Pressure, Sleep, Work)
- Fixed to the bottom of the screen
- Thumb-friendly tap targets

### Desktop (≥ 1024px)
- Persistent left sidebar with the same navigation items
- Sidebar is always visible, no collapse needed at this scale

---

## 3. Breakpoints

| Name    | Width   | Layout          |
|---------|---------|-----------------|
| Mobile  | < 768px | Bottom tab bar  |
| Tablet  | 768px+  | Bottom tab bar  |
| Desktop | 1024px+ | Left sidebar    |

Mobile-first CSS approach using Tailwind's default breakpoints (`md`, `lg`).

---

## 4. Dashboard Page (`/dashboard`)

### Summary Cards
- One card per metric (Weight, Blood Pressure, Sleep, Work)
- Each card displays:
  - Metric name
  - Latest recorded value
  - Sparkline (small inline chart showing recent trend)
  - "Add" button that opens the add modal pre-loaded for that metric

### Empty State (no data)
- Card shows a chart icon + message: "No entries yet. Add your first reading."
- "Add" button is included directly in the empty state

---

## 5. Metric Detail Pages (`/dashboard/weight`, etc.)

### Layout
- Date range selector at the top (7d / 30d / 90d / All)
- Full-width line chart below the selector
- Recent entries list below the chart (last 10–20 entries)
- Each entry row has edit and delete actions

### Empty State (no data)
- Chart area shows an icon + message: "No entries yet. Add your first reading."
- "Add" button included in the empty state

---

## 6. Charts

### Type
- Line chart for all metrics
- Blood pressure renders two lines (systolic and diastolic)

### Behavior
- Scales to container width (no horizontal scrolling)
- Fixed height
- Data range controlled by the date range selector
- Aggregations shown on chart:
  - Weight: 7-day rolling average overlay
  - Sleep: weekly totals
  - Work: weekly totals
- Latest reading highlighted

---

## 7. Add Entry Modal

### Trigger
- "Add" button on each summary card (dashboard)
- "Add" button on each metric detail page
- Modal pre-loads the form for the relevant metric

### Behavior
- **Mobile**: slides up as a bottom sheet
- **Desktop**: centered modal dialog

### Form Fields by Metric

| Metric         | Fields                                      |
|----------------|---------------------------------------------|
| Weight         | Value (lbs), Date/time                      |
| Blood Pressure | Systolic (mmHg), Diastolic (mmHg), Date/time |
| Sleep          | Duration (hours + minutes), Date/time        |
| Work           | Duration (hours + minutes), Date/time        |

---

## 8. Empty States

All empty states follow the same pattern:
- Relevant icon
- Short message explaining no data exists
- "Add" button as a call to action

---

## 9. Responsiveness

- Charts scale to fit screen width — no horizontal scrolling
- Bottom sheet on mobile for add entry, modal dialog on desktop
- Touch targets sized for thumbs (minimum 44px)

---

## 10. Component Library

Built with **shadcn-svelte** (new-york style, slate base color) + **Bits UI** primitives.

| Component     | Usage                              |
|---------------|------------------------------------|
| Card          | Summary cards, detail page wrapper |
| Dialog/Sheet  | Add entry modal / bottom sheet     |
| Button        | Add, Edit, Delete actions          |
| Input         | Numeric entry fields               |
| Select        | Date range selector                |
| Separator     | Section dividers                   |
| Skeleton      | Loading states                     |
