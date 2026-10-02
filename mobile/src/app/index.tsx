import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';

// Boot route: the native splash screen stays up while the stored session loads.
export default function Index() {
  const { status, user } = useAuth();

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;
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
