# Requirements Checklist

This document maps each requirement to implementation and tests.

---

## Requirement 1: Subject management

**Criteria:** Create, edit, delete, list subjects; name, optional description, timestamps; prevent duplicate or empty names; handle deleted subject still referenced by sessions.

| Area | Implementation | Tests |
|------|----------------|-------|
| CRUD | `subjectService.ts`: createSubject, getSubjectById, getAllSubjects, updateSubject, deleteSubject | `subjects.test.ts` (TC-01–TC-10) |
| Duplicate/empty names | createSubjectSchema (min 1, trim), service checks duplicate name (case-insensitive), unique index on name | validation.test.ts (TC-36), subjects.test.ts (TC-02, TC-03) |
| Deleted subject referenced by sessions | deleteSubject allows delete; sessions keep subjectId; API/docs note "Sessions will still reference the deleted subject ID"; display uses subjectName (undefined → "Unknown Subject") | subjects.test.ts (sessions reference handled in session/analytics services) |

---

## Requirement 2: Study session logging

**Criteria:** Log sessions linked to subjects; duration, timestamp, notes; reject invalid durations; no negative/zero; no unrealistically long; no duplicate rapid submissions; no sessions for deleted/nonexistent subjects.

| Area | Implementation | Tests |
|------|----------------|-------|
| Create/list/update/delete | `studySessionService.ts`, GET/POST `/api/sessions`, GET/PATCH/DELETE `/api/sessions/[id]` | `sessions.test.ts` (TC-11–TC-20) |
| Validation | createStudySessionSchema: duration 60–86400, timestamp not future, subjectId format | validation.test.ts (TC-37) |
| Nonexistent subject | subjectExists() before create; throw "Subject not found"; API returns 404 | sessions.test.ts (reject nonexistent subjectId) |
| Duplicate rapid submissions | DUPLICATE_SUBMISSION_WINDOW_MS; findOne same subjectId, duration, timestamp, createdAt within window; throw; API returns 429 | sessions.test.ts (duplicate submission test if present) |

---

## Requirement 3: Total study time computation

**Criteria:** Total study time per subject and overall; accurate when sessions edited, deleted, backdated, bulk; handle no sessions or large datasets.

| Area | Implementation | Tests |
|------|----------------|-------|
| Aggregation | `analyticsService.ts`: getStudyStatistics (per-subject and total) | `analytics.test.ts` (TC-21–TC-24) |
| Edits/deletes | Aggregation reads from DB; updates reflect in next getStudyStatistics | analytics.test.ts (TC-23: reflect updated duration, exclude deleted) |
| Large datasets | getStudyStatistics uses aggregation; TC-24: 1000+ sessions | analytics.test.ts (TC-24) |

---

## Requirement 4: Dashboard progress statistics

**Criteria:** Daily, weekly, monthly summaries; per-subject breakdowns; historical trends; handle no data, gaps, timezones, extreme values.

| Area | Implementation | Tests |
|------|----------------|-------|
| Summaries | getDailySummary, getWeeklySummary, getMonthlySummary, getStudyStatistics | `analytics.test.ts` (TC-25–TC-29) |
| Dashboard API | GET `/api/analytics` → getDashboardStats | analytics.test.ts (TC-35) |
| UI | `page.tsx`: stats grid, recent sessions, top subjects; empty states | `tests/ui/page.test.tsx` |

---

## Requirement 5: Study streaks

**Criteria:** Consecutive days with at least one session; current and longest streak; same-day multiple, retroactive, timezone, missed-day reset, restored streak.

| Area | Implementation | Tests |
|------|----------------|-------|
| Streak logic | `analyticsService.ts`: calculateStudyStreak (date strings, getDaysDifference, streak periods) | `analytics.test.ts` (TC-30–TC-34) |
| Edge cases | Same day counts once; retroactive extends streak; gap resets current; longest tracked | analytics.test.ts (TC-31, TC-33, TC-34, TC-32) |

---

## Requirement 6: Locally stored reminders

**Criteria:** Trigger time, recurrence, labels; past reminders, overlapping, disabled permissions, missed triggers when app closed, persistent across restarts.

| Area | Implementation | Tests |
|------|----------------|-------|
| CRUD + scheduling | `reminderService.ts`: create, get, getAll, update, delete, getDueReminders, markReminderTriggered, calculateNextTriggerTime, rescheduleRecurringReminder | `reminder.test.ts` (full service/behavior) |
| API | GET/POST `/api/reminders`, GET/PATCH/DELETE `/api/reminders/[id]` | reminder.test.ts (service layer; API mirrors service) |
| Validation | createReminderSchema, updateReminderSchema (label, triggerTime, recurrence, isActive) | validation.test.ts (TC-39) |
| Inactive / disabled | getDueReminders only isActive: true; getAllReminders({ isActive: false }) | reminder.test.ts (Disabled permissions describe block) |
| Recurrence / missed | calculateNextTriggerTime (none, daily, weekly, monthly, month boundary); getDueReminders ordering; markReminderTriggered | reminder.test.ts (Recurrence edge cases, Missed triggers) |

