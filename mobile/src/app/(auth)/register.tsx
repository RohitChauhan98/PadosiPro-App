import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError, register } from '@/lib/api';
import { validateConfirm, validateEmail, validatePassword } from '@/lib/validation';
import { BrandMark, Button, Notice, Screen, Subtitle, TextField, Title } from '@/components/ui';

interface FieldErrors {
  email?: string | null;
  password?: string | null;
  confirm?: string | null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (_data, variables) => {
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: variables.email.trim().toLowerCase(), from: 'register' },
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_TAKEN') {
          setErrors((prev) => ({
            ...prev,
            email: 'This email is already registered — sign in instead.',
          }));
          return;
        }
        if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
          const next: FieldErrors = {};
          for (const detail of error.details) {
            if (detail.field === 'email') next.email = detail.message;
            if (detail.field === 'password') next.password = detail.message;
          }
          setErrors((prev) => ({ ...prev, ...next }));
          setFormError(error.message);
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError('Something went wrong. Please try again.');
    },
  });

  const submit = () => {
    const next: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirm(password, confirm),
    };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password || next.confirm) return;
    registerMutation.mutate({ email: email.trim().toLowerCase(), password });
  };

  return (
    <Screen
      footer={
        <View className="flex-row items-center justify-center py-1">
          <Text className="font-sans text-sm text-ink-soft">Already have an account? </Text>
          <Link href="/(auth)/login" className="font-sans-semibold text-sm text-pine-700">
            Sign in
          </Link>
        </View>
      }
    >
      <BrandMark />
      <Title>Stop managing your home. Start living in it.</Title>
      <Subtitle>Create your account — your Lifestyle Manager takes it from here.</Subtitle>

      <View className="mt-8">
        {formError ? <Notice variant="error">{formError}</Notice> : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors((prev) => ({ ...prev, email: null }));
          }}
          onBlur={() => setErrors((prev) => ({ ...prev, email: email ? validateEmail(email) : null }))}
          error={errors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrors((prev) => ({ ...prev, password: null }));
          }}
          onBlur={() =>
            setErrors((prev) => ({ ...prev, password: password ? validatePassword(password) : null }))
          }
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          placeholder="Create a password"
          secureTextEntry
          autoComplete="new-password"
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={(text) => {
            setConfirm(text);
            setErrors((prev) => ({ ...prev, confirm: null }));
          }}
          onBlur={() =>
            setErrors((prev) => ({ ...prev, confirm: confirm ? validateConfirm(password, confirm) : null }))
          }
          error={errors.confirm}
          placeholder="Re-enter your password"
          secureTextEntry
          autoComplete="new-password"
        />

        <View className="mt-2">
          <Button
            title="Create account"
            onPress={submit}
            loading={registerMutation.isPending}
          />
        </View>
      </View>
    </Screen>
  );
}
