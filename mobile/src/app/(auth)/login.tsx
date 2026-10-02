import { useMutation } from '@tanstack/react-query';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError, login } from '@/lib/api';
import { validateEmail } from '@/lib/validation';
import { BrandMark, Button, Notice, Screen, Subtitle, TextField, Title } from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; notice?: string }>();

  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    params.notice === 'verified' ? 'Email verified — you can sign in now.' : null,
  );

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data, variables) => {
      const normalizedEmail = variables.email.trim().toLowerCase();
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: normalizedEmail, mode: 'login', pendingToken: data.pendingToken },
      });
    },
    onError: (error, variables) => {
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          router.push({
            pathname: '/(auth)/verify-email',
            params: { email: variables.email.trim().toLowerCase(), from: 'login' },
          });
          return;
        }
        if (error.code === 'OTP_LOCKED') {
          const hours = Math.max(1, Math.ceil((error.retryAfterSeconds ?? 24 * 3600) / 3600));
          setFormError(
            `Too many failed attempts — this account is locked for 24 hours. Try again in about ${hours} hour${hours === 1 ? '' : 's'}.`,
          );
          return;
        }
        if (error.code === 'INVALID_CREDENTIALS') {
          setPasswordError('That email and password combination is not right. Please try again.');
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError('Something went wrong. Please try again.');
    },
  });

  const submit = () => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = password ? null : 'Enter your password to sign in.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    setNotice(null);
    if (nextEmailError || nextPasswordError) return;
    loginMutation.mutate({ email: email.trim().toLowerCase(), password });
  };

  return (
    <Screen
      footer={
        <View className="flex-row items-center justify-center py-1">
          <Text className="font-sans text-sm text-ink-soft">New to PadosiPro? </Text>
          <Link href="/(auth)/register" className="font-sans-semibold text-sm text-pine-700">
            Create an account
          </Link>
        </View>
      }
    >
      <BrandMark />
      <Title>Welcome back.</Title>
      <Subtitle>Sign in — your Lifestyle Manager is already on it.</Subtitle>

      <View className="mt-8">
        {notice ? <Notice variant="success">{notice}</Notice> : null}
        {formError ? <Notice variant="error">{formError}</Notice> : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError(null);
          }}
          onBlur={() => setEmailError(email ? validateEmail(email) : null)}
          error={emailError}
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
            setPasswordError(null);
          }}
          error={passwordError}
          placeholder="Your password"
          secureTextEntry
          autoComplete="current-password"
        />

        <View className="mt-2">
          <Button title="Sign in" onPress={submit} loading={loginMutation.isPending} />
        </View>
      </View>
    </Screen>
  );
}
