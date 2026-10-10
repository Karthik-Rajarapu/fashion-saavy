# CLAUDE.md — Working contract for Fashion Saavy

Fashion Saavy is a wardrobe-first AI personal stylist for students and young adults. It understands a user's style and the clothes they own, then helps them create, refine and eventually try on outfits.

**Platform (fixed decision):** a **native cross-platform mobile app** for **Android and iOS**, built with **React Native + Expo + TypeScript** and **Expo Router**. It talks to a **separate API server** (Node.js, PostgreSQL). This is **not** a web app or PWA. Don't add web targets, web-only APIs, DOM-based libraries or browser fallbacks.

## Authoritative documents

| Question | Source of truth |
|---|---|
| What are we building and why? Scope, non-goals | [docs/PRODUCT.md](docs/PRODUCT.md) |
| How does the user experience it? | [docs/UX.md](docs/UX.md) |
| How is it built? Stack, boundaries, constraints | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| How do I run it? | [README.md](README.md) |

If the code and the docs disagree, don't silently pick one. Point out the discrepancy and resolve it, either by fixing the code or by updating the doc with the user's approval.

## Before changing anything

1. Read the docs relevant to the task. For any feature work, that means at least the matching sections of PRODUCT.md and ARCHITECTURE.md.
2. Inspect the code that actually exists (`git status`, the app/module you're touching, its tests). Don't assume that files, scripts or folders described as *planned* exist.
3. Check `package.json` scripts and `app.config.*` for the real commands and native config before running anything.

## Making architectural decisions

- Follow ARCHITECTURE.md:
  - `apps/mobile` is the Expo app.
  - `apps/server` is a modular-monolith API.
  - `packages/contracts` holds the shared Zod schemas, and it is the **only** code the two apps share.
- Business rules and product invariants are enforced on the **server**. The mobile app presents data and captures input.
- Prefer the simplest design that meets the current requirement. Don't add new services, datastores, queues, **native modules / config plugins**, or major dependencies without a stated reason, the user's agreement, and an ARCHITECTURE.md update. A new native module also forces a new store build.
- Prefer Expo-supported modules. If a library needs custom native code, check that it works with Expo development builds and config plugins before proposing it.
- Choose technology on fit, not familiarity. When there are trade-offs, give a recommendation with its reasons and ask before adopting it.
- When a requirement is ambiguous or listed under "Open product questions" or "Open architecture decisions", ask. Don't invent product behavior.

## Coding principles

- TypeScript strict mode, no `any` at boundaries, and validate API input, API responses and AI output with Zod via `packages/contracts`.
- **Server:**
  - Route handlers stay thin, and business logic lives in `src/modules/*`.
  - Import only a module's public `index.ts`, and never write to another module's tables.
  - Vendor SDKs are used only in `src/platform/*`.
- **Mobile:**
  - Screens in `app/` stay thin, and features live in `src/features/*`.
  - Server data goes through TanStack Query hooks in `src/api/`, not a duplicate global store.
  - Native APIs (permissions, secure storage, media, notifications) are wrapped in `src/platform/*`.
- Keep domain logic pure and testable, with I/O kept at the edges.
- Match the existing style and naming. Keep comments for the non-obvious *why*.
- UI should be visual, personal and accessible (see UX.md). Build on the project's own design tokens and components, and don't introduce generic dashboard-style UI kits.
- Everything must work on **both Android and iOS**. Handle platform differences explicitly; never assume one platform.

## Avoid speculative implementation

- Build only what the current task needs. Don't add placeholder modules, empty folders, unused abstractions or "future-proof" config.
- Don't scaffold features that are out of scope (shopping, shoes, generated outfit images, a web client) or that come ahead of the core loop.
- Create a planned folder from ARCHITECTURE.md §3 only when you write real code for it.

## Keeping changes focused

- One concern per change. Don't refactor, rename or reformat unrelated code along the way. Suggest it separately instead.
- Keep diffs reviewable. If a task grows, stop and propose how to split it.
- Commit only when asked, on a branch rather than directly on `main`.

## Testing expectations

- **Server unit tests (Vitest):** domain rules and use-cases, especially the invariants in ARCHITECTURE.md §14 (wardrobe ownership in stylist output, AI never overwriting user data, saved-outfit retention limits).
- **Server integration tests:** repositories and authorization scoping run against real Postgres, not mocks.
- **Mobile tests:** components and hooks use Jest (jest-expo) + React Native Testing Library.
- **E2E:** core-loop journeys run with Maestro on Android and iOS.
- **AI ports:** tested with recorded or fake adapters. Tests never call live AI providers.
- **Contracts:** changes must keep older app versions working (additive within `/v1`).
- Run the relevant tests before reporting work as done, and report failures honestly. If you couldn't verify something on a platform or device, say so.

## Security expectations

- Every user-data query is scoped by `userId`. There are no unscoped access paths.
- Server secrets live only in server environment variables. **Nothing in the mobile app is secret.** `EXPO_PUBLIC_*` and the JS bundle are extractable, so never put API keys, AI keys or storage credentials there.
- Session tokens live only in expo-secure-store, never in AsyncStorage or logs.
- Media stays in private storage behind short-lived signed URLs, and EXIF is stripped server-side.
- Request permissions (camera, photos, notifications) in context with clear purpose strings, never up front. Handle denial gracefully.
- Try-On camera frames never leave the device.
- Treat user free text and AI output as untrusted. Never log image bytes, personal free text or secrets.
- Account deletion must remove all user data and media, and it must be available in the app.

## AI / provider integrations

- All model calls are **server-side only** and go through task-specific ports in `apps/server/src/platform/ai`. The mobile app never calls an AI provider.
- The model proposes and the domain validates. Reject outputs that reference garments the user doesn't own or hasn't confirmed, or that alter locked items.
- AI-extracted attributes are stored as proposals (`source: ai`) until the user confirms them, and must never overwrite user-confirmed values.
- Model IDs and limits belong in config. Prompts are versioned in code next to their port.
- Don't add a new AI provider or capability (such as image generation) without explicit approval.

## When to update documentation

Update docs in the same change when you:

- change the stack, a module boundary, the core data entities, an external service, a native module, or a constraint → ARCHITECTURE.md
- change setup, scripts, tooling or the workflow → README.md
- discover that product or UX behavior differs from the docs → raise it first. Edit PRODUCT.md or UX.md only with approval.

Keep docs concise. Don't copy content between them; link instead.

## Do not change without explicit approval

- **The platform:** native React Native + Expo app for Android and iOS, Expo Router, and a separate API server. No web/PWA client, no switch to another mobile framework, no bare/ejected native workflow.
- Product scope and non-goals (PRODUCT.md), including shopping, shoes, generated outfit photography and photorealistic try-on
- Saved-outfit retention rules (30-day default, 45-day maximum, about 7-day reminder)
- The rules that user-confirmed data is authoritative and that the style profile changes only through a questionnaire retake
- The feedback signal set (Love, Okay, Not for me, Worn)
- The core backend stack (PostgreSQL + Drizzle, pg-boss, S3-compatible private storage), the auth approach, or the AI provider
- Try-On's isolation from the core features
- Breaking API changes, or database migrations that drop or rewrite existing user data
- Adding native modules, permissions or app-store-visible capabilities
