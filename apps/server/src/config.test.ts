import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const authSecret = 'a'.repeat(32);
const signingSecret = 's'.repeat(32);

describe('loadConfig', () => {
  it('refuses production: no real email provider, database or object storage exists yet', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', BETTER_AUTH_SECRET: authSecret, STORAGE_SIGNING_SECRET: signingSecret }),
    ).toThrow(/Production is not supported yet/);
  });

  it('refuses production with the development email outbox, even when asked explicitly', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', EMAIL_DELIVERY: 'dev-outbox', BETTER_AUTH_SECRET: authSecret }),
    ).toThrow(/no real email provider/);
  });

  it('rejects the removed DEV_AUTH identity in every environment', () => {
    for (const NODE_ENV of ['development', 'test', 'production'] as const) {
      expect(() => loadConfig({ NODE_ENV, DEV_AUTH: 'true', BETTER_AUTH_SECRET: authSecret })).toThrow(/DEV_AUTH/);
      expect(() => loadConfig({ NODE_ENV, DEV_AUTH: 'false', BETTER_AUTH_SECRET: authSecret })).toThrow(/DEV_AUTH/);
    }
  });

  it('requires a stable auth secret of at least 32 characters', () => {
    expect(() => loadConfig({ STORAGE_SIGNING_SECRET: signingSecret })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => loadConfig({ BETTER_AUTH_SECRET: 'short' })).toThrow();
  });

  it('only knows the development outbox as an email delivery path', () => {
    expect(loadConfig({ BETTER_AUTH_SECRET: authSecret, STORAGE_SIGNING_SECRET: signingSecret }).emailDelivery).toBe('dev-outbox');
    expect(() => loadConfig({ BETTER_AUTH_SECRET: authSecret, EMAIL_DELIVERY: 'smtp' })).toThrow();
  });

  it('rejects a short signing secret', () => {
    expect(() => loadConfig({ BETTER_AUTH_SECRET: authSecret, STORAGE_SIGNING_SECRET: 'short' })).toThrow();
  });
});
