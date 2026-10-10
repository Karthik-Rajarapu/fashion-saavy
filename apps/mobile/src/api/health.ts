import { HealthResponseSchema, type HealthResponse } from '@fashion-saavy/contracts';

export async function fetchHealth(baseUrl: string): Promise<HealthResponse> {
  const res = await fetch(`${baseUrl}/v1/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP ${res.status}`);
  }
  return HealthResponseSchema.parse(await res.json());
}
