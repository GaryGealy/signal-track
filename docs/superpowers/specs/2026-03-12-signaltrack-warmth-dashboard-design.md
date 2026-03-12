# SignalTrack — Warmth Dashboard Design Spec

**Date:** 2026-03-12
**Scope:** Mobile dashboard page (`/dashboard`) — Design Direction B "Warmth"
**Status:** Approved

---

## 1. Design Direction

Personal, inviting, warm. SignalTrack is a health journal you *want* to open — not a clinical dashboard. Data is still the hero, but the visual language is human and approachable.

---

## 2. Color Tokens

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#FAF7F2` | App background (warm cream) |
| `--color-surface` | `#FFFFFF` | Card surface |
| `--color-border` | `#EFE8DE` | Card border, tab bar border |
| `--color-text-primary` | `#2C1A0E` | Headlines, values |
| `--color-text-muted` | `#9A7E6A` | Labels, secondary text |
| `--color-accent` | `#C4622D` | CTA buttons, sparklines, active tab |
| `--color-accent-bg` | `#FDF0E8` | Icon chip backgrounds |

---

## 3. Typography

- **Font family:** DM Sans (Google Fonts)
- **Display numbers:** 38–40px, weight 700, tracking −0.04em
- **Card labels:** 13px, weight 600
- **Metric unit labels:** 15px, weight 400, muted color
- **Date/greeting:** 13px, weight 400, muted color
- **Tab labels:** 10px, weight 500–600
- **Page headline:** 30px, weight 700, tracking −0.03em

---

## 4. Layout

### Shell
- Mobile-first, 390px wide reference frame
- Fixed bottom tab bar (5 tabs: Home, Weight, BP, Sleep, Work)
- Tab bar: white bg, 1px warm border top, 60px touch target height + 28px safe area padding
- Scrollable content area between header and tab bar

### Header
- Greeting line: "Good morning, [first name]" — muted, 13px
- Page title: "Your signals" — 30px bold
- Date badge: colored dot + "Day · Mon DD" — muted, 12px

### Cards
- 4 cards, vertically stacked, 20px horizontal padding, 10px gap
- Card: white bg, 20px border-radius, 1px warm border, 18px/20px padding
- Each card: [icon chip + label + add button] / [large value + sparkline]

---

## 5. Metric Card Anatomy

```
┌─────────────────────────────────────────┐
│ [icon chip] Label            [+ Add]    │  ← row 1: header
│                                         │
│  183 lbs             ╱╲   ╱  ╱•        │  ← row 2: value + sparkline
└─────────────────────────────────────────┘
```

### Icon chips
- 28×28px, 8px border-radius, `--color-accent-bg` background
- 14px SVG icon in `--color-accent`
- One icon per metric: person (weight), droplet (BP), moon (sleep), briefcase (work)

### Value display
- Weight: `183 lbs`
- Blood Pressure: `118/76 mmHg` (primary in bold, diastolic in light 300 weight)
- Sleep/Work: `7h 22m` (hours in 38px bold, minutes in 28px semibold, unit labels in muted 15px)

### Add button
- Filled pill: `--color-accent` bg, white text, 20px border-radius
- Label: "+ Add", 12px semibold

### Sparkline
- 96×36px inline SVG
- Single line in `--color-accent` at 70% opacity, 2px stroke
- Blood pressure: two lines — solid (systolic) + dashed (secondary #E8A882)
- Terminal dot: solid accent color, 3.5px radius

---

## 6. Bottom Tab Bar

5 equal-width tabs. Active tab = accent color icon + accent label weight 600. Inactive = muted color, weight 500.

| Tab | Icon | Route |
|---|---|---|
| Home | 4-square grid | `/dashboard` |
| Weight | Person silhouette | `/dashboard/weight` |
| BP | Droplet | `/dashboard/blood-pressure` |
| Sleep | Crescent moon | `/dashboard/sleep` |
| Work | Briefcase | `/dashboard/work` |

---

## 7. Login Page (`/login`)

Standard centered form on the cream background. No sidebar, no tab bar.

### Layout
- Full-screen `--color-bg` background
- Vertically centered card: white surface, 20px border-radius, 1px warm border, 32px padding
- Card max-width: 390px (fills mobile viewport edge-to-edge with 0px margin on mobile; centered with auto margins on larger screens)

### Content (top to bottom)
1. **Wordmark** — "SignalTrack" in DM Sans 22px weight 700, `--color-text-primary`, centered
2. **Tagline** — "Your signals, your story." in 13px muted, centered, 8px below wordmark
3. **Email field** — full-width, label "Email", standard text input styled with `--color-border` border, `--color-text-primary` value, 12px border-radius
4. **Password field** — full-width, label "Password", same style as email
5. **Sign in button** — full-width filled pill, `--color-accent` bg, white text, 14px border-radius, 48px height, "Sign in" label 15px semibold
6. **Register link** — "Don't have an account? Sign up" centered below button, muted 13px, "Sign up" in accent color

### States
- Input focus: `--color-accent` 1.5px border (matches add entry sheet inputs)
- Error: red-tinted border + small error message below field (use Tailwind `destructive` token from shadcn-svelte)
- Loading: button shows spinner, disabled

---

## 8. Empty States

Used on dashboard summary cards (no data yet) and metric detail pages (no entries in selected range).

### Summary Card Empty State

Replaces the value + sparkline row inside the metric card:

```
┌─────────────────────────────────────────┐
│ [icon chip] Label            [+ Add]    │
│                                         │
│  [icon]  No entries yet.                │
│          Add your first reading.        │
└─────────────────────────────────────────┘
```

- Icon: same lucide icon as the metric, 18px, `--color-text-muted`
- Message: "No entries yet." 13px weight 500 `--color-text-primary` + "Add your first reading." 12px muted — displayed inline or stacked
- No sparkline rendered

### Detail Page Empty State

Replaces the chart area on metric detail pages:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            [icon 32px muted]                     │
│         No entries yet.                          │
│    Add your first reading to see your trend.     │
│                                                  │
│         [  + Add entry  ]  ← accent pill         │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Container: full chart-area height (same dimensions as populated chart), centered content
- Icon: lucide metric icon, 32px, `--color-accent-bg` chip background (40×40px, 12px radius)
- Headline: "No entries yet." 16px weight 600 `--color-text-primary`
- Subtext: "Add your first reading to see your trend." 13px muted
- CTA: accent filled pill button, "+ Add entry", same style as dashboard add button but wider (full content width capped at 180px)

---

## 9. Scope Boundaries

This spec covers the dashboard summary screen, login page, and empty state patterns. The following are out of scope and will be specced separately:

- Metric detail pages (`/dashboard/weight`, etc.)
- Add entry modal / bottom sheet
- Desktop layout

---

## 10. Implementation Notes

- No external chart library needed for sparklines — inline SVG paths are sufficient at this size
- DM Sans loaded via Google Fonts `<link>` in `app.html`
- CSS custom properties defined in `app.css` `:root` alongside shadcn-svelte tokens
- Lucide Svelte (`lucide-svelte`) is already installed and used for icons
- Tab bar is part of the `/dashboard` layout, not the root layout
- Auth is stubbed in this iteration — `+page.server.ts` returns seed data; real auth wired in a future plan
- Login page uses shadcn-svelte `Card`, `Input`, and `Button` components — no custom primitives needed
- Empty states are inline conditionals in `MetricCard.svelte` and the detail page layout — no separate component required
