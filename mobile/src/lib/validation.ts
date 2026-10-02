const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

// Contract: min 8 chars, at least one letter and one digit.
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Please re-enter your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (trimmed.length > 100) return 'Keep it under 100 characters.';
  return null;
}

export function validateAddress(address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return 'Address is required.';
  if (trimmed.length > 500) return 'Keep it under 500 characters.';
  return null;
}

export function validateBusinessName(businessName: string): string | null {
  if (businessName.trim().length > 100) return 'Keep it under 100 characters.';
  return null;
}

/**
 * Normalises Indian mobile input (`9876543210`, `919876543210`, `+919876543210`)
 * to `+91XXXXXXXXXX`. Returns null when the input cannot be a valid Indian mobile.
 */
export function normalizeIndianMobile(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = `+${digits.slice(1).replace(/\+/g, '')}`;
  }
  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

export function validateMobile(raw: string): string | null {
  if (!raw.trim()) return 'Mobile number is required.';
  if (normalizeIndianMobile(raw) === null) {
    return 'Enter a valid 10-digit Indian mobile number.';
  }
  return null;
}

export function validateOtpCode(code: string): string | null {
  if (!/^\d{6}$/.test(code)) return 'Enter the 6-digit code.';
  return null;
}
