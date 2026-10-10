import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The embedded Postgres (PGlite) takes several seconds to start, especially with test files in parallel.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
