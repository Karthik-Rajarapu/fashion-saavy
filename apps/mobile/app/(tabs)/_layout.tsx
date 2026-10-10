import { Tabs } from 'expo-router/tabs';
import { TabBar } from '../../src/ui/TabBar';

// The four primary destinations (docs/UX.md). Try-On is never a tab; it opens from an outfit.
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
      <Tabs.Screen name="stylist" options={{ title: 'Stylist' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
