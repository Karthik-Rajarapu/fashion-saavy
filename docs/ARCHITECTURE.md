# Fashion Saavy — Architecture

> Authoritative for **how the system is built**. Product scope is in [PRODUCT.md](PRODUCT.md) and experience in [UX.md](UX.md). This document describes the *intended* architecture. As of the foundation stage, no application code exists yet. Update this document whenever the implementation deliberately departs from it.

## 1. Architectural stance

- **A native cross-platform mobile app plus one API server.** Fashion Saavy ships as a React Native + Expo app for **Android and iOS**. It talks to a single backend deployable over a versioned HTTP API. There is no web or PWA client.
- **The backend is a modular monolith.** It is one server with strict internal module boundaries. A module is only extracted into a separate service when there is a measured reason (independent scaling, a different runtime, or a different release cadence), never ahead of time.
- **The server is the source of truth.** Persistence, authorization, AI calls and every product invariant are enforced on the server. The mobile client presents data and captures input. It never holds secrets or enforces business rules on its own.
- **Native capabilities are first-class.** Camera, photo library, permissions, notifications, secure storage and on-device vision use native modules, not web fallbacks.
- **Confirmed user data is authoritative.** This is enforced in the data model and domain logic, not only in the UI.
- **Try-On is isolated.** The core loop must build, test and ship without it.

## 2. Technology stack

### Mobile client

| Concern | Choice | Rationale |
|---|---|---|
| Platform | **React Native + Expo**, Android and iOS | One TypeScript codebase for both platforms, with native camera, media, notification and device APIs. Expo's managed tooling keeps native configuration declarative. |
| Native workflow | **Expo development builds** with Continuous Native Generation (`ios/` and `android/` are generated, not committed) | Try-On and camera work need native modules that Expo Go can't load. Native config lives in `app.config.ts` and config plugins. |
| Navigation | **Expo Router** | File-based routes, with typed routes, deep links and native stack/tab navigators. |
| Server state | **TanStack Query** | Caching, retries, polling of async jobs (garment extraction) and optimistic feedback, with no hand-rolled global store. |
| Local state | React state/context. A small store only if a real cross-screen need appears | Avoids speculative state infrastructure. |
| UI | React Native primitives + a **project-owned component set and design tokens**, **Reanimated** for motion, **expo-image** for images | A distinctive, fashion-forward identity. Avoids generic component kits that look like SaaS dashboards. expo-image provides disk caching for the image-heavy UI. |
| Media capture | **expo-image-picker** (camera + library) and **expo-image-manipulator** (resize/compress before upload) | Covers garment capture with the least native surface. |
| Secure storage | **expo-secure-store** | Session tokens stored in Keychain / Keystore. |
| Notifications | **expo-notifications**, only once the reminder channel is decided | Saved-outfit reminder delivery is an open product question (PRODUCT.md). |
| Try-On | **react-native-vision-camera** (frame processors) + on-device pose estimation + **react-native-skia** overlay | Real-time camera frames processed on the device, with GPU-rendered overlays. The pose library is chosen by a spike (§9). |

### Backend

| Concern | Choice | Rationale |
|---|---|---|
| Runtime / language | **Node.js LTS**, TypeScript (strict) | The same language as the client, with shared contracts. |
| HTTP framework | **Hono** | Small, TypeScript-first and standards-based, with first-class Zod validation. A plain JSON API needs nothing heavier. |
| Database | **PostgreSQL** | The data is relational (users → garments → outfits → feedback), so we need constraints and transactions. JSONB covers the evolving garment-attribute and context shapes. Postgres can also back the job queue. **Interim (implemented):** development and tests run PGlite, the PostgreSQL engine embedded in the Node process (on disk in development, in memory in tests). A driver for a hosted Postgres server is not built yet, and the server refuses to start in production. |
| Data access | **Drizzle ORM** + SQL migrations | Typed and close to SQL, with explicit, reviewable migrations. |
| Validation / contracts | **Zod**, shared through a contracts package | One schema each for request/response DTOs, AI output and config, validated on both sides of the wire. |
| Media storage | **S3-compatible object storage** (private) | Garment images are large and private. Uploads and downloads use short-lived signed URLs. The vendor is chosen at deployment time. **Interim (implemented):** a private local-disk adapter behind the same signed-URL interface, served by the API's `/v1/uploads/:token` and `/v1/files/:token` capability routes. |
| Image processing | **sharp** | Normalization, resizing, EXIF/GPS stripping, derivatives. |
| Background jobs | **pg-boss** | Handles AI extraction, Try-On asset generation, saved-outfit expiry and reminders, with no Redis. |
| Auth | **Better Auth** + its Expo client integration | Self-hosted, with sessions in our Postgres. The token is kept in secure storage on the device. **Interim (implemented):** none of this exists yet. A development-only identity trusts the `X-Dev-User-Id` header when the server runs with `DEV_AUTH=true`, and the config refuses that in production. Data is still owner-scoped and tested for cross-user isolation. |
| AI (language + vision) | **Anthropic Claude** via the official SDK, behind internal `ai` ports | One provider covers garment attribute extraction (vision) and outfit composition/rationale, with structured output. Models are set in config, and the port allows a provider swap. |

