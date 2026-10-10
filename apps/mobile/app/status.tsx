import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchHealth } from '../src/api/health';
import { getApiBaseUrl } from '../src/platform/config';

type Check = { kind: 'checking' } | { kind: 'reachable' } | { kind: 'failed'; message: string };

// Developer diagnostic for the mobile → API connection; not a product screen.
export default function ApiStatusScreen() {
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
    <View style={styles.container}>
      {check.kind === 'checking' && <Text>Checking API…</Text>}
      {check.kind === 'reachable' && <Text>API reachable</Text>}
      {check.kind === 'failed' && <Text>API unreachable: {check.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
});
