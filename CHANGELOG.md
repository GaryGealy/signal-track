# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-03-13

### Added
- Metric detail pages for Weight, Blood Pressure, Sleep, and Work with full-width line chart, 7d/30d/90d/All time range picker, scrollable history list, and delete entry support
- Shared `MetricDetailPage`, `MetricChart`, and `TimeRangePicker` components
- Dashboard metric cards now show empty state when no entries exist
- App logo (teal circular heartbeat mark) on login page and dashboard header
- Show/hide password toggle on login and register forms
- Seed script (`scripts/seed-test-user.ts`) to create a demo user with 30 days of realistic health data

### Changed
- Color scheme updated from warm/terracotta palette to teal palette derived from the app logo

## [0.1.0] - 2026-03-09

### Added
- SvelteKit app with shadcn-svelte UI components (accordion, badge, button, card, checkbox, dialog, input, label, select, separator, skeleton, switch, tooltip)
- Drizzle ORM setup with D1 database schema and initial migration
- Cloudflare Pages deploy pipeline triggered on GitHub release publish
- GitHub Actions CI workflow
- wrangler.toml Cloudflare Pages configuration
- Cloudflare setup script (scripts/setup-cloudflare.sh)

### Changed
- README updated to document release-based deploy strategy
- deploy.yml updated from cloudflare branch trigger to `release: published`
- .gitignore updated to exclude .wrangler/

[Unreleased]: https://github.com/GaryGealy/signal-track/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/GaryGealy/signal-track/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/GaryGealy/signal-track/compare/v0.0.0...v0.1.0