### Shared tooling

| Concern | Choice |
|---|---|
| Repository | **pnpm workspaces** monorepo (see §3) |
| Editor | **VS Code** is the primary environment. Android Studio is used only for the Android SDK and emulator. Xcode (macOS only) is needed for the iOS simulator and local iOS builds. |
| Builds & distribution | **EAS Build / Submit** for store builds, especially iOS from non-macOS machines. **EAS Update** for JS-only over-the-air fixes. *(Approved; build and release setup is deferred until it is needed.)* |
| Testing | Server: **Vitest** against real Postgres in Docker. Mobile: **Jest (jest-expo) + React Native Testing Library**. E2E: **Maestro** on Android emulator and iOS simulator/device. |
| Quality | TypeScript strict, checked per package with `tsc --noEmit`; workspace packages are consumed as TypeScript source (no build step). ESLint and Prettier are planned but not yet configured. |
| Local services | None needed yet (PGlite and local-disk storage, see above). Docker Compose for Postgres and an S3-compatible store once those adapters exist. |
| Hosting | API: any container host + managed Postgres + S3-compatible storage. App: Google Play and the Apple App Store. |

## 3. Application structure (planned)

Folders are created **only when the code that needs them is written**.

```text
apps/
  mobile/                 Expo app (Android + iOS)
    app/                  Expo Router routes — thin screens; delegate to features
    src/
      features/           onboarding, wardrobe, stylist, saved-outfits, inspiration, profile, try-on
      api/                HTTP client, auth token handling, TanStack Query hooks per resource
      ui/                 design tokens and components (no business logic)
      platform/           permissions, secure storage, media capture/upload, notifications, config
  server/                 API server (single deployable)
    src/
      http/               Hono routes, auth middleware, error mapping — thin; delegate to modules
      modules/
        identity/         users, sessions, account deletion
        style-profile/    questionnaire, profile versions, summary
        wardrobe/         garments, attributes, garment images, Try-On assets
        stylist/          outfit generation, refinement, rationale
        feedback/         feedback events, preference signals
        saved-outfits/    saving, expiry, extension, reminders
        inspiration/      case studies, personalized Home feed
      platform/           db, storage, ai, jobs, auth, config, logging — infrastructure adapters
      jobs/               pg-boss worker entry (same codebase, may run as a separate process)
packages/
  contracts/              Zod request/response schemas, shared enums and API types — no logic, no I/O
```

**Expo Router route groups (indicative)**

```text
app/
  (auth)/          sign-in
  (onboarding)/    questionnaire → Style Profile reveal → first garments
  (tabs)/          home · wardrobe · stylist · profile  — the four primary destinations
  outfit/[id]      outfit view, refinement, feedback, save
  try-on/[outfitId]  modal presentation, launched only from an outfit
```

A root layout routes the user to `(auth)`, `(onboarding)` or `(tabs)` depending on session and profile state. Try-On is never a tab.

**Server modules** expose a small public API (an `index.ts` of use-cases, queries and types), with `domain/` (pure rules), `application/` (use-cases) and `infrastructure/` (repositories and adapters).

**Rules**

- `http/` and the job worker import only module public APIs. Business rules never live in route handlers.
- Server modules never import another module's internals or write to its tables. Cross-module reads go through public queries (for example, `stylist` reads `wardrobe.listConfirmedGarments(userId)` and `feedback.getPreferenceSignals(userId)`).
- Only `platform/` (on either side) touches vendor SDKs and native modules. The exception is Try-On, which owns its camera/vision dependencies inside its feature folder so it stays removable.
- `apps/mobile` and `apps/server` never import each other. They share **only** `packages/contracts`.
- Mobile `features/` don't import each other's internals. Shared UI goes in `ui/` and shared data access in `api/`.

## 4. Mobile client / backend boundary

