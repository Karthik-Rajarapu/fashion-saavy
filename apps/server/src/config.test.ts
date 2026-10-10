import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('refuses development identity in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', DEV_AUTH: 'true' })).toThrow(/DEV_AUTH/);
  });

  it('refuses to start in production while only development storage exists', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/not implemented/);
  });

  it('keeps development identity off unless explicitly enabled', () => {
    const secret = 'x'.repeat(32);
    expect(loadConfig({ STORAGE_SIGNING_SECRET: secret }).devAuth).toBe(false);
    expect(loadConfig({ DEV_AUTH: 'true', STORAGE_SIGNING_SECRET: secret }).devAuth).toBe(true);
    expect(() => loadConfig({ DEV_AUTH: 'yes' })).toThrow();
  });

  it('rejects a short signing secret', () => {
    expect(() => loadConfig({ STORAGE_SIGNING_SECRET: 'short' })).toThrow();
  });
});
