# SignalTrack -- Product Specification (v1 MVP)

## 1. Product Overview

SignalTrack is a multi-tenant SaaS web application that allows users to
track core personal performance metrics over time.

### MVP Metrics

  Metric           Type                 Multiple per Day   Unit
  ---------------- -------------------- ------------------ ----------------------------
  Weight           Numeric              Yes                lbs (future: configurable)
  Blood Pressure   Numeric (2 values)   Yes                systolic / diastolic
  Sleep Duration   Duration             Yes                minutes
  Work Hours       Duration             Yes                minutes

All entries are: - Time-series - Timestamped - Manual entry only - No
notes in v1

------------------------------------------------------------------------

## 2. Authentication

-   Email/password login
-   Session-based auth; session token stored in httpOnly, Secure, SameSite=Strict cookie
-   Sessions persisted in D1 `sessions` table; logout deletes the row (instant revocation)
-   Password hashed with bcrypt (12+ rounds)
-   Multi-tenant isolation via `user_id`

Endpoints:

    POST   /api/auth/register
    POST   /api/auth/login
    POST   /api/auth/logout

------------------------------------------------------------------------

## 3. Database Schema (MVP)

### 3.1 Users Table

-   id (UUID, PK)
-   email (unique)
-   password_hash
-   name
-   created_at
-   updated_at

### 3.2 Metric Entries Table

Unified time-series table for all metrics.

    metric_entries
    --------------
    id (UUID, PK)
    user_id (FK → users.id)
    metric_type (weight | blood_pressure | sleep | work)
    value_numeric (REAL, nullable)
    value_secondary (REAL, nullable)  # diastolic for BP
    value_duration (INTEGER, nullable) # minutes
    value_boolean (INTEGER, nullable)  # future use
    recorded_at (TIMESTAMP)
    created_at (TIMESTAMP)

### Indexes

-   Index on user_id
-   Index on metric_type
-   Index on recorded_at
-   Composite index: (user_id, metric_type, recorded_at)

------------------------------------------------------------------------

## 4. API Design

### Metric Endpoints

    GET    /api/metrics?type=weight
    POST   /api/metrics
    PUT    /api/metrics/:id
    DELETE /api/metrics/:id
    GET    /api/metrics/summary?range=30d

### Example Create Request

    POST /api/metrics

    {
      "metric_type": "weight",
      "value_numeric": 198.4,
      "recorded_at": "2026-03-08T07:30:00Z"
    }

------------------------------------------------------------------------

## 5. Frontend Routes

    /login
    /dashboard
    /dashboard/weight
    /dashboard/blood-pressure
    /dashboard/sleep
    /dashboard/work

Dashboard includes: - Summary cards - Line charts per metric - Quick-add
modal - Date range selector (7d / 30d / 90d / All)

For full UI design decisions (navigation, layout, components, empty states,
responsiveness), see [SignalTrack_UI_Spec_v1.md](./SignalTrack_UI_Spec_v1.md).

------------------------------------------------------------------------

## 6. Visualization Requirements (MVP)

-   Line chart per metric
-   Daily aggregation for duration metrics
-   7-day rolling average (weight)
-   Weekly totals (sleep, work)
-   Latest reading highlight

------------------------------------------------------------------------

## 7. Non-Functional Requirements

  Requirement            Target
  ---------------------- ------------
  Page load              \< 2s
  Chart load             \< 500ms
  Supported users        10,000+
  Max entries per user   50,000
  Data retention         Unlimited
  Transport security     HTTPS only

------------------------------------------------------------------------

## 8. Security

-   Session-based authentication (httpOnly cookie)
-   All queries filtered by user_id
-   Server-side validation (Zod)
-   Input sanitization
-   Positioning as wellness tracking (not medical diagnostic)

------------------------------------------------------------------------

## 9. Roadmap (Post-MVP)

Phase 2: - Custom metrics - Goals - Alerts - CSV import/export -
PostgreSQL migration - Redis caching

Phase 3: - Wearable integrations - Public API - Team accounts - AI-based
trend insights

------------------------------------------------------------------------

## 10. Technical Decisions

1.  **Weight unit: lbs only** — configurable units deferred to post-MVP.
2.  **Duration storage: minutes** — sleep and work entries stored as integer minutes; sub-minute precision not needed.
3.  **Deletes: hard deletes** — rows are permanently removed on delete.
4.  **Aggregation strategy: on-demand** — compute rolling averages and weekly totals at query time via SQL. Dataset per user is small enough (≤50k rows) that D1 handles this without precomputed summaries.
5.  **Entry model: updatable** — rows are editable in place. Users can correct mistakes via PUT. Soft deletes (see #3) prevent permanent data loss.

------------------------------------------------------------------------

Document Version: v1.0 Date: 2026-03-08
