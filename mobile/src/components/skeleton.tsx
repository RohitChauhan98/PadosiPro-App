import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

/** Pulsing placeholder block. Compose to mirror the layout being loaded. */
export function Skeleton({ className }: { className?: string }) {
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View className={`rounded-xl bg-sand ${className ?? ''}`} style={{ opacity }} />;
}

/** Placeholder for the home screen's grouped task list. */
export function HomeSkeleton() {
  return (
    <View className="mt-6">
      {[0, 1].map((group) => (
        <View key={group} className="mb-6">
          <Skeleton className="mb-3 h-3 w-28" />
          <View className="overflow-hidden rounded-2xl border border-sand bg-white p-4">
            {[0, 1, 2].map((row) => (
              <View key={row} className={row > 0 ? 'mt-4' : ''}>
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="mt-2 h-3 w-11/12" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Placeholder for the task catalogue picker. */
export function TaskListSkeleton() {
  return (
    <View className="mt-4 flex-1">
      <Skeleton className="h-9 w-44 rounded-full" />
      {[0, 1].map((group) => (
        <View key={group} className="mt-6">
          <Skeleton className="mb-3 h-3 w-32" />
          <View className="overflow-hidden rounded-2xl border border-sand bg-white p-4">
            {[0, 1, 2].map((row) => (
              <View key={row} className={`flex-row items-start ${row > 0 ? 'mt-4' : ''}`}>
                <Skeleton className="mr-3 h-6 w-6 rounded-full" />
                <View className="flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-2 h-3 w-11/12" />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Placeholder for the profile form in edit mode. */
export function ProfileFormSkeleton() {
  return (
    <View className="mt-2">
      {[0, 1, 2, 3].map((field) => (
        <View key={field} className="mb-5">
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className={`w-full rounded-2xl ${field === 2 ? 'h-24' : 'h-[52px]'}`} />
        </View>
      ))}
    </View>
  );
}
