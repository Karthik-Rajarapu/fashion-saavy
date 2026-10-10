import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { fetchHealth } from '../../src/api/health';
import { getApiBaseUrl } from '../../src/platform/config';
import { AppText } from '../../src/ui/AppText';
import { Screen } from '../../src/ui/Screen';

type Check = { kind: 'checking' } | { kind: 'reachable' } | { kind: 'failed'; message: string };

// Developer diagnostic for the mobile → API connection. Linked from Profile in development builds only.
export default function ApiStatusRoute() {
  // Hidden from navigation in production, but the route would still open from a deep link, so guard it here.
  if (!__DEV__) return <Redirect href="/" />;
  return <ApiStatusScreen />;
}

function ApiStatusScreen() {
  const [check, setCheck] = useState<Check>({ kind: 'checking' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetchHealth(getApiBaseUrl());
        if (active) setCheck({ kind: 'reachable' });
      } catch (error) {
        if (active) setCheck({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen topInset={false}>
      {check.kind === 'checking' && <AppText>Checking API…</AppText>}
      {check.kind === 'reachable' && <AppText variant="heading">API reachable</AppText>}
      {check.kind === 'failed' && <AppText>API unreachable: {check.message}</AppText>}
    </Screen>
  );
}
