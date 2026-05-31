# Demo Product Contract

`PRESENTATION.md` is the product-demo contract. If the final app does not support a feature claimed there, the team must either fix the product or revise the presentation before delivery. Do not leave a claimed demo feature in a broken or unverified state.

## Claimed Demo Features

### Programs List

Claimed behavior:

- Multi-program organization with icons.
- Issue and week/sprint counts.
- Owner assignments and timestamps.
- Sortable table with customizable columns.

Likely code/evidence areas:

- `web/src/pages/Programs.tsx`
- `web/src/components/document-tabs/ProgramOverviewTab.tsx`
- `web/src/components/document-tabs/ProgramProjectsTab.tsx`
- `web/src/components/document-tabs/ProgramWeeksTab.tsx`
- `api/src/routes/programs.ts`
- `docs/screenshots/programs-list.png`

### Sprint Planning Timeline

Claimed behavior:

- Visual timeline.
- Burndown chart.
- Week/sprint cards with status.
- Plan/retro status indicators.
- Issue list for scope.

Likely code/evidence areas:

- `web/src/components/document-tabs/ProjectWeeksTab.tsx`
- `web/src/components/document-tabs/ProgramWeeksTab.tsx`
- `web/src/components/AccountabilityGrid.tsx`
- `api/src/routes/weeks.ts`
- `docs/screenshots/sprint-planning-timeline.png`

### Sprint Planning View

Claimed behavior:

- Planning, Standups, and Review tabs.
- Drag or move issues between backlog and sprint scope.
- Priority badges.
- Progress bar.

Likely code/evidence areas:

- `web/src/lib/document-tabs.tsx`
- `web/src/components/document-tabs/WeekIssuesTab.tsx`
- `web/src/components/dialogs/BacklogPickerModal.tsx`
- `web/src/components/IssuesList.tsx`
- `api/src/routes/issues.ts`
- `api/src/routes/weeks.ts`
- `docs/screenshots/sprint-planning-view.png`

### Daily Standups

Claimed behavior:

- Rich text updates.
- Author attribution and timestamps.
- Date grouping.
- Edit/delete permission for own standups only.

Likely code/evidence areas:

- `web/src/components/StandupFeed.tsx`
- `web/src/components/document-tabs/WeekStandupsTab.tsx`
- `api/src/routes/standups.ts`
- `api/src/routes/standups.test.ts`
- `shared/src/types/document.ts`
- `docs/screenshots/sprint-standups.png`

### Sprint Review

Claimed behavior:

- Pre-filled draft.
- Hypothesis validation state.
- Rich text narrative.
- Issue summary and deliverables.
- Owner-only update authorization.

Likely code/evidence areas:

- `web/src/lib/document-tabs.tsx`
- `api/src/routes/weeks.ts`
- `api/src/routes/sprint-reviews.test.ts`
- `shared/src/types/document.ts`
- `docs/screenshots/sprint-review.png`

### Project Retrospective

Claimed behavior:

- Issue summary.
- ICE scores.
- Monetary impact tracking.
- Hypothesis validation.
- Success criteria, learnings, and next steps.

Likely code/evidence areas:

- `web/src/components/ProjectRetro.tsx`
- `web/src/components/document-tabs/ProjectRetroTab.tsx`
- `api/src/routes/projects.ts`
- `api/src/routes/project-retros.test.ts`
- `shared/src/types/document.ts`
- `docs/screenshots/project-retro.png`

### Observer Dashboard

Claimed behavior:

- Cross-program leadership visibility.
- Current production docs mention `/dashboard?view=observer`.

Likely code/evidence areas:

- `web/src/pages/Dashboard.tsx`
- `web/src/components/dashboard/DashboardVariantC.tsx`
- `web/src/hooks/useObserverDashboard.ts`
- `api/src/routes/dashboard.ts`
- `docs/shipshape-final-submission-package.md`

### OpenAPI Documentation

Claimed behavior:

- Swagger UI at `/api/docs`.
- Raw OpenAPI JSON/YAML.
- Documented schemas and endpoints.

Likely code/evidence areas:

- `api/src/swagger.ts`
- `api/src/openapi/**`
- `api/openapi.json`
- `api/openapi.yaml`
- `docs/screenshots/openapi-docs.png`

## Demo Verification Rule

Each claimed feature should have at least one of:

- Passing unit/API test.
- Passing Playwright/browser flow.
- Fresh screenshot from the current app.
- Clear documentation explaining why the presentation was revised.

## Current Risk Notes

- The app has shifted terminology from "sprint" toward "week" in several places. Demo language must match the UI or be explained.
- `PRESENTATION.md` references branch/commit statistics that may not match current `master`.
- Screenshots exist, but they must be checked against the current running app before final delivery.
