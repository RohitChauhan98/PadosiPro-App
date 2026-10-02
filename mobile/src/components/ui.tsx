import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
  type RefreshControlProps,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { colors } from '@/theme';

// Forms and lists sit in a centred column on tablets and Expo web.
export const CONTENT_MAX_WIDTH = 480;

type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

// Focused inputs register themselves so Screen can scroll them above the keyboard.
// Default is a no-op outside a scrollable Screen.
const FieldFocusContext = createContext<(node: Measurable | null) => void>(() => {});

export function useFieldFocusReporter() {
  return useContext(FieldFocusContext);
}

export function Screen({
  children,
  scroll = true,
  footer,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const frameRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const focusedNodeRef = useRef<Measurable | null>(null);
  // Top of the keyboard in screen coordinates. Infinity while it is closed.
  const keyboardTopRef = useRef(Number.POSITIVE_INFINITY);
  // How much of the scroll area the keyboard is covering. Applied as
  // marginBottom so the list becomes shorter than its content and can scroll.
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [revealTick, setRevealTick] = useState(0);

  const revealFocusedField = useCallback(() => {
    const node = focusedNodeRef.current;
    const frame = frameRef.current;
    const scrollView = scrollRef.current;
    if (!node || !frame || !scrollView) return;
    node.measureInWindow((_x, fieldY, _w, fieldHeight) => {
      frame.measureInWindow((_fx, frameY, _fw, frameHeight) => {
        // Clearance above the keyboard. Android reports the keyboard top a
        // bit below the keys and the suggestion bar, so the gap has to be
        // larger than the field itself or the last input stays clipped.
        const visibleBottom = Math.min(frameY + frameHeight, keyboardTopRef.current) - 140;
        const overlap = fieldY + fieldHeight - visibleBottom;
        if (overlap > 1) {
          scrollView.scrollTo({
            y: scrollOffsetRef.current + overlap,
            animated: true,
          });
        }
      });
    });
  }, []);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      const { screenY, height } = event.endCoordinates;
      if (height <= 0 || screenY <= 0) return;
      keyboardTopRef.current = screenY;
      frameRef.current?.measureInWindow((_x, y, _w, frameHeight) => {
        const covered = y + frameHeight - keyboardTopRef.current;
        // Leave at least 80px of the list visible if the keyboard is very tall.
        const overlap = Math.max(0, Math.min(Math.round(covered), Math.round(frameHeight - 80)));
        setKeyboardInset(overlap);
        setRevealTick((tick) => tick + 1);
      });
    };
    const onHide = () => {
      keyboardTopRef.current = Number.POSITIVE_INFINITY;
      setKeyboardInset(0);
    };
    // Did-show, not will-show: measure after the keyboard animation so the
    // coordinates match what is actually on screen.
    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // After the inset margin commits. Two frames so the native layout has
    // the shorter list before we measure, otherwise scrollTo is clamped.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => revealFocusedField());
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [revealTick, keyboardInset, revealFocusedField]);

  const reportFieldFocus = useCallback((node: Measurable | null) => {
    focusedNodeRef.current = node;
    setRevealTick((tick) => tick + 1);
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-ivory"
      behavior="padding"
      // iOS shrinks this view with the keyboard. Android does not: edge-to-edge
      // draws the keyboard on top, and a second padding here would fight the
      // margin applied to the list below.
      enabled={Platform.OS === 'ios'}
    >
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <View
          className="flex-1"
          style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
        >
          <FieldFocusContext.Provider value={reportFieldFocus}>
            {scroll ? (
              <View
                ref={frameRef}
                className="flex-1"
                // Android (edge-to-edge) draws the keyboard over the window, so
                // the list never gets shorter on its own and scrollTo is a no-op.
                // Pull the list up by the covered amount, then scroll the field.
                // onLayout runs after that margin is applied — scrolling earlier
                // gets clamped and the last field stays under the keyboard.
                onLayout={() => {
                  if (keyboardTopRef.current !== Number.POSITIVE_INFINITY) {
                    revealFocusedField();
                  }
                }}
                style={Platform.OS === 'android' ? { marginBottom: keyboardInset } : undefined}
              >
                <ScrollView
                  ref={scrollRef}
                  className="flex-1"
                  keyboardShouldPersistTaps="handled"
                  refreshControl={refreshControl}
                  onScroll={(event) => {
                    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 24,
                    paddingTop: 16,
                    // Extra room while the keyboard is open so the last field
                    // (confirm password) can scroll clear instead of stopping short.
                    paddingBottom: 24 + (keyboardInset > 0 ? 140 : 0),
                  }}
                >
                  {children}
                </ScrollView>
              </View>
            ) : (
              <View className="flex-1 px-6 pt-4">{children}</View>
            )}
          </FieldFocusContext.Provider>
          {footer ? (
            <View
              className="border-t border-sand bg-ivory px-6 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text className="font-display text-[28px] leading-[34px] text-ink">{children}</Text>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-2 font-sans text-[15px] leading-[22px] text-ink-soft">{children}</Text>
  );
}

export function BrandMark() {
  return (
    <View className="mb-8 flex-row items-center justify-center">
      <BrandLogo size={52} />
      <Text className="ml-3 font-display text-[26px] leading-8 text-ink">PadosiPro</Text>
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;

  const containerClass = {
    primary: `bg-pine-700 ${pressed && !isDisabled ? 'bg-pine-800' : ''}`,
    secondary: `bg-saffron-soft border border-saffron ${pressed && !isDisabled ? 'opacity-80' : ''}`,
    ghost: `bg-transparent ${pressed && !isDisabled ? 'bg-sand/50' : ''}`,
    danger: `bg-danger ${pressed && !isDisabled ? 'opacity-85' : ''}`,
  }[variant];

  const textClass = {
    primary: 'text-ivory',
    secondary: 'text-saffron-dark',
    ghost: 'text-pine-700',
    danger: 'text-white',
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={`min-h-[52px] flex-row items-center justify-center rounded-2xl px-5 ${containerClass} ${
        isDisabled ? 'opacity-50' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.ivory : colors.pine} />
      ) : (
        <Text className={`font-sans-semibold text-base ${textClass}`}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  containerClassName,
  secureTextEntry,
  onFocus,
  onBlur,
  ...inputProps
}: {
  label: string;
  error?: string | null;
  hint?: string;
  containerClassName?: string;
} & TextInputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const inputRef = useRef<TextInput>(null);
  const containerRef = useRef<View>(null);
  const reportFieldFocus = useContext(FieldFocusContext);

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setFocused(true);
    // Measure the label + input together so the label is not left under the keyboard.
    reportFieldFocus(containerRef.current ?? inputRef.current);
    onFocus?.(event);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View ref={containerRef} className={`mb-4 ${containerClassName ?? ''}`}>
      <Text className="mb-1.5 font-sans-semibold text-sm text-ink">{label}</Text>
      <View className="relative justify-center">
        <TextInput
          ref={inputRef}
          placeholderTextColor={colors.inkMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...inputProps}
          secureTextEntry={hidden}
          className={`rounded-2xl border bg-white px-4 py-3.5 font-sans text-base text-ink ${
            error ? 'border-danger' : focused ? 'border-pine-500' : 'border-sand'
          } ${inputProps.multiline ? 'min-h-[96px]' : ''} ${secureTextEntry ? 'pr-12' : ''}`}
          style={inputProps.multiline ? { textAlignVertical: 'top' } : undefined}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((value) => !value)}
            hitSlop={8}
            className="absolute right-2 top-0 bottom-0 h-full w-10 items-center justify-center"
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.inkSoft}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1.5 font-sans-medium text-[13px] text-danger">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 font-sans text-[13px] text-ink-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

export function Notice({
  variant,
  children,
}: {
  variant: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const styles = {
    error: 'border-danger/30 bg-danger/10',
    success: 'border-success/30 bg-success/10',
    info: 'border-saffron/40 bg-saffron-soft',
  }[variant];
  const textStyles = {
    error: 'text-danger',
    success: 'text-success',
    info: 'text-ink-soft',
  }[variant];
  const icons = {
    error: 'alert-circle',
    success: 'checkmark-circle',
    info: 'information-circle',
  } as const;
  const iconColor = {
    error: colors.danger,
    success: colors.success,
    info: colors.saffronDark,
  }[variant];
  return (
    <View className={`mb-4 flex-row items-start rounded-2xl border px-4 py-3 ${styles}`}>
      <Ionicons
        name={icons[variant]}
        size={18}
        color={iconColor}
        style={{ marginTop: 1, marginRight: 8 }}
      />
      <Text className={`flex-1 font-sans text-sm leading-5 ${textStyles}`}>{children}</Text>
    </View>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-sand bg-white p-4 ${className ?? ''}`}>
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'pine' }: { label: string; tone?: 'pine' | 'saffron' }) {
  const classes =
    tone === 'pine' ? 'bg-pine-50 border-pine-200' : 'bg-saffron-soft border-saffron/40';
  const textClasses = tone === 'pine' ? 'text-pine-700' : 'text-saffron-dark';
  return (
    <View className={`self-start rounded-full border px-2.5 py-1 ${classes}`}>
      <Text className={`font-sans-semibold text-[11px] ${textClasses}`}>{label}</Text>
    </View>
  );
}

export function LoadingState({ label = 'One moment…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator size="large" color={colors.pine} />
      <Text className="mt-4 font-sans text-sm text-ink-muted">{label}</Text>
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-4 py-16">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-danger/10">
        <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
      </View>
      <Text className="text-center font-display text-lg text-ink">{title}</Text>
      {message ? (
        <Text className="mt-2 text-center font-sans text-sm leading-5 text-ink-soft">
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <View className="mt-5 self-stretch">
          <Button title="Try again" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon = 'list-outline',
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="flex-1 items-center justify-center px-4 py-16">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-saffron-soft">
        <Ionicons name={icon} size={24} color={colors.saffronDark} />
      </View>
      <Text className="text-center font-display text-lg text-ink">{title}</Text>
      <Text className="mt-2 text-center font-sans text-sm leading-5 text-ink-soft">{message}</Text>
      {actionLabel && onAction ? (
        <View className="mt-5 self-stretch">
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
