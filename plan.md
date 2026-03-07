# Plan: Faster FE/BE Integration Testing Feedback Loop

## Current State Analysis

Immich already has a solid e2e testing infrastructure:

- **API e2e tests**: Vitest + supertest hitting the real server (in `e2e/src/specs/server/api/`)
- **Web e2e tests**: Playwright + real browser against full Docker stack (in `e2e/src/specs/web/`)
- **UI component tests**: Playwright with mocked network (in `e2e/src/ui/`) — no server needed
- **Unit tests**: Vitest for both server (`server/`) and web (`web/`) — fast but isolated

The pain point: the web e2e tests (`make e2e` or `pnpm test:web`) require building the **entire Docker stack** (server Docker image, Postgres, Redis, web app) before a single test runs. The `playwright.config.ts` webServer command is `docker compose up --build`, which takes minutes even for a small change.

## Proposed Plan: Layered Integration Testing with Fast Feedback

### Phase 1: Make Existing E2E Tests Runnable Locally (Quick Win)

**Goal**: Document and streamline running the existing Playwright e2e tests against the dev stack.

1. **Add a `make e2e-web-dev` target** that runs Playwright web tests against the already-running `make dev` stack (port 2283) instead of rebuilding everything:
   ```makefile
   e2e-web-dev:
   	cd e2e && PLAYWRIGHT_BASE_URL=http://127.0.0.1:2283 PLAYWRIGHT_DISABLE_WEBSERVER=1 pnpm exec playwright test --project=web
   ```

2. **Add a `make e2e-web-ui` target** for the interactive Playwright UI mode:
   ```makefile
   e2e-web-ui:
   	cd e2e && PLAYWRIGHT_BASE_URL=http://127.0.0.1:2283 PLAYWRIGHT_DISABLE_WEBSERVER=1 pnpm exec playwright test --ui --project=web
   ```

3. **Add a `make e2e-api-dev` target** for API-only tests against the dev stack:
   ```makefile
   e2e-api-dev:
   	cd e2e && PLAYWRIGHT_BASE_URL=http://127.0.0.1:2283 PLAYWRIGHT_DISABLE_WEBSERVER=1 pnpm test
   ```

**Why this helps**: Developers already run `make dev`. These targets let them run the full Playwright suite against their running dev environment without any rebuild. The dev stack has hot-reload, so code changes are picked up immediately.

### Phase 2: Add Targeted FE/BE Integration Test Suite (New)

**Goal**: Create a lightweight integration test suite specifically designed for fast FE/BE contract validation.

1. **Create `e2e/src/specs/integration/` directory** for focused integration tests that verify FE/BE contracts:
   - Test that key API responses match what the FE components expect
   - Test critical user flows (login, upload, browse, share) end-to-end
   - Test error handling (server returns 4xx/5xx → FE shows correct UI)

2. **Add a Playwright project `integration`** in `playwright.config.ts`:
   ```typescript
   {
     name: 'integration',
     use: { ...devices['Desktop Chrome'] },
     testDir: './src/specs/integration',
     workers: 1,
   }
   ```

3. **Create focused integration test files** for the most common FE/BE touchpoints:
   - `auth-flow.e2e-spec.ts` — login, logout, session expiry, OAuth
   - `asset-upload.e2e-spec.ts` — upload → thumbnail appears → metadata visible
   - `album-management.e2e-spec.ts` — create, add assets, share, unshare
   - `search.e2e-spec.ts` — text search, filters, results rendering
   - `admin-settings.e2e-spec.ts` — config changes persist and take effect in UI

4. **Add Makefile targets**:
   ```makefile
   e2e-integration-dev:
   	cd e2e && PLAYWRIGHT_BASE_URL=http://127.0.0.1:2283 PLAYWRIGHT_DISABLE_WEBSERVER=1 pnpm exec playwright test --project=integration
   ```

### Phase 3: API Contract Testing (Complementary Layer)

**Goal**: Catch FE/BE mismatches before they reach the browser.

1. **Add SDK contract tests** in `web/src/lib/api/__tests__/` that validate the generated SDK types match what FE components actually use. These run as fast unit tests (`cd web && pnpm test`).

2. **Add response shape assertions** to existing API e2e tests — verify that API responses conform to the exact shape the FE relies on (not just the OpenAPI spec, but the actual fields used in components).

3. **Leverage the existing OpenAPI generation pipeline** — if `make open-api` produces type changes, tests should catch any incompatibility between server DTOs and what web components destructure.

### Phase 4: Watch Mode for Integration Tests (Developer Experience)

**Goal**: Enable a TDD-like workflow for FE/BE integration.

1. **Playwright watch mode**: The `start:web` script already exists (`playwright test --ui`). Add a dev variant:
   ```json
   "start:integration": "PLAYWRIGHT_BASE_URL=http://127.0.0.1:2283 PLAYWRIGHT_DISABLE_WEBSERVER=1 pnpm exec playwright test --ui --project=integration"
   ```

2. **Recommended developer workflow documentation**:
   - Terminal 1: `make dev` (starts full stack with hot-reload)
   - Terminal 2: `make e2e-integration-dev` (or `--ui` for interactive mode)
   - Edit FE or BE code → hot-reload picks it up → re-run relevant test

## Why Not Cypress?

The project already uses **Playwright**, which provides equivalent (or better) capabilities:
- Built-in test runner UI with time-travel debugging (`--ui` mode)
- Auto-waiting, network interception, multi-browser support
- Already configured, with test utilities, fixtures, and Docker integration
- The `e2e/src/ui/` tests already demonstrate mocked-network Playwright patterns

Adding Cypress would mean maintaining two browser testing frameworks, duplicating test utilities, and introducing Cypress-specific Docker/CI config. **Sticking with Playwright and making it easier to run locally is the better path.**

## Implementation Summary

| Phase | Effort | Impact | Files Changed |
|-------|--------|--------|---------------|
| Phase 1 | ~1 hour | High — immediate fast feedback | `Makefile` |
| Phase 2 | ~1-2 days | High — targeted integration coverage | `Makefile`, `playwright.config.ts`, new test files |
| Phase 3 | ~1 day | Medium — catches type mismatches early | New test files in `web/` |
| Phase 4 | ~2 hours | Medium — better DX | `e2e/package.json`, docs |

**Recommended starting point**: Phase 1 (5 minutes of Makefile changes) gives immediate value. Then Phase 2 for targeted coverage.
