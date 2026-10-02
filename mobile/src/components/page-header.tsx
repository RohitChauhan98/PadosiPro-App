import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme';

/**
 * In-screen navigation bar + page title (stack headers are hidden app-wide).
 * Back button sits above the title, iOS large-title style.
 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <View className="mb-8">
      {onBack || right ? (
        <View className="mb-4 flex-row items-center justify-between">
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={onBack}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full border border-sand bg-white"
            >
              <Ionicons name="chevron-back" size={22} color={colors.pineDark} />
            </Pressable>
          ) : (
            <View className="h-11 w-11" />
          )}
          {right ?? <View className="h-11 w-11" />}
        </View>
      ) : null}
      <Text className="font-display text-[28px] leading-[34px] text-ink">{title}</Text>
      {subtitle ? (
        <Text className="mt-2 font-sans text-[15px] leading-[22px] text-ink-soft">{subtitle}</Text>
      ) : null}
    </View>
  );
}
