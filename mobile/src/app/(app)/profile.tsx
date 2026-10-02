import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { PageHeader } from '@/components/page-header';
import { ProfileFormSkeleton } from '@/components/skeleton';
import { StepIndicator } from '@/components/step-indicator';
import { useToast } from '@/components/toast';
import {
  Button,
  ErrorState,
  Notice,
  Screen,
  Subtitle,
  TextField,
  Title,
} from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmDialog } from '@/lib/confirm';
import { useProfile, useSaveProfile } from '@/lib/queries';
import type { Profile } from '@/lib/types';
import {
  normalizeIndianMobile,
  validateAddress,
  validateBusinessName,
  validateMobile,
  validateName,
} from '@/lib/validation';

interface FieldErrors {
  name?: string | null;
  mobile?: string | null;
  address?: string | null;
  businessName?: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ first?: string }>();
  const { user } = useAuth();
  // Login and boot redirects land here without ?first=1. An incomplete
  // profile is still the first-login flow — going back has no screen behind it.
  const isFirstLogin = params.first === '1' || user?.profileComplete === false;
  const profileQuery = useProfile();

  // Edit mode: wait for the saved profile before showing the form.
  if (!isFirstLogin && profileQuery.isPending) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Your profile" onBack={() => router.back()} />
        <ProfileFormSkeleton />
      </Screen>
    );
  }

  if (!isFirstLogin && profileQuery.isError) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Your profile" onBack={() => router.back()} />
        <ErrorState
          title="Could not load your profile"
          message={profileQuery.error.message}
          onRetry={() => void profileQuery.refetch()}
        />
      </Screen>
    );
  }

  return <ProfileForm isFirstLogin={isFirstLogin} initial={profileQuery.data ?? null} />;
}

function ProfileForm({
  isFirstLogin,
  initial,
}: {
  isFirstLogin: boolean;
  initial: Profile | null;
}) {
  const router = useRouter();
  const { user, markProfileComplete } = useAuth();
  const toast = useToast();
  // Set when a first-login save succeeds; the effect below navigates once the
  // auth context has actually flipped profileComplete — otherwise the (app)
  // route guard can evaluate with the stale user and bounce us back here.
  const savedRef = useRef(false);

  const [name, setName] = useState(initial?.name ?? '');
  const [mobile, setMobile] = useState(initial?.mobileNumber ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [businessName, setBusinessName] = useState(initial?.businessName ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isDirty =
    name !== (initial?.name ?? '') ||
    mobile !== (initial?.mobileNumber ?? '') ||
    address !== (initial?.address ?? '') ||
    businessName !== (initial?.businessName ?? '');

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/home');
    }
  };

  const handleBack = () => {
    if (!isDirty || saveMutation.isPending) {
      goBack();
      return;
    }
    void confirmDialog({
      title: 'Discard changes?',
      message: 'Your edits have not been saved yet.',
      confirmText: 'Discard',
      cancelText: 'Keep editing',
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) goBack();
    });
  };

  // Navigate to step 2 only after profileComplete has propagated through the
  // auth context, so the (app) guard never sees a stale incomplete user.
  useEffect(() => {
    if (savedRef.current && user?.profileComplete) {
      savedRef.current = false;
      // Push (not replace) so step 2 can go back and revise home details.
      router.push({ pathname: '/(app)/tasks', params: { first: '1' } });
    }
  }, [user?.profileComplete, router]);

  const saveMutation = useSaveProfile({
    onSuccess: () => {
      if (isFirstLogin) {
        if (user?.profileComplete) {
          // Revising details mid-onboarding via "Edit home details": the
          // context already shows a complete profile, so it never changes
          // again and the effect below would not re-fire. Push directly.
          router.push({ pathname: '/(app)/tasks', params: { first: '1' } });
        } else {
          savedRef.current = true;
          markProfileComplete();
        }
      } else {
        toast.show('Profile saved');
        goBack();
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
          const next: FieldErrors = {};
          for (const detail of error.details) {
            if (detail.field === 'name') next.name = detail.message;
            if (detail.field === 'mobileNumber') next.mobile = detail.message;
            if (detail.field === 'address') next.address = detail.message;
            if (detail.field === 'businessName') next.businessName = detail.message;
          }
          setErrors((prev) => ({ ...prev, ...next }));
        }
        setFormError(error.message);
        return;
      }
      setFormError('Something went wrong. Please try again.');
    },
  });

  const submit = () => {
    const next: FieldErrors = {
      name: validateName(name),
      mobile: validateMobile(mobile),
      address: validateAddress(address),
      businessName: validateBusinessName(businessName),
    };
    setErrors(next);
    setFormError(null);
    if (next.name || next.mobile || next.address || next.businessName) return;

    const normalizedMobile = normalizeIndianMobile(mobile);
    if (!normalizedMobile) return; // validateMobile already flagged this

    saveMutation.mutate({
      name: name.trim(),
      mobileNumber: normalizedMobile,
      address: address.trim(),
      businessName: businessName.trim() ? businessName.trim() : null,
    });
  };

  return (
    <Screen
      footer={
        <Button
          title={isFirstLogin ? 'Save and continue' : 'Save changes'}
          onPress={submit}
          loading={saveMutation.isPending}
        />
      }
    >
      {isFirstLogin ? (
        <>
          <StepIndicator step={1} total={2} label="Step 1 of 2 — Your home" />
          <Title>Tell us about your home.</Title>
          <Subtitle>
            Your Lifestyle Manager uses these details for every booking, delivery and vendor visit.
          </Subtitle>
        </>
      ) : (
        <PageHeader
          title="Your profile"
          subtitle="Keep these details current so vendors always reach the right door."
          onBack={handleBack}
        />
      )}

      <View className={isFirstLogin ? 'mt-8' : ''}>
        {formError ? <Notice variant="error">{formError}</Notice> : null}

        <TextField
          label="Full name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setErrors((prev) => ({ ...prev, name: null }));
          }}
          onBlur={() => setErrors((prev) => ({ ...prev, name: name ? validateName(name) : null }))}
          error={errors.name}
          placeholder="Rohini Kumar"
          autoComplete="name"
        />
        <TextField
          label="Mobile number"
          value={mobile}
          onChangeText={(text) => {
            setMobile(text);
            setErrors((prev) => ({ ...prev, mobile: null }));
          }}
          onBlur={() =>
            setErrors((prev) => ({ ...prev, mobile: mobile ? validateMobile(mobile) : null }))
          }
          error={errors.mobile}
          hint="10-digit Indian mobile — we save it as +91 XXXXX XXXXX."
          placeholder="98765 43210"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <TextField
          label="Address"
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            setErrors((prev) => ({ ...prev, address: null }));
          }}
          onBlur={() =>
            setErrors((prev) => ({ ...prev, address: address ? validateAddress(address) : null }))
          }
          error={errors.address}
          placeholder="Flat, street, locality, city, PIN"
          multiline
          autoComplete="street-address"
        />
        <TextField
          label="Business name (optional)"
          value={businessName}
          onChangeText={(text) => {
            setBusinessName(text);
            setErrors((prev) => ({ ...prev, businessName: null }));
          }}
          error={errors.businessName}
          hint="Only if you run one — most households leave this blank."
          placeholder="Kumar Textiles"
        />
      </View>
    </Screen>
  );
}