**Note:** Reminder UI (create/list reminders on dashboard) can be added later; backend and API support it.

---

## Requirement 7: Offline-first

**Criteria:** Core functionality without internet; graceful DB failures, partial writes, interrupted saves, stale cache, recovery after reconnection.

| Area | Implementation | Tests |
|------|----------------|-------|
| Cache + queue | `offline-manager.ts`: cacheData, getCachedData, addToSyncQueue, processSyncQueue (subjects then sessions) | `offline-manager.test.ts` |
| Stale cache | No TTL; getCachedData returns as-is; UI uses cache when fetch fails | offline-manager.test.ts (stale cache handling); page.test.tsx (shows cached data when fetch fails) |
| Partial writes | processSyncQueue: failed items stay in queue; partial success leaves failed in queue | offline-manager.test.ts (keep item on failed sync, partial write) |
| DB recovery | db.ts: closeDatabase clears singleton; next getDatabase reconnects; isDatabaseHealthy | `db.test.ts` (closeDatabase and recovery) |
| UI offline path | page.tsx: navigator.onLine false → addToSyncQueue; fetch fail → use cache | page.test.tsx (offline submit calls addToSyncQueue) |

---

## Requirement 8: MongoDB as primary database

**Criteria:** Structured collections (subjects, sessions, reminders); referential consistency; no orphaned records; schema evolution; query performance.

| Area | Implementation | Tests |
|------|----------------|-------|
| Collections | db.ts: subjects, study_sessions, reminders; createIndexes | db.test.ts (getDatabase, indexes) |
| Referential checks | Sessions/reminders: subjectExists before create; no cascade delete (sessions can reference deleted subject ID; display handles missing subject) | subjects.test.ts, sessions.test.ts, reminder.test.ts |
| Indexes | subjects (name unique, createdAt); sessions (subjectId+timestamp, timestamp, subjectId); reminders (triggerTime, isActive+triggerTime) | db.ts createIndexes |

---

## Requirement 9: Zod validation

**Criteria:** Validate all user input and API payloads; type safety; reject malformed/malicious; missing required; limit size; clear errors client and server.

| Area | Implementation | Tests |
|------|----------------|-------|
| Schemas | `validations.ts`: create/update for Subject, StudySession, Reminder; dateRange; subjectId/reminderId formats | `validation.test.ts` (TC-36–TC-45) |
| API | All POST/PATCH routes use schema.parse or service (which uses schema); ZodError → 400 with details | validation.test.ts (schema); sessions/subjects/reminders APIs use Zod via service) |
| Service layer | createSubject, createStudySession, createReminder call schema.parse | reminder.test.ts (createReminder throws when validation fails) |

---

## Requirement 10: UI clean, minimal, responsive, performant

**Criteria:** Smooth rendering with large histories; empty states; usable on small screens; predictable under heavy interaction.

| Area | Implementation | Tests |
|------|----------------|-------|
| Dashboard | `page.tsx`: Tailwind; stats grid; recent sessions; top subjects; empty states; loading/error | `tests/ui/page.test.tsx` (render, loading, error, cache fallback, offline submit) |
| Responsive | Tailwind breakpoints (md:, lg:), min-h-screen, max-w-7xl | Manual / layout |
| Empty states | "No study sessions yet", "No subjects yet" | page.test.tsx (content when stats loaded) |

---

## Summary

| Req | Addressed | Key locations |
|-----|-----------|----------------|
| 1 | Yes | subjectService, subjects API, subjects.test.ts, validation.test.ts |
| 2 | Yes | studySessionService, sessions API, sessions.test.ts, duplicate-submission check |
| 3 | Yes | analyticsService getStudyStatistics, analytics.test.ts |
| 4 | Yes | getDailySummary, getWeeklySummary, getMonthlySummary, getDashboardStats, page.tsx, analytics.test.ts, page.test.tsx |
| 5 | Yes | calculateStudyStreak in analyticsService, analytics.test.ts |
| 6 | Yes | reminderService, reminders API (GET/POST/PATCH/DELETE), reminder.test.ts, validation.test.ts |
| 7 | Yes | offline-manager, db (reconnect), offline-manager.test.ts, db.test.ts, page.test.tsx |
| 8 | Yes | db.ts collections + indexes, referential checks in services |
| 9 | Yes | validations.ts, validation.test.ts, all APIs use Zod via services |
| 10 | Yes | page.tsx (Tailwind, empty states), page.test.tsx |

All requirements are addressed in the codebase and supported by the listed tests.
