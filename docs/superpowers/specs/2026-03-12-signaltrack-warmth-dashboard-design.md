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

## 7. Scope Boundaries

This spec covers **the dashboard summary screen only**. The following are out of scope and will be specced separately after further design exploration:

- Metric detail pages (`/dashboard/weight`, etc.)
- Add entry modal / bottom sheet
- Empty states
- Authentication UI
- Desktop layout

---

## 8. Implementation Notes

- No external chart library needed for sparklines — inline SVG paths are sufficient at this size
- DM Sans loaded via Google Fonts `<link>` in `app.html`
- CSS custom properties defined in `app.css` `:root` alongside shadcn-svelte tokens
- Lucide Svelte (`lucide-svelte`) is already installed and used for icons
- Tab bar is part of the `/dashboard` layout, not the root layout
- Auth is stubbed in this iteration — `+page.server.ts` returns seed data; real auth wired in a future plan
