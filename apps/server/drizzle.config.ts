import { defineConfig } from 'drizzle-kit';

// Migrations are generated from the module schemas and committed; they are applied on server start.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/infrastructure/schema.ts',
  out: './drizzle',
});
