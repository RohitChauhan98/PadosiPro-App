import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Sheet } from '@/components/sheet';
import { HomeSkeleton } from '@/components/skeleton';
import { Button, Card, EmptyState, ErrorState, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirmDialog } from '@/lib/confirm';
import { useMyTasks, useProfile } from '@/lib/queries';
import type { MyTask, Profile } from '@/lib/types';
import { colors } from '@/theme';

function AccountRow({
  icon,
  label,
  value,
  border = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <View className={`flex-row px-4 py-3 ${border ? 'border-b border-sand/70' : ''}`}>
      <Ionicons name={icon} size={18} color={colors.pine} style={{ marginTop: 2 }} />
      <View className="ml-3 flex-1">
        <Text className="font-sans-semibold text-[11px] uppercase tracking-wider text-ink-muted">
          {label}
        </Text>
        <Text className="mt-0.5 font-sans text-[15px] leading-[22px] text-ink">{value}</Text>
      </View>
    </View>
  );
}

function AccountSheet({
  visible,
  onClose,
  profile,
  email,
  initial,
  onEditProfile,
  onSignOut,
}: {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null | undefined;
  email: string;
  initial: string;
  onEditProfile: () => void;
  onSignOut: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="mt-2 flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-pine-800">
          <Text className="font-sans-bold text-lg text-ivory">{initial}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-display text-lg text-ink">{profile?.name ?? 'Your account'}</Text>
          <Text className="font-sans text-[13px] text-ink-soft">{email}</Text>
        </View>
      </View>

      {profile ? (
        <View className="mt-5 overflow-hidden rounded-2xl border border-sand bg-white">
          <AccountRow icon="call-outline" label="Mobile" value={profile.mobileNumber} />
          <AccountRow
            icon="location-outline"
            label="Address"
            value={profile.address}
            border={!!profile.businessName}
          />
          {profile.businessName ? (
            <AccountRow
              icon="briefcase-outline"
              label="Business"
              value={profile.businessName}
              border={false}
            />
          ) : null}
        </View>
      ) : null}

      <View className="mt-4 gap-2 pb-2">
        <Button title="Edit profile" variant="secondary" onPress={onEditProfile} />
        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          className="min-h-[52px] flex-row items-center justify-center rounded-2xl"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text className="ml-2 font-sans-semibold text-base text-danger">Sign out</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profileQuery = useProfile();
  const myTasksQuery = useMyTasks();
  const [accountOpen, setAccountOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = useMemo(() => {
    const name = profileQuery.data?.name.trim();
    if (name) return name.split(/\s+/)[0];
    return user?.email.split('@')[0] ?? 'there';
  }, [profileQuery.data, user]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, { category: string; tasks: MyTask[] }>();
    for (const task of myTasksQuery.data?.tasks ?? []) {
      const existing = groups.get(task.category.id);
      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(task.category.id, { category: task.category.name, tasks: [task] });
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [myTasksQuery.data]);

  const totalTasks = myTasksQuery.data?.tasks.length ?? 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([profileQuery.refetch(), myTasksQuery.refetch()]);
    setRefreshing(false);
  };

  const confirmSignOut = () => {
    void confirmDialog({
      title: 'Sign out?',
      message: 'You can sign back in anytime — your picks are saved.',
      confirmText: 'Sign out',
      destructive: true,
    }).then((confirmed) => {
      if (!confirmed) return;
      setAccountOpen(false);
      void signOut().then(() => router.replace('/(auth)/login'));
    });
  };

  const openProfile = () => {
    setAccountOpen(false);
    // Let the sheet finish dismissing before the push animates in.
    setTimeout(() => router.push('/(app)/profile'), 250);
  };

  const hasTasks = !myTasksQuery.isPending && !myTasksQuery.isError && groupedTasks.length > 0;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.pine}
        />
      }
      footer={
        hasTasks ? (
          <Button
            title="Edit my tasks"
            variant="secondary"
            onPress={() => router.push('/(app)/tasks')}
          />
        ) : undefined
      }
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <BrandLogo size={36} />
          <Text className="ml-2.5 font-display text-[22px] leading-7 text-ink">PadosiPro</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your account"
          onPress={() => setAccountOpen(true)}
          className="h-11 w-11 items-center justify-center rounded-full border border-sand bg-white"
        >
          <Text className="font-sans-bold text-base text-pine-700">
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>
      <Text className="mt-6 font-display text-[26px] leading-8 text-ink">
        Namaste, {firstName}.
      </Text>
      <Text className="mt-2 font-sans text-[15px] leading-[22px] text-ink-soft">
        Your Lifestyle Manager has these on the list — one message and they are handled.
      </Text>

      {hasTasks ? (
        <Text className="mt-3 font-sans-medium text-[13px] text-ink-muted">
          {totalTasks} service{totalTasks === 1 ? '' : 's'} across {groupedTasks.length}{' '}
          categor{groupedTasks.length === 1 ? 'y' : 'ies'}
        </Text>
      ) : null}

      <View className="mt-4">
        {myTasksQuery.isPending ? (
          <HomeSkeleton />
        ) : myTasksQuery.isError ? (
          <ErrorState
            title="Could not load your tasks"
            message={myTasksQuery.error.message}
            onRetry={() => void myTasksQuery.refetch()}
          />
        ) : groupedTasks.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="Nothing on your list yet"
            message="Pick the chores and errands you want handled — from deep cleaning and senior care to travel and events — and we take it from there."
            actionLabel="Pick your tasks"
            onAction={() => router.push('/(app)/tasks')}
          />
        ) : (
          groupedTasks.map((group) => (
            <View key={group.category} className="mb-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-sans-bold text-[13px] uppercase tracking-wider text-pine-700">
                  {group.category}
                </Text>
                <Text className="font-sans text-xs text-ink-muted">{group.tasks.length}</Text>
              </View>
              <Card className="p-0">
                {group.tasks.map((task, index) => (
                  <View
                    key={task.id}
                    className={`px-4 py-3.5 ${index > 0 ? 'border-t border-sand/70' : ''}`}
                  >
                    <Text className="font-sans-semibold text-[15px] text-ink">{task.name}</Text>
                    <Text className="mt-0.5 font-sans text-[13px] leading-[18px] text-ink-soft">
                      {task.description}
                    </Text>
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
      </View>

      <AccountSheet
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        profile={profileQuery.data}
        email={user?.email ?? ''}
        initial={firstName.charAt(0).toUpperCase()}
        onEditProfile={openProfile}
        onSignOut={confirmSignOut}
      />
    </Screen>
  );
}
