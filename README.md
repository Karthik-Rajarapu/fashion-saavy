# Fashion Saavy

A wardrobe-first AI personal stylist for students and young adults. Fashion Saavy learns your style and the clothes you already own, then helps you put together, refine and (eventually) try on outfits.

It is a **native cross-platform mobile app for Android and iOS**, backed by a separate API server.

## Status

**Early build.** The mobile app has its four primary destinations (Home, Wardrobe, Stylist, Profile) with the visual identity in place.

- **Works:** the wardrobe. You can add a garment with a photo, review and edit its details, see it in Wardrobe, edit it and delete it. Garments and photos are stored by the API server, so they survive app restarts.
- **Development-only foundations:** there is no real sign-in yet. Identity is a development header (`DEV_AUTH`), and the server refuses to run in production. The database is embedded PostgreSQL (PGlite), and photos are kept on the server's local disk (see [ARCHITECTURE.md](docs/ARCHITECTURE.md), "Open architecture decisions").
- **Not built yet:** the style questionnaire, outfit generation and Try-On. Home stories and the example Style Profile are sample content and are labelled as such.

## Documentation map

| Document | Read it for |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Vision, target user, product concepts, V1 scope, non-goals, open questions |
| [docs/UX.md](docs/UX.md) | Information architecture, navigation, user journeys, experience principles |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, mobile/server boundary, data, AI and Try-On boundaries, security, constraints, open architecture decisions |
| [CLAUDE.md](CLAUDE.md) | Working rules for development, for AI agents and for humans |

New here? Read PRODUCT.md first, then ARCHITECTURE.md §1–§4.

## Repository layout

```text
apps/mobile          Expo app (Android + iOS), Expo Router
apps/server          Hono API server
packages/contracts   Zod schemas shared by mobile and server (the only shared code)
```

## Planned stack

- **Mobile app** (`apps/mobile`): React Native + Expo + TypeScript, Expo Router, TanStack Query, and Expo development builds for Android and iOS. Try-On is built on-device with react-native-vision-camera and Skia.
- **API server** (`apps/server`): a Node.js + TypeScript modular monolith on Hono, with PostgreSQL (Drizzle), pg-boss jobs, Better Auth, S3-compatible private image storage, and Anthropic Claude behind internal AI interfaces.
- **Shared** (`packages/contracts`): Zod API contracts, in a pnpm workspaces monorepo.

The full rationale is in [ARCHITECTURE.md §2](docs/ARCHITECTURE.md#2-technology-stack). Items that still need approval are listed under "Open architecture decisions" at the end of that document.

## Development setup

### Prerequisites

- **VS Code** (primary development environment)
- **Node.js 24 LTS** or newer
- **pnpm**, the version pinned in `package.json` (`packageManager`). Run `corepack enable pnpm` once.
- **Android Studio**, only for the Android SDK, platform tools and emulator (not used as the editor). Set `ANDROID_HOME`.
- An Android device or emulator. For iOS, either a Mac with Xcode (simulator and local builds) or EAS cloud builds (not yet configured) installed on a physical iPhone.

No Docker or database server is needed yet. The API embeds PostgreSQL (PGlite) and stores photos on local disk, under `apps/server/.data/` (gitignored). An Anthropic API key will be needed once AI features exist.

### First run

```sh
pnpm install
cp apps/server/.env.example apps/server/.env   # DEV_AUTH=true and a STORAGE_SIGNING_SECRET for local development
cp apps/mobile/.env.example apps/mobile/.env   # then set EXPO_PUBLIC_API_URL for your device (see the file)
```

### Commands (from the repository root)

| Command | What it does |
|---|---|
| `pnpm dev:server` | Starts the API on port 3000 (override with `PORT`), with reload on change. It applies database migrations on start |
| `pnpm dev:mobile` | Starts the Expo dev server for the development build |
| `pnpm --filter @fashion-saavy/mobile android` | Builds and installs the Android development build (needs the Android SDK) |
| `pnpm --filter @fashion-saavy/mobile ios` | Builds and installs the iOS development build (macOS + Xcode only) |
| `pnpm typecheck` | Type-checks every package |
| `pnpm test` | Runs all tests (`test:server` uses Vitest, `test:mobile` uses Jest + React Native Testing Library) |

The app runs as an Expo **development build**, not Expo Go, because later milestones need native modules. Build it once with the `android`/`ios` command. After that, `pnpm dev:mobile` is enough until a native dependency changes.

### Preview on Android with Expo Go

A temporary way to see the app on a phone without the Android SDK. It works only while the app uses no native modules beyond those included in Expo Go. Future native modules may require a custom development build.

Prerequisites: dependencies installed (`pnpm install`), a compatible version of the **Expo Go** app on an Android phone, and the phone and PC on the same Wi-Fi network.

1. From the repository root, run `pnpm --filter @fashion-saavy/mobile exec expo start --go`. Note that `pnpm dev:mobile` targets the development build, which Expo Go can't open.
2. In Expo Go, scan the QR code shown in the terminal.

- If the phone can't find the PC (common on campus Wi-Fi), connect the PC to the phone's hotspot and try again.
- If Expo Go reports an SDK version mismatch, follow Expo's compatibility guidance for this project's Expo SDK version (see `expo` in `apps/mobile/package.json`).
- The developer API status screen (linked from Profile when the app runs from the dev server) is optional. To use it, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to `http://<PC LAN IP>:3000`, start the API separately with `pnpm dev:server`, then restart Expo. The rest of the app doesn't need the API.

### Dependency notes

- Add mobile dependencies with `pnpm --filter @fashion-saavy/mobile exec expo install <package>`, so their versions match the Expo SDK. Check with `expo install --check`.
- `pnpm-workspace.yaml` turns off automatic peer installation, because auto-installed peers resolved to versions newer than the Expo SDK supports. Declare any required peer explicitly.
- Two optional peers are intentionally left unmet: `react-dom` (used only by expo-router's web UI) and `react-native-reanimated` (used only by the Drawer navigator).

## Development workflow

1. Read the relevant sections of the docs before starting a change.
2. Work on a branch off `main`, with one focused concern per change.
3. Keep business rules on the server (`apps/server/src/modules/*`), keep mobile screens thin, and share only `packages/contracts` between the apps (see ARCHITECTURE.md §3).
4. Check changes on both Android and iOS.
5. Add or update tests alongside the change, and run them before opening a PR.
6. Update ARCHITECTURE.md or README.md in the same PR if the change affects them. Product or UX changes need explicit approval first.
