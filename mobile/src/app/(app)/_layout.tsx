import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function AppLayout() {
  const { status, user } = useAuth();
  const segments = useSegments();

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;

  // First-login profile is mandatory: until it is saved, every protected
  // route funnels into the profile screen.
  const onProfileScreen = segments[segments.length - 1] === 'profile';
  if (!user.profileComplete && !onProfileScreen) {
    return <Redirect href={{ pathname: '/(app)/profile', params: { first: '1' } }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ivory },
      }}
    />
  );
}
