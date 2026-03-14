export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  timestamp: string;
  checks: Record<string, boolean>;
}

export async function getHealthStatus(serviceName: string): Promise<HealthStatus> {
  // TODO: add real DB and Redis connectivity checks
  return {
    status: 'ok',
    service: serviceName,
    timestamp: new Date().toISOString(),
    checks: {
      server: true,
    },
  };
}
