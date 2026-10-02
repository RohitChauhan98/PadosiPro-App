import { Text, View } from 'react-native';

/** Segmented progress bar for the two-step first-login flow. */
export function StepIndicator({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label?: string;
}) {
  return (
    <View className="mb-6">
      <View className="flex-row gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            className={`h-1 flex-1 rounded-full ${index < step ? 'bg-pine-600' : 'bg-sand'}`}
          />
        ))}
      </View>
      <Text className="mt-2 font-sans-semibold text-xs uppercase tracking-widest text-pine-600">
        {label ?? `Step ${step} of ${total}`}
      </Text>
    </View>
  );
}
