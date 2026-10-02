import { useMutation } from '@tanstack/react-query';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { OtpInput } from '@/components/otp-input';
import { BrandMark, Button, Notice, Screen, Subtitle, Title } from '@/components/ui';
import { ApiError, loginVerify, resendOtp, verifyOtp } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { LoginVerifyResponse } from '@/lib/types';

const RESEND_SECONDS = 30;

interface Feedback {
  variant: 'error' | 'success' | 'info';
  text: string;
}

function lockoutHours(retryAfterSeconds?: number): number {
  return Math.max(1, Math.ceil((retryAfterSeconds ?? 24 * 3600) / 3600));
}

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ email?: string; from?: string; mode?: string; pendingToken?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const fromLogin = params.from === 'login';
  const isLogin = params.mode === 'login';
  const pendingToken = typeof params.pendingToken === 'string' ? params.pendingToken : '';

  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [codeError, setCodeError] = useState(false);
  // Hours remaining once the account is locked; null = not locked.
  const [lockedHours, setLockedHours] = useState<number | null>(null);

  // Resend countdown ticker.
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const applyLock = (error: ApiError) => {
    const hours = lockoutHours(error.retryAfterSeconds);
    setLockedHours(hours);
    setFeedback({
      variant: 'error',
      text: `Too many failed attempts — this account is locked for 24 hours. Try again in about ${hours} hour${hours === 1 ? '' : 's'}.`,
    });
  };

  const resendMutation = useMutation({
    mutationFn: () => resendOtp({ email, pendingToken: isLogin ? pendingToken : undefined }),
    onSuccess: (data) => {
      setCountdown(data.cooldownSeconds ?? RESEND_SECONDS);
      setFeedback({ variant: 'success', text: 'A fresh code is on its way to your inbox.' });
      setCode('');
      setCodeError(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'RESEND_COOLDOWN') {
        setCountdown(error.retryAfterSeconds ?? RESEND_SECONDS);
        return;
      }
      if (error instanceof ApiError && error.code === 'OTP_LOCKED') {
        applyLock(error);
        return;
      }
      setFeedback({
        variant: 'error',
        text: error instanceof ApiError ? error.message : 'Could not resend the code. Try again.',
      });
    },
  });

  // Arriving here from the login screen as an UNVERIFIED user (signup flow) means the
  // original code may be long gone — send a fresh one automatically. Login mode does
  // not auto-resend: the login endpoint already emailed a code.
  const autoResentRef = useRef(false);
  useEffect(() => {
    if (fromLogin && !isLogin && email && !autoResentRef.current) {
      autoResentRef.current = true;
      resendMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLogin, isLogin, email]);

  const verifyMutation = useMutation({
    mutationFn: (nextCode: string): Promise<LoginVerifyResponse | { message: string }> =>
      isLogin ? loginVerify({ pendingToken, code: nextCode }) : verifyOtp({ email, code: nextCode }),
    onSuccess: async (data) => {
      setFeedback(null);
      setCodeError(false);
      if (isLogin && 'token' in data) {
        await signIn(data.token, data.user);
        router.replace(
          data.user.profileComplete
            ? '/(app)/home'
            : { pathname: '/(app)/profile', params: { first: '1' } },
        );
        return;
      }
      router.replace({
        pathname: '/(auth)/login',
        params: { email, notice: 'verified' },
      });
    },
    onError: (error) => {
      setCode('');
      setCodeError(true);
      if (error instanceof ApiError) {
        if (error.code === 'OTP_LOCKED') {
          applyLock(error);
          return;
        }
        if (error.code === 'INVALID_OTP') {
          const remaining = error.attemptsRemaining;
          setFeedback({
            variant: 'error',
            text:
              typeof remaining === 'number'
                ? `That code is not right. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                : 'That code is not right. Please try again.',
          });
          return;
        }
        if (error.code === 'OTP_EXPIRED') {
          setFeedback({
            variant: 'error',
            text: 'This code has expired. Request a new one below.',
          });
          return;
        }
        if (error.code === 'UNAUTHORIZED') {
          setFeedback({
            variant: 'error',
            text: 'Your sign-in session expired. Please go back and sign in again.',
          });
          return;
        }
        setFeedback({ variant: 'error', text: error.message });
        return;
      }
      setFeedback({ variant: 'error', text: 'Something went wrong. Please try again.' });
    },
  });

  const onChangeCode = (next: string) => {
    setCode(next);
    setCodeError(false);
    if (next.length === 6 && !verifyMutation.isPending && lockedHours === null) {
      verifyMutation.mutate(next);
    }
  };

  if (!email || (isLogin && !pendingToken)) {
    return (
      <Screen>
        <BrandMark />
        <Title>{isLogin ? 'Session expired' : 'Missing email'}</Title>
        <Subtitle>
          {isLogin
            ? 'Your sign-in session is missing or has expired. Please sign in again.'
            : 'We need your email address to verify your account.'}
        </Subtitle>
        <View className="mt-8">
          <Link href="/(auth)/login" asChild>
            <Button title="Back to sign in" onPress={() => {}} />
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandMark />
      <Title>Check your inbox.</Title>
      <Subtitle>
        We sent a 6-digit code to <Text className="font-sans-semibold text-ink">{email}</Text>
        {isLogin ? ' to finish signing in' : ''}. It is valid for 10 minutes.
      </Subtitle>

      <View className="mt-8">
        {feedback ? <Notice variant={feedback.variant}>{feedback.text}</Notice> : null}

        <OtpInput
          value={code}
          onChange={onChangeCode}
          error={codeError}
          disabled={verifyMutation.isPending || lockedHours !== null}
        />

        {verifyMutation.isPending ? (
          <Text className="mt-4 text-center font-sans-medium text-sm text-pine-600">
            Verifying…
          </Text>
        ) : null}

        <View className="mt-8 items-center">
          <Text className="font-sans text-sm text-ink-soft">Did not get the code?</Text>
          <View className="mt-2 self-stretch">
            <Button
              title={countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              variant="secondary"
              disabled={countdown > 0 || lockedHours !== null}
              loading={resendMutation.isPending}
              onPress={() => {
                setFeedback(null);
                resendMutation.mutate();
              }}
            />
          </View>
        </View>

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="font-sans text-sm text-ink-soft">
            {isLogin ? 'Not you? ' : 'Wrong email? '}
          </Text>
          <Link
            href={isLogin ? '/(auth)/login' : '/(auth)/register'}
            className="font-sans-semibold text-sm text-pine-700"
          >
            {isLogin ? 'Back to sign in' : 'Start over'}
          </Link>
        </View>
      </View>
    </Screen>
  );
}
