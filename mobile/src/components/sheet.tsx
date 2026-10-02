import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTENT_MAX_WIDTH } from './ui';

/**
 * Bottom sheet: grabber, scrollable body, safe-area aware, backdrop tap to
 * dismiss (unless `dismissable` is false, e.g. while a save is in flight).
 */
export function Sheet({
  visible,
  onClose,
  children,
  dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          accessibilityLabel="Dismiss"
          onPress={dismissable ? onClose : undefined}
          className="absolute top-0 bottom-0 left-0 right-0"
        />
        <View
          className="max-h-[85%] w-full self-center rounded-t-3xl bg-ivory px-6 pt-3"
          style={{
            maxWidth: CONTENT_MAX_WIDTH,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
        >
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-sand-dark" />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
