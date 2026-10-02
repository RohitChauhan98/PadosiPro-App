import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';
import { CONTENT_MAX_WIDTH } from './ui';

type ToastVariant = 'success' | 'error';

const ToastContext = createContext<{
  show: (message: string, variant?: ToastVariant) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/** Brief top-of-screen confirmation, auto-dismisses after ~2.5 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, variant });
      opacity.stopAnimation();
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToast(null),
        );
      }, 2500);
    },
    [opacity],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          className="absolute top-0 right-0 left-0 items-center px-6"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Animated.View
            className="w-full flex-row items-center rounded-2xl bg-ink px-4 py-3.5"
            style={{
              maxWidth: CONTENT_MAX_WIDTH,
              opacity,
              shadowColor: colors.ink,
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Ionicons
              name={toast.variant === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={toast.variant === 'success' ? '#7ED3A5' : '#F2B8B5'}
            />
            <Text className="ml-2.5 flex-1 font-sans-medium text-sm text-ivory">
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
