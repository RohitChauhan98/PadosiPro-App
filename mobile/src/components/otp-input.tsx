import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useFieldFocusReporter } from '@/components/ui';
import { colors } from '@/theme';

const BOX_COUNT = 6;

export function OtpInput({
  value,
  onChange,
  error = false,
  autoFocus = true,
  disabled = false,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const reportFieldFocus = useFieldFocusReporter();
  const digits = value.padEnd(BOX_COUNT, ' ').slice(0, BOX_COUNT).split('');

  return (
    <Pressable
      accessibilityLabel="Verification code input"
      accessibilityState={{ disabled }}
      onPress={() => inputRef.current?.focus()}
      disabled={disabled}
      className="relative w-full max-w-[360px] self-center"
    >
      <View className={`flex-row gap-2 ${disabled ? 'opacity-60' : ''}`}>
        {digits.map((digit, index) => {
          const isActive = index === value.length;
          return (
            <View
              key={index}
              className={`h-14 flex-1 items-center justify-center rounded-2xl border bg-white ${
                error ? 'border-danger' : isActive ? 'border-pine-500' : 'border-sand'
              }`}
            >
              <Text className="font-sans-bold text-xl text-ink">{digit.trim()}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onFocus={() => {
          // The invisible input overlays the boxes, so its frame is theirs.
          reportFieldFocus(inputRef.current);
        }}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, BOX_COUNT))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        maxLength={BOX_COUNT}
        selectionColor={colors.pine}
        // Invisible but focusable layer over the boxes.
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          opacity: 0,
        }}
      />
    </Pressable>
  );
}