- **The server owns** persistence, authorization, AI calls, media signing, scheduling (expiry, reminders) and every product invariant in §14. AI keys, storage credentials and database access never reach the device.
- **The mobile client owns** presentation, navigation, local interaction state, optimistic UI, media capture and pre-upload compression, permission prompts, notification handling, and the whole Try-On runtime.
- **State ownership:** server data lives in the TanStack Query cache, keyed per resource and invalidated after mutations. It is never copied into a separate global store. Ephemeral UI state (form drafts, the Stylist request being composed, refinement locks before submission) stays local to the screen or feature.
- The client may mirror server validation through the shared contracts for fast feedback, but the server re-validates everything.
- **Anything bundled in the app is public.** `EXPO_PUBLIC_*` variables and the JS bundle can be extracted from the binary, so only non-secret config (such as the API base URL) goes there.
- Long AI operations return a job or outfit ID straight away. The client polls status through TanStack Query, and responses are never held open indefinitely. No WebSockets in V1.
- **Connectivity:** the app requires a connection for the core loop. Cached query data may be shown while refreshing. Offline-first sync is not a V1 requirement.

## 5. Domain boundaries

| Module | Owns | Key invariants |
|---|---|---|
| identity | user, session, account | Account deletion removes all user data and media. |
| style-profile | questionnaire responses, profile versions, summary | Profiles are **versioned**. Retaking the questionnaire creates a new active version and does not mutate the old one. Feedback never rewrites the profile. |
| wardrobe | garments, garment images, attributes, Try-On assets | Each attribute records its **source** (`ai` or `user`). AI never overwrites a user-confirmed value. Only **confirmed** garments are eligible for styling. Clothing only (no shoes category in V1). `fits` defaults to true. |
| stylist | outfit requests, outfits, outfit items, revisions | Every outfit item must reference a confirmed garment **owned by the requesting user**. Refinement creates a new revision and preserves locked items. |
| feedback | feedback events, derived preference signals | Feedback is stored as append-only events. Signals are derived from them, and **Worn** carries the strongest weight. |
| saved-outfits | saved outfit records | `expires_at` defaults to saved + 30 days. Extension is capped at saved + 45 days. A reminder is sent about 7 days before expiry. Expired saves are removed. |
| inspiration | case studies, content tags | Read-only for users. Personalization is done by matching content tags to the style profile. |
| try-on *(mobile only)* | an ephemeral on-device session | No persistence and no server module. It only reads outfit garment assets (§9). |

## 6. Data architecture

PostgreSQL is the system of record. Every user-owned table carries `user_id`. The main entities (indicative, not a schema):

- `users`, `sessions` (auth)
- `style_profile_versions`: questionnaire answers (JSONB), generated summary, `is_active`, `created_at`
- `garments`: category, status (`draft` | `confirmed` | `archived`), attributes (JSONB with per-field `value` + `source`), `fit_note` (nullable, meaning it fits)
- `garment_images`: storage key, derivatives (display, thumbnail, Try-On asset), dimensions
- `outfits`, `outfit_revisions`, `outfit_items` (revision → garment, slot, locked); request context (JSONB); rationale
- `feedback_events`: outfit revision, type (`love` | `okay` | `not_for_me` | `worn`), timestamp
- `saved_outfits`: outfit revision, `saved_at`, `expires_at`, `reminded_at`
- `inspiration_items`: content, images, style tags
- `push_tokens`: device, platform, token (only if push is chosen for reminders)

Notes:

- Garments referenced by past outfits are **archived**, not hard-deleted, so outfit history stays intact. Account deletion is the exception and removes everything.
- Garment attributes are JSONB, validated by Zod schemas versioned in code, so the taxonomy can evolve without constant migrations. Attributes used for filtering are promoted to columns or indexes once a real query needs them.
- Schema changes happen only through committed migrations.
- On the device, only the session token (secure store), the TanStack Query cache and the expo-image disk cache are persisted. No user data is stored in plain AsyncStorage beyond non-sensitive UI preferences.

## 7. AI integration boundary

All model access is **server-side only**, through `apps/server/src/platform/ai`. It exposes task-shaped ports rather than a generic "chat" API:

- `extractGarmentAttributes(image) → ProposedAttributes`
- `composeOutfit(StylistContext) → OutfitProposal` (garment IDs + slots + rationale)
- `refineOutfit(StylistContext, currentRevision, instruction, lockedItems) → OutfitProposal`
- `summarizeStyleProfile(answers) → ProfileSummary`

**Rules**

