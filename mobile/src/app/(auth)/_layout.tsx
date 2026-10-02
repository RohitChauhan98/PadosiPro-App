import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { status, user } = useAuth();

  // Already signed in — no reason to see auth screens again.
  if (status === 'signedIn') {
    return (
      <Redirect
        href={
          user.profileComplete
            ? '/(app)/home'
            : { pathname: '/(app)/profile', params: { first: '1' } }
        }
      />
    );
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
