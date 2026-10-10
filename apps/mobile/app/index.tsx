import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// Foundation-stage entry screen. Replaced when the first product flow (onboarding) is built.
export default function FoundationScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Fashion Saavy
      </Text>
      <Text>Foundation build. No product features yet.</Text>
      <Link href="/status" style={styles.link}>
        Check API connection
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
  link: { paddingVertical: 12, textDecorationLine: 'underline' },
});