1. **The model proposes and the domain validates.** Every AI output is parsed with Zod. In stylist output, any garment ID that isn't in the user's confirmed wardrobe, or a locked item that changed, is rejected and retried or reported. Hallucinated garments must never reach the user.
2. **Deterministic first, generative second.** The stylist module assembles a bounded `StylistContext` (profile summary, the relevant confirmed garments as compact structured attributes, request context, an optional inspiration reference, and summarized preference signals). It applies hard filters (ownership, confirmed status, user-specified constraints) before calling the model.
3. **Learning is contextual, not training.** Feedback influences recommendations through the preference signals included in the context and through candidate ranking. No model fine-tuning is done on user data.
4. **AI output is advisory.** Extracted attributes are stored as `source: ai` and stay as proposals until the user confirms them.
5. **User text is untrusted.** Free-text requests are passed as data, never as instructions that can override system rules. Model outputs cannot trigger writes outside the calling use-case.
6. **The provider stays behind the port.** Model IDs, timeouts and retry policy come from config. Prompts are versioned in code next to their port. Calls are logged with latency, token and cost metadata, but without image bytes or personal free text.
7. **Cost and abuse controls.** Requests are rate-limited per user, and garment extraction runs as an async job.
8. **No AI on the device.** The mobile app never calls an AI provider directly. On-device pose estimation for Try-On is computer vision, not a generative AI integration.

## 8. API boundaries

- **One versioned REST/JSON API** over HTTPS (`/v1/...`), served by `apps/server`. It is the only way the mobile app reaches the backend. The only exception is direct object-storage transfers using signed URLs the API issues.
- Request and response shapes are defined in `packages/contracts`. The server validates input with Zod, resolves the session, and passes `userId` explicitly into use-cases. The mobile `api/` layer parses responses with the same schemas.
- **Backward compatibility is mandatory.** Installed app versions stay in use for months, so changes within `/v1` are additive only. A breaking change requires `/v2` or a deliberate minimum-app-version gate, where the API answers outdated clients with an "update required" response that the app handles.
- Errors use one consistent envelope (a code plus a safe message). Raw provider or database errors are never returned.
- No public partner API and no webhooks in V1.

## 9. Try-On / vision boundary

- Try-On lives in `apps/mobile/src/features/try-on`, reached through a single modal route launched from an outfit. No other feature imports it. Removing the feature folder, its route and its native dependencies must leave the app building and the core loop working.
- **Native and on-device:** react-native-vision-camera frame processors → pose landmark estimation → identify the body region per garment slot → transform and warp the garment's Try-On asset → render the overlay with Skia → track continuously.
- **Pose estimation library:** to be selected by a time-boxed spike, comparing MediaPipe Pose Landmarker and Google ML Kit Pose Detection on both platforms. The criteria are cross-platform parity, frame rate on mid- and low-range Android devices, and integration effort with Expo config plugins. Platform-exclusive body tracking (such as ARKit) is avoided so Android and iOS behave the same.
- **Input contract (read-only):** an outfit revision's garments, each with its category and Try-On asset URL. Try-On writes nothing itself. Feedback recorded from the Try-On screen goes through the same feedback API as every other screen.
- **Privacy:** camera frames and landmarks are processed in memory on the device. They are never uploaded or stored.
- **Asset generation** (garment background removal) is a server-side job owned by `wardrobe`. If load requires it, this is the first candidate for extraction into a separate media/vision worker.
- **Availability:** the app checks camera permission and device capability at runtime. If Try-On is unsupported or denied, it is hidden or explained, and the core loop is unaffected.

## 10. Image & media handling

- **Capture:** expo-image-picker (camera or library). Camera and photo-library permissions are requested in context, never during onboarding, with purpose strings declared in app config. If permission is denied, the app explains why it's needed and links to system settings.
- **Pre-upload:** the client resizes and compresses with expo-image-manipulator to keep cellular uploads small. The client must not be trusted for sanitization.
- **Upload:** `POST /v1/garment-images` returns an upload ticket shaped like an S3 presigned POST (`url`, `fields`, `fileField`, size and type limits). The app sends `multipart/form-data` there, then creates or updates a garment that references the returned image id. With the local-disk adapter, the API processes the photo during the upload. With S3, processing runs when the garment references the image. Photos are stored under `users/{userId}/garment-images/{imageId}/`, and only re-encoded display and thumbnail JPEGs are kept (no originals, no EXIF).
- **Server processing:** validate type and size → strip EXIF (including GPS) → normalize orientation and format → generate display, thumbnail and (later) Try-On derivatives → hand off to AI extraction.
- **Reads:** the bucket is private and images are served through short-lived signed URLs. Signed URLs change, so expo-image caching must be keyed by the stable image ID, not by the URL.
- Only processed derivatives are sent to the AI provider, never originals with metadata.
- Account or garment deletion removes the stored objects (garment deletion only applies when the garment isn't referenced. Otherwise it is archived, per §6).

## 11. Authentication & authorization

- **Better Auth** on the server, with sessions in Postgres. The mobile app uses Better Auth's Expo integration: the session token is kept in **expo-secure-store** and sent with every API request. Tokens never go to AsyncStorage or logs.
- Sign-in methods remain an open product question. One constraint to remember: if third-party social sign-in is offered on iOS, Apple's App Store rules generally require offering Sign in with Apple as well.
- Redirect-based sign-in flows use the app's registered deep-link scheme.
- **Authorization is ownership-based.** Every repository method takes `userId` and scopes its queries by it, and there is no unscoped data access path for user-owned data. Cross-user access attempts return "not found".
- There are no roles in V1 besides a possible internal content-authoring capability for inspiration, which stays restricted and separate from the mobile app.
- Account deletion is a first-class use-case, available inside the app. It is required by app-store policies and by personal-data obligations, including India's DPDP Act.

## 12. External service boundaries

| Service | Used by | Boundary |
|---|---|---|
| AI provider (Anthropic) | `server/platform/ai` | Task ports, Zod-validated output, timeouts, retries, rate limits |
| Object storage | `server/platform/storage`; the device only through signed URLs | Private bucket, per-user prefixes |
| Push (Expo Push Service → APNs/FCM), if reminders use push | `server/platform/notifications`, `mobile/platform/notifications` | Added only once the product decides the channel |
| Pose estimation SDK | `mobile/features/try-on` | On-device only. Chosen by spike (§9). |
| EAS (Build/Submit/Update) | Build and release pipeline, not runtime | Approved; not yet configured |
| App Store / Google Play | Distribution | Store policies apply (account deletion, permission purpose strings, privacy disclosures) |

Each vendor sits behind one adapter. Domain code never imports vendor SDKs.

## 13. Scalability & release approach

- The API is stateless and scales horizontally. Sessions and jobs live in Postgres, and media lives in object storage. The pg-boss worker can run in the same process at first and as its own process later, from the same codebase.
- **The main bottleneck is AI latency and cost**, not request throughput. We address it with async jobs, bounded contexts (only relevant garments are sent), caching profile summaries, and per-user rate limits.
- Postgres is indexed on `user_id` plus access patterns. Read replicas are added only when they're needed.
- Images use thumbnails and derivatives in lists, client-side disk caching, and a CDN in front of storage once traffic justifies it.
- **Mobile release:** native changes (new native modules, permissions, SDK upgrades) require a new store build. JS-only fixes may ship over the air, but only if they're compatible with the installed runtime version. The API must stay compatible with every supported app version (§8).
- **Extraction order when justified:** (1) the media/vision worker for background removal and extraction, (2) the stylist AI orchestration. Each is extracted only with metrics showing the need.

## 14. Architectural constraints

1. Fashion Saavy is a **native React Native + Expo app for Android and iOS**. No web/PWA client is built or shipped.
2. Stylist outputs may only reference the requesting user's **confirmed** garments.
3. AI never overwrites user-sourced data, and AI is called only from the server.
4. The style profile changes only through a questionnaire (re)take, which creates a new version.
5. Saved outfit retention is 30 days by default, with a hard maximum of 45 days. This is enforced server-side.
6. There is no shoe category in the V1 wardrobe taxonomy.
7. Outfits are represented by the user's garment images. There is no generated outfit photography pipeline.
8. Try-On has no dependency on, and no write access to, the core features beyond the shared feedback API, and it must be removable without breaking the build.
9. Camera frames never leave the device.
10. No secrets in the mobile app or its bundled config.
11. API changes within a version are backward compatible.
12. No e-commerce, product catalog or affiliate integrations without an explicit product decision.
13. No new deployable services, datastores, queues or native modules without a documented reason in this file.

## Open architecture decisions

| Decision | Current proposal | Needs |
|---|---|---|
| Pose estimation library for Try-On | MediaPipe vs ML Kit spike | A spike before Try-On work starts |
| Reminder delivery mechanism | Depends on the product decision (in-app / push / email) | Product decision (PRODUCT.md open questions) |
| Developer accounts | Apple Developer Program, Google Play Console | Required before device distribution and store release |
| Secure cross-device identity and hosting | Better Auth (documented), a hosted Postgres driver and the S3 adapter | The sign-in method (open product question in PRODUCT.md) and a hosting choice. Until then, data is per development server and identity is the dev-only header. |
| App identifiers | `com.fashionsaavy.app` (Android package and iOS bundle ID), used for local development builds only | Confirmation before any store or EAS setup; the identifiers are permanent once published |
